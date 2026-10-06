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
