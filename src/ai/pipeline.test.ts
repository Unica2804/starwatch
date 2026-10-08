import { describe, expect, it } from 'vitest'
import { crossValidate } from './crossValidate'
import { detectStars } from './detect'
import { groupMatches } from './identify'
import { matchDetections } from './match'
import { project } from '../ui/project'
import type { StarPosition } from '../sky/engine'
import type { FrameView } from './match'

/**
 * End-to-end hallucination harness. No sky needed: a synthetic frame with
 * KNOWN ground truth goes through the exact production path —
 * detect → match → group → crossValidate — including a lying VLM.
 */

const VIEW: FrameView = { width: 400, height: 300, centerAz: 180, centerAlt: 45, hFov: 60, vFov: 40 }

function scorpii(): StarPosition[] {
  return [
    { id: 'antares', name: 'Antares', ra: 0, dec: 0, mag: 0.96, constellation: 'Scorpius', alt: 45, az: 180 },
    { id: 'sargas', name: 'Sargas', ra: 0, dec: 0, mag: 1.86, constellation: 'Scorpius', alt: 46, az: 184 },
    { id: 'shaula', name: 'Shaula', ra: 0, dec: 0, mag: 1.62, constellation: 'Scorpius', alt: 43, az: 176 }
  ]
}

/** Paint catalog stars as 3x3 bright blobs at their projected pixels + decoys. */
function renderFrame(
  stars: readonly StarPosition[],
  decoys: readonly { x: number; y: number }[] = []
): Uint8ClampedArray {
  const { width, height } = VIEW
  const d = new Uint8ClampedArray(width * height * 4).fill(12)
  for (let i = 3; i < d.length; i += 4) d[i] = 255
  const blob = (px: number, py: number, v: number) => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = Math.round(px) + dx
        const y = Math.round(py) + dy
        if (x < 0 || y < 0 || x >= width || y >= height) continue
        const i = (y * width + x) * 4
        d[i] = v
        d[i + 1] = v
        d[i + 2] = v
      }
    }
  }
  for (const s of stars) {
    const p = project(s.alt, s.az, VIEW)
    if (p.visible) blob(p.x, p.y, 255)
  }
  for (const dec of decoys) blob(dec.x * width, dec.y * height, 240)
  return d
}

describe('pipeline: synthetic Scorpius frame', () => {
  it('names Scorpius from pixels alone and rejects a high-confidence lie', () => {
    const stars = scorpii()
    // Decoy: bright plane light far from any catalog star.
    const pixels = renderFrame(stars, [{ x: 0.06, y: 0.08 }])

    const detected = detectStars(pixels, VIEW.width, VIEW.height)
    expect(detected.length).toBeGreaterThanOrEqual(3)

    const m = matchDetections(detected, stars, VIEW)
    expect(m.matches.map((x) => x.star.id).sort()).toEqual(['antares', 'sargas', 'shaula'])
    expect(m.unknown.length).toBe(1) // the decoy — never matched

    const groups = groupMatches(m.matches)
    expect(groups[0]!.constellation).toBe('Scorpius')

    // The lying VLM: claims Ursa Major at 0.99 confidence. Must die.
    const verdict = crossValidate(
      groups.map((g) => ({ constellation: g.constellation, stars: g.names })),
      [
        { label: 'Scorpius', confidence: 0.9 },
        { label: 'Ursa Major', confidence: 0.99 }
      ]
    )
    expect(verdict.verified.map((v) => v.label)).toEqual(['Scorpius'])
    expect(verdict.rejected.map((v) => v.label)).toEqual(['Ursa Major'])
  })

  it('stays silent on an empty frame (cloud, cap, daylight)', () => {
    const stars = scorpii()
    const pixels = renderFrame([], [])
    const detected = detectStars(pixels, VIEW.width, VIEW.height)
    expect(detected).toEqual([])
    const m = matchDetections(detected, stars, VIEW)
    expect(m.matches).toEqual([])
    expect(m.hidden.length).toBe(3) // geometrically there, visibly absent
    const verdict = crossValidate([], [])
    expect(verdict.verified).toEqual([])
  })
})
