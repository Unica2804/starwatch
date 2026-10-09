import { describe, expect, it } from 'vitest'
import { constellationCentroid } from './mapRender'
import type { StarPosition } from '../sky/engine'

function star(id: string, alt: number, az: number): StarPosition {
  return { id, name: id, ra: 0, dec: 0, mag: 1, constellation: 'T', alt, az }
}

describe('constellationCentroid', () => {
  it('averages endpoints arithmetically in altitude', () => {
    const c = constellationCentroid([star('a', 40, 180), star('b', 50, 180)], ['a', 'b'])
    expect(c!.alt).toBeCloseTo(45, 6)
    expect(c!.az).toBeCloseTo(180, 6)
  })

  it('wraps azimuth: 359° + 1° anchors at 0°, not 180°', () => {
    const c = constellationCentroid([star('a', 45, 359), star('b', 45, 1)], ['a', 'b'])
    expect(c!.az).toBeCloseTo(0, 6)
  })

  it('skips unknown ids and returns null when nothing resolves', () => {
    expect(constellationCentroid([star('a', 45, 180)], ['a', 'ghost'])!.az).toBeCloseTo(180, 6)
    expect(constellationCentroid([star('a', 45, 180)], ['ghost'])).toBe(null)
    expect(constellationCentroid([], [])).toBe(null)
  })
})
