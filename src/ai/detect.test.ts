import { describe, expect, it } from 'vitest'
import { detectStars } from './detect'

function frame(w: number, h: number, paint: (set: (x: number, y: number, v: number) => void) => void): Uint8ClampedArray {
  const d = new Uint8ClampedArray(w * h * 4).fill(8)
  for (let i = 3; i < d.length; i += 4) d[i] = 255
  paint((x, y, v) => {
    const i = (y * w + x) * 4
    d[i] = v
    d[i + 1] = v
    d[i + 2] = v
  })
  return d
}

describe('detectStars', () => {
  it('finds isolated bright points at the right normalized coords', () => {
    const d = frame(100, 100, (set) => {
      set(25, 40, 255)
      set(70, 10, 230)
    })
    const pts = detectStars(d, 100, 100)
    expect(pts.length).toBe(2)
    const near = (x: number, y: number) =>
      pts.some((p) => Math.abs(p.x - x) < 0.02 && Math.abs(p.y - y) < 0.02)
    expect(near(0.25, 0.4)).toBe(true)
    expect(near(0.7, 0.1)).toBe(true)
  })

  it('merges a tight cluster into one point (bloom, not three stars)', () => {
    const d = frame(60, 60, (set) => {
      set(30, 30, 255)
      set(31, 30, 240)
      set(30, 31, 240)
    })
    expect(detectStars(d, 60, 60).length).toBe(1)
  })

  it('returns nothing for a covered lens or flat haze', () => {
    const black = new Uint8ClampedArray(40 * 40 * 4).fill(0)
    for (let i = 3; i < black.length; i += 4) black[i] = 255
    expect(detectStars(black, 40, 40)).toEqual([])
  })

  it('rejects garbage input instead of crashing', () => {
    expect(detectStars(new Uint8ClampedArray(10), 100, 100)).toEqual([])
    expect(detectStars(new Uint8ClampedArray(0), 0, 0)).toEqual([])
  })

  it('runs a 320px frame inside a 100ms one-shot budget', () => {
    const w = 320
    const h = 240
    const d = new Uint8ClampedArray(w * h * 4)
    let seed = 42
    for (let i = 0; i < d.length; i += 4) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      const v = 10 + (seed % 30)
      d[i] = v
      d[i + 1] = v
      d[i + 2] = v
      d[i + 3] = 255
    }
    // sprinkle 20 real stars
    for (let s = 0; s < 20; s++) {
      const x = (s * 37) % w
      const y = (s * 53) % h
      const i = (y * w + x) * 4
      d[i] = 255
      d[i + 1] = 255
      d[i + 2] = 255
    }
    const t0 = performance.now()
    const pts = detectStars(d, w, h)
    expect(performance.now() - t0).toBeLessThan(100)
    expect(pts.length).toBeGreaterThanOrEqual(15)
    expect(pts.length).toBeLessThanOrEqual(200)
  })
})
