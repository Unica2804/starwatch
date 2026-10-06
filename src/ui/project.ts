/** Alt/Az → canvas x/y. Pure math so tests assert pixels, not vibes. */

export interface View {
  width: number
  height: number
  centerAz: number // phone heading
  centerAlt: number // phone pitch
  hFov: number
  vFov: number
}

export interface Pt {
  x: number
  y: number
  visible: boolean
}

/** Rectilinear projection. Handles az wrap; off-screen → visible:false. */
export function project(alt: number, az: number, v: View): Pt {
  let dAz = ((az - v.centerAz + 540) % 360) - 180
  if (!Number.isFinite(dAz)) dAz = 0
  const dAlt = alt - v.centerAlt
  const x = v.width / 2 + (dAz / v.hFov) * v.width
  const y = v.height / 2 - (dAlt / v.vFov) * v.height
  const visible =
    Math.abs(dAz) <= v.hFov / 2 &&
    Math.abs(dAlt) <= v.vFov / 2 &&
    alt >= 0
  return { x, y, visible }
}

/** Star radius from magnitude: Sirius big, mag-3 small. DPR-scaled by caller. */
export function radiusFromMag(mag: number): number {
  return Math.max(0.6, 3.2 - mag * 0.55)
}
