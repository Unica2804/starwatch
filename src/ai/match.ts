import { project } from '../ui/project'
import type { StarPosition } from '../sky/engine'
import type { StarPoint } from './detect'

export interface FrameView {
  width: number
  height: number
  centerAz: number
  centerAlt: number
  hFov: number
  vFov: number
}

export interface StarMatch {
  star: StarPosition
  /** detection pixel coords */
  x: number
  y: number
  /** pixels between projected and detected position */
  errorPx: number
}

export interface MatchResult {
  matches: StarMatch[]
  /** catalog stars in frame with no visible counterpart (haze, buildings) */
  hidden: StarPosition[]
  /** detections matching nothing catalogued (planets, planes, noise) */
  unknown: { x: number; y: number }[]
}

/**
 * Pair each visible detection with its nearest projected catalog star.
 * Greedy brightest-first, one detection per star. Tolerance in pixels
 * absorbs compass error + lens distortion without cross-wiring neighbors.
 */
export function matchDetections(
  detected: readonly StarPoint[],
  positioned: readonly StarPosition[],
  view: FrameView,
  tolerancePx = 24
): MatchResult {
  const projected = positioned
    .map((star) => ({ star, p: project(star.alt, star.az, view) }))
    .filter((e) => e.p.visible)
    .sort((a, b) => a.star.mag - b.star.mag)

  const tolSq = tolerancePx * tolerancePx
  const matchedIds = new Set<string>()
  const matches: StarMatch[] = []
  const unknown: { x: number; y: number }[] = []
  const ordered = [...detected].sort((a, b) => b.brightness - a.brightness)

  for (const d of ordered) {
    const x = d.x * view.width
    const y = d.y * view.height
    let best: { star: StarPosition; err: number } | null = null
    for (const { star, p } of projected) {
      if (matchedIds.has(star.id)) continue
      const dx = p.x - x
      const dy = p.y - y
      const err = dx * dx + dy * dy
      if (err <= tolSq && (!best || err < best.err)) best = { star, err }
    }
    if (best) {
      matchedIds.add(best.star.id)
      matches.push({ star: best.star, x, y, errorPx: Math.sqrt(best.err) })
    } else {
      unknown.push({ x, y })
    }
  }

  const hidden = projected.map((e) => e.star).filter((s) => !matchedIds.has(s.id))
  return { matches, hidden, unknown }
}
