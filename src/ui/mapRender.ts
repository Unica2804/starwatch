import type { StarPosition } from '../sky/engine'
import { project, radiusFromMag, type View } from './project'

export interface SkyLines {
  constellation: string
  pairs: readonly (readonly string[])[]
}

/**
 * Label anchor for a constellation: circular mean of its line endpoints
 * (azimuth wraps, so 359° + 1° anchors at 0°, not 180°).
 */
export function constellationCentroid(
  stars: readonly StarPosition[],
  ids: readonly string[]
): { alt: number; az: number } | null {
  const pts = ids
    .map((id) => stars.find((s) => s.id === id))
    .filter((s): s is StarPosition => s !== undefined)
  if (pts.length === 0) return null
  const alt = pts.reduce((a, s) => a + s.alt, 0) / pts.length
  let sx = 0
  let sy = 0
  for (const s of pts) {
    const r = (s.az * Math.PI) / 180
    sx += Math.sin(r)
    sy += Math.cos(r)
  }
  const az = ((Math.atan2(sx, sy) * 180) / Math.PI + 360) % 360
  return { alt, az }
}

export interface MapStyle {
  bg: string
  ground: string
  line: string
  star: string
  label: string
}

export const NIGHT: MapStyle = {
  bg: '#0a0000',
  ground: '#050000',
  line: 'rgba(255,42,26,0.45)',
  star: '#ffd9d4',
  label: 'rgba(255,217,212,0.85)'
}

const CARDINALS: { az: number; label: string }[] = [
  { az: 0, label: 'N' },
  { az: 90, label: 'E' },
  { az: 180, label: 'S' },
  { az: 270, label: 'W' }
]

/**
 * Full sky-map frame: ground shading, horizon, constellation lines,
 * stars, bright-star names, constellation labels, cardinals, reticle.
 * Pure draw — the component owns only the canvas lifecycle.
 */
export function drawSkyMap(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  dpr: number,
  stars: readonly StarPosition[],
  lines: readonly SkyLines[],
  view: View,
  style: MapStyle = NIGHT,
  labelMagLimit = 2.0
): void {
  ctx.fillStyle = style.bg
  ctx.fillRect(0, 0, w, h)

  // Ground: everything below the horizon curve, darker.
  ctx.fillStyle = style.ground
  ctx.beginPath()
  ctx.moveTo(0, h)
  for (let x = 0; x <= w; x += 8) {
    const az = view.centerAz + ((x / w - 0.5) * view.hFov + 540) % 360 - 180
    const p = project(0, (az + 360) % 360, view)
    ctx.lineTo(x, Math.min(h, Math.max(0, p.y)))
  }
  ctx.lineTo(w, h)
  ctx.closePath()
  ctx.fill()

  const byId = new Map(stars.map((s) => [s.id, s]))

  // Constellation lines (visible segments only).
  ctx.strokeStyle = style.line
  ctx.lineWidth = 1 * dpr
  for (const g of lines) {
    for (const pair of g.pairs) {
      const a = byId.get(pair[0] as string)
      const b = byId.get(pair[1] as string)
      if (!a || !b) continue
      const pa = project(a.alt, a.az, view)
      const pb = project(b.alt, b.az, view)
      if (!pa.visible || !pb.visible) continue
      ctx.beginPath()
      ctx.moveTo(pa.x, pa.y)
      ctx.lineTo(pb.x, pb.y)
      ctx.stroke()
    }
  }

  // Stars.
  for (const s of stars) {
    const p = project(s.alt, s.az, view)
    if (!p.visible) continue
    ctx.fillStyle = style.star
    ctx.beginPath()
    ctx.arc(p.x, p.y, radiusFromMag(s.mag) * dpr, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.textBaseline = 'middle'
  // Bright-star names.
  ctx.fillStyle = style.label
  ctx.font = `${11 * dpr}px system-ui, sans-serif`
  for (const s of stars) {
    if (s.mag > labelMagLimit) continue
    const p = project(s.alt, s.az, view)
    if (!p.visible) continue
    ctx.fillText(s.name, p.x + 6 * dpr, p.y - 6 * dpr)
  }

  // Constellation labels at line-endpoint centroids.
  ctx.font = `bold ${12 * dpr}px system-ui, sans-serif`
  for (const g of lines) {
    const ids = [...new Set(g.pairs.flat())]
    const c = constellationCentroid(stars, ids)
    if (!c) continue
    const p = project(c.alt, c.az, view)
    if (!p.visible) continue
    ctx.fillText(g.constellation, p.x + 8 * dpr, p.y + 8 * dpr)
  }

  // Cardinals on the horizon.
  ctx.font = `bold ${13 * dpr}px system-ui, sans-serif`
  for (const c of CARDINALS) {
    const p = project(2, c.az, view)
    if (!p.visible) continue
    ctx.fillText(c.label, p.x - 4 * dpr, p.y)
  }

  // Center reticle: what the phone points at.
  ctx.strokeStyle = style.line
  ctx.lineWidth = 1.5 * dpr
  ctx.beginPath()
  ctx.arc(w / 2, h / 2, 14 * dpr, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(w / 2 - 22 * dpr, h / 2)
  ctx.lineTo(w / 2 - 8 * dpr, h / 2)
  ctx.moveTo(w / 2 + 8 * dpr, h / 2)
  ctx.lineTo(w / 2 + 22 * dpr, h / 2)
  ctx.moveTo(w / 2, h / 2 - 22 * dpr)
  ctx.lineTo(w / 2, h / 2 - 8 * dpr)
  ctx.moveTo(w / 2, h / 2 + 8 * dpr)
  ctx.lineTo(w / 2, h / 2 + 22 * dpr)
  ctx.stroke()
}
