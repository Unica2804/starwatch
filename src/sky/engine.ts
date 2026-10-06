import { Horizon, Observer } from 'astronomy-engine'

export interface Star {
  id: string
  name: string
  /** Right ascension, hours [0,24) J2000 */
  ra: number
  /** Declination, degrees [-90,90] J2000 */
  dec: number
  /** Visual magnitude (lower = brighter) */
  mag: number
  constellation?: string
}

export interface ObserverLocation {
  /** degrees [-90,90] */
  latitude: number
  /** degrees [-180,180] */
  longitude: number
  elevation?: number
}

export interface AltAz {
  /** degrees above horizon, [-90,90] */
  alt: number
  /** degrees clockwise from true north [0,360) */
  az: number
}

export type StarPosition = Star & AltAz

function assertObserver(o: ObserverLocation): void {
  if (!Number.isFinite(o.latitude) || o.latitude < -90 || o.latitude > 90) {
    throw new RangeError(`latitude out of range: ${o.latitude}`)
  }
  if (!Number.isFinite(o.longitude) || o.longitude < -180 || o.longitude > 180) {
    throw new RangeError(`longitude out of range: ${o.longitude}`)
  }
}

function toObserver(o: ObserverLocation): Observer {
  return new Observer(o.latitude, o.longitude, o.elevation ?? 0)
}

/** RA/Dec → Alt/Az for one star. Pure, offline, no network. */
export function starAltAz(
  star: Star,
  observer: ObserverLocation,
  date: Date
): AltAz {
  assertObserver(observer)
  if (!Number.isFinite(star.ra) || !Number.isFinite(star.dec)) {
    throw new RangeError(`bad coordinates for ${star.id}`)
  }
  const h = Horizon(date, toObserver(observer), star.ra, star.dec, 'normal')
  return { alt: h.altitude, az: ((h.azimuth % 360) + 360) % 360 }
}

/** All stars above minAlt, sorted brightest-first. */
export function visibleStars(
  stars: readonly Star[],
  observer: ObserverLocation,
  date: Date,
  minAlt = 0
): StarPosition[] {
  assertObserver(observer)
  const out: StarPosition[] = []
  for (const s of stars) {
    const p = starAltAz(s, observer, date)
    if (p.alt >= minAlt) out.push({ ...s, alt: p.alt, az: p.az })
  }
  out.sort((a, b) => a.mag - b.mag)
  return out
}

/** Smallest circular distance between two headings, degrees [0,180]. */
export function headingDiff(a: number, b: number): number {
  const d = Math.abs(((a - b) % 360 + 540) % 360) - 180
  return Math.abs(d)
}

/** Great-circle separation between two alt/az points, degrees. */
export function angularSeparation(
  alt1: number,
  az1: number,
  alt2: number,
  az2: number
): number {
  const r = Math.PI / 180
  const s1 = Math.sin(alt1 * r)
  const s2 = Math.sin(alt2 * r)
  const c =
    s1 * s2 +
    Math.cos(alt1 * r) * Math.cos(alt2 * r) * Math.cos((az1 - az2) * r)
  return (Math.acos(Math.min(1, Math.max(-1, c))) * 180) / Math.PI
}

export interface Fov {
  /** phone compass heading, deg from true north */
  headingDeg: number
  /** phone pitch (altitude center), deg */
  pitchDeg: number
  /** full horizontal FOV, deg */
  hFov: number
  /** full vertical FOV, deg */
  vFov: number
}

/** Stars inside the phone's view rectangle. Handles 0/360 wrap. */
export function starsInFov(
  positioned: readonly StarPosition[],
  fov: Fov
): StarPosition[] {
  const hHalf = fov.hFov / 2
  const vHalf = fov.vFov / 2
  return positioned.filter(
    (s) =>
      headingDiff(s.az, fov.headingDeg) <= hHalf &&
      Math.abs(s.alt - fov.pitchDeg) <= vHalf
  )
}
