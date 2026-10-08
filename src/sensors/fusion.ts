/**
 * Sensor fusion math — pure, testable, no browser APIs.
 * Phone hardware path: magnetometer + gyro + GPS → true-north Alt-Az.
 */

/** Valid Earth field range per ARCHITECTURE (µT). Outside = interference. */
export const FIELD_MIN_UT = 25
export const FIELD_MAX_UT = 65

/** |B| from magnetometer vector, µT. */
export function fieldMagnitude(x: number, y: number, z: number): number {
  return Math.sqrt(x * x + y * y + z * z)
}

export type FieldStatus = 'ok' | 'weak' | 'interference'

export function fieldStatus(magUt: number): FieldStatus {
  if (!Number.isFinite(magUt)) return 'weak'
  if (magUt < FIELD_MIN_UT) return 'weak'
  if (magUt > FIELD_MAX_UT) return 'interference'
  return 'ok'
}

/**
 * Coarse magnetic declination estimate (deg, +east).
 * Dipole approximation: good to ~±5°. Field-calibrate on device later.
 * Never used for judging-grade astro — true-north prompt + figure-8
 * recal covers the residual.
 */
export function estimateDeclination(lat: number, lon: number): number {
  const r = Math.PI / 180
  // Tilted-dipole stand-in: peaks over N. America / E. Asia.
  const dec =
    11.5 * Math.sin(lon * r) * Math.cos(lat * r) -
    4 * Math.sin(2 * lat * r)
  return Math.max(-25, Math.min(25, dec))
}

/** Magnetic heading + east declination → true-north heading [0,360). */
export function trueHeading(magneticHeading: number, declinationEast: number): number {
  return (((magneticHeading + declinationEast) % 360) + 360) % 360
}

/** Scalar low-pass: smooths jittery compass/GPS without lag spikes. */
export function lowPass(prev: number, next: number, alpha: number): number {
  const a = Math.min(1, Math.max(0, alpha))
  return prev + a * (next - prev)
}

/**
 * Angle-aware low-pass for headings. Handles 359°→1° wrap:
 * smooths along the short arc, never swings through 180°.
 */
export function lowPassAngle(prevDeg: number, nextDeg: number, alpha: number): number {
  const a = Math.min(1, Math.max(0, alpha))
  let d = ((nextDeg - prevDeg + 540) % 360) - 180
  if (!Number.isFinite(d)) return prevDeg
  return (((prevDeg + a * d) % 360) + 360) % 360
}

/** Should we show the figure-8 recalibration prompt? */
export function needsRecalibration(
  status: FieldStatus,
  accuracyDeg: number | null
): boolean {
  if (status !== 'ok') return true
  if (accuracyDeg !== null && accuracyDeg > 15) return true
  return false
}

export function isValidGps(lat: number, lon: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180 &&
    !(lat === 0 && lon === 0) // unfixed receiver null-island
  )
}

/**
 * Rear-camera altitude from DeviceOrientation beta (front-back tilt, deg).
 * Phone upright (beta 90) → camera on the horizon (alt 0).
 * Tilted back (beta 135) → camera 45° up. Clamped to [0,90].
 */
export function pitchFromBeta(beta: number | null): number | null {
  if (beta === null || !Number.isFinite(beta)) return null
  return Math.min(90, Math.max(0, beta - 90))
}

export interface OrientationSample {
  alpha: number | null
  beta: number | null
  /** true = Earth-referenced (deviceorientationabsolute / iOS); false/undefined = relative drift */
  absolute?: boolean
  webkitCompassHeading?: number | null
}

export interface OrientationReading {
  /** compass-grade magnetic heading, or null when only relative data exists */
  magnetic: number | null
  /** camera altitude from gyro tilt — valid from relative events too */
  pitch: number | null
  absolute: boolean
}

/**
 * Split one orientation event into compass vs. gyro parts.
 * Since Chrome 50 the plain `deviceorientation` alpha is RELATIVE
 * (arbitrary zero, gyro+accel) — using it as a compass silently corrupts
 * the heading whenever both event types fire. Only absolute alpha counts.
 */
export function orientationReading(
  s: OrientationSample,
  declinationEast: number
): OrientationReading {
  let magnetic: number | null = null
  let absolute = false
  if (typeof s.webkitCompassHeading === 'number') {
    magnetic = (((s.webkitCompassHeading - declinationEast) % 360) + 360) % 360
    absolute = true
  } else if (s.absolute === true && typeof s.alpha === 'number') {
    magnetic = ((360 - s.alpha) % 360 + 360) % 360
    absolute = true
  }
  return { magnetic, pitch: pitchFromBeta(s.beta), absolute }
}
