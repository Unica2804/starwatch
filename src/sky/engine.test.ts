import { describe, expect, it } from 'vitest'
import catalog from './catalog.json'
import {
  angularSeparation,
  headingDiff,
  starAltAz,
  starsInFov,
  visibleStars,
  type Star
} from './engine'

const stars = catalog.stars as Star[]
// Fixed winter night: Jan 15 2026 22:00 UTC, 19°N (India)
const DATE = new Date('2026-01-15T22:00:00Z')
const INDIA = { latitude: 19.07, longitude: 72.87 }

describe('catalog', () => {
  it('loads locally with stars + valid constellation lines', () => {
    expect(stars.length).toBeGreaterThanOrEqual(30)
    const ids = new Set(stars.map((s) => s.id))
    for (const line of catalog.lines) {
      for (const pair of line.pairs) {
        const a: string = pair[0] as string
        const b: string = pair[1] as string
        expect(ids.has(a)).toBe(true)
        expect(ids.has(b)).toBe(true)
      }
    }
    for (const s of stars) {
      expect(s.ra).toBeGreaterThanOrEqual(0)
      expect(s.ra).toBeLessThan(24)
      expect(s.dec).toBeGreaterThanOrEqual(-90)
      expect(s.dec).toBeLessThanOrEqual(90)
    }
  })
})

describe('starAltAz', () => {
  it('puts Polaris near the observer latitude altitude', () => {
    const polaris = stars.find((s) => s.id === 'polaris')!
    const p = starAltAz(polaris, { latitude: 40, longitude: 0 }, DATE)
    expect(p.alt).toBeGreaterThan(38)
    expect(p.alt).toBeLessThan(42)
  })

  it('agrees on the date line: +180 and -180 give identical results', () => {
    const sirius = stars.find((s) => s.id === 'sirius')!
    const a = starAltAz(sirius, { latitude: 0, longitude: 180 }, DATE)
    const b = starAltAz(sirius, { latitude: 0, longitude: -180 }, DATE)
    expect(Math.abs(a.alt - b.alt)).toBeLessThan(1e-9)
    expect(Math.abs(a.az - b.az)).toBeLessThan(1e-9)
  })

  it('works at the poles without NaN', () => {
    const vega = stars.find((s) => s.id === 'vega')!
    const p = starAltAz(vega, { latitude: 90, longitude: 0 }, DATE)
    expect(Number.isFinite(p.alt)).toBe(true)
    expect(Number.isFinite(p.az)).toBe(true)
  })

  it('rejects out-of-range observers', () => {
    const vega = stars.find((s) => s.id === 'vega')!
    expect(() => starAltAz(vega, { latitude: 91, longitude: 0 }, DATE)).toThrow(
      RangeError
    )
    expect(() => starAltAz(vega, { latitude: 0, longitude: 181 }, DATE)).toThrow(
      RangeError
    )
  })
})

describe('visibleStars', () => {
  it('returns only above-horizon stars, brightest first', () => {
    const vis = visibleStars(stars, INDIA, DATE)
    expect(vis.length).toBeGreaterThan(0)
    for (const s of vis) expect(s.alt).toBeGreaterThanOrEqual(0)
    for (let i = 1; i < vis.length; i++) {
      expect(vis[i]!.mag).toBeGreaterThanOrEqual(vis[i - 1]!.mag)
    }
  })

  it('handles sensor-noise case: same sky 1 minute apart barely moves', () => {
    const a = visibleStars(stars, INDIA, DATE)
    const b = visibleStars(
      stars,
      INDIA,
      new Date(DATE.getTime() + 60_000)
    )
    expect(a.map((s) => s.id).join(',')).toBe(b.map((s) => s.id).join(','))
  })

  it('processes a 2000-star catalog fast enough for compass-rate redraws', () => {
    const big: Star[] = Array.from({ length: 2000 }, (_, i) => ({
      id: `s${i}`,
      name: `S${i}`,
      ra: (i % 240) / 10,
      dec: (i % 180) - 90,
      mag: (i % 60) / 10
    }))
    const t0 = performance.now()
    const vis = visibleStars(big, INDIA, DATE)
    const dt = performance.now() - t0
    expect(vis.length).toBeGreaterThan(0)
    // 60fps budget is 16ms; allow 200ms headroom on slow CI phones.
    expect(dt).toBeLessThan(200)
  })
})

describe('FOV + angles', () => {
  it('wraps heading across 0/360 (359° sees a 1° star)', () => {
    expect(headingDiff(359, 1)).toBeCloseTo(2, 6)
    const fake = [
      { id: 'x', name: 'X', ra: 0, dec: 0, mag: 1, alt: 45, az: 1 }
    ]
    const hit = starsInFov(fake, {
      headingDeg: 359,
      pitchDeg: 45,
      hFov: 60,
      vFov: 40
    })
    expect(hit.length).toBe(1)
  })

  it('excludes stars outside the view rectangle', () => {
    const fake = [
      { id: 'x', name: 'X', ra: 0, dec: 0, mag: 1, alt: 45, az: 180 }
    ]
    const hit = starsInFov(fake, {
      headingDeg: 0,
      pitchDeg: 45,
      hFov: 60,
      vFov: 40
    })
    expect(hit.length).toBe(0)
  })

  it('measures identical points as 0° apart', () => {
    expect(angularSeparation(45, 100, 45, 100)).toBeCloseTo(0, 6)
  })
})
