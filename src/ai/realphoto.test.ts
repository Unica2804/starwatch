import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { detectStars } from './detect'

/**
 * Real-photon regression: run OUR detector over a real night-sky photo.
 * Gated by env (fixture lives outside git, test data not shipped):
 *   STAR_PHOTO_RAW=/tmp/opencode/orion.raw STAR_PHOTO_META=/tmp/opencode/orion.json npm run test
 * Field photos from the user's own phone drop into the same slot tonight.
 */
const run = process.env.STAR_PHOTO_RAW !== undefined && process.env.STAR_PHOTO_META !== undefined

describe.runIf(run)('real photo', () => {
  it('finds a sane number of star points in real photons', () => {
    const meta = JSON.parse(
      readFileSync(process.env.STAR_PHOTO_META as string, 'utf8')
    ) as { width: number; height: number }
    const raw = new Uint8ClampedArray(
      new Uint8Array(readFileSync(process.env.STAR_PHOTO_RAW as string)).buffer as ArrayBuffer
    )
    expect(raw.length).toBe(meta.width * meta.height * 4)

    const t0 = performance.now()
    const pts = detectStars(raw, meta.width, meta.height)
    const dt = performance.now() - t0
    const cells = new Set(pts.map((p) => `${Math.floor(p.x * 8)},${Math.floor(p.y * 8)}`))
    console.log(`real photo: ${pts.length} points in ${dt.toFixed(1)}ms across ${cells.size}/64 cells`)
    expect(dt).toBeLessThan(200)
    // A real star field: finds stars, output stays bounded, and points
    // spread across the frame (a gradient flood would clump in few cells).
    expect(pts.length).toBeGreaterThan(0)
    expect(pts.length).toBeLessThanOrEqual(200)
    expect(cells.size).toBeGreaterThanOrEqual(16)
    for (const p of pts) {
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThanOrEqual(1)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeLessThanOrEqual(1)
      expect(p.brightness).toBeGreaterThan(0)
    }
  })
})
