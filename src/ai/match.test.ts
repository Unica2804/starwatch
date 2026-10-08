import { describe, expect, it } from 'vitest'
import { project } from '../ui/project'
import type { StarPosition } from '../sky/engine'
import { matchDetections, type FrameView } from './match'

const VIEW: FrameView = { width: 400, height: 300, centerAz: 180, centerAlt: 45, hFov: 60, vFov: 40 }

function star(id: string, alt: number, az: number, mag = 1): StarPosition {
  return { id, name: id, ra: 0, dec: 0, mag, constellation: 'Test', alt, az }
}

describe('matchDetections', () => {
  it('pairs perfectly aligned detections with their catalog stars', () => {
    const stars = [star('a', 45, 180), star('b', 50, 190)]
    const detected = stars.map((s) => {
      const p = project(s.alt, s.az, VIEW)
      return { x: p.x / VIEW.width, y: p.y / VIEW.height, brightness: 0.9 }
    })
    const r = matchDetections(detected, stars, VIEW)
    expect(r.matches.length).toBe(2)
    expect(r.hidden.length).toBe(0)
    expect(r.unknown.length).toBe(0)
  })

  it('tolerates a few pixels of compass error without cross-wiring', () => {
    const stars = [star('a', 45, 170), star('b', 45, 190)]
    const detected = stars.map((s) => {
      const p = project(s.alt, s.az, VIEW)
      return { x: (p.x + 6) / VIEW.width, y: p.y / VIEW.height, brightness: 0.9 }
    })
    const r = matchDetections(detected, stars, VIEW)
    expect(r.matches.length).toBe(2)
    expect(new Set(r.matches.map((m) => m.star.id)).size).toBe(2)
  })

  it('splits haze-hidden stars from unknown lights (planet, plane, noise)', () => {
    const stars = [star('a', 45, 180), star('far', 45, 0)]
    const p = project(45, 180, VIEW)
    const detected = [
      { x: p.x / VIEW.width, y: p.y / VIEW.height, brightness: 0.9 },
      { x: 0.05, y: 0.05, brightness: 0.8 } // matches nothing in frame
    ]
    const r = matchDetections(detected, stars, VIEW)
    expect(r.matches.map((m) => m.star.id)).toEqual(['a'])
    expect(r.unknown.length).toBe(1)
    // 'far' is out of frame entirely, so neither matched nor hidden
    expect(r.hidden.length).toBe(0)
  })

  it('marks in-frame catalog stars with no detection as hidden', () => {
    const stars = [star('a', 45, 180), star('b', 46, 182)]
    const p = project(45, 180, VIEW)
    const r = matchDetections(
      [{ x: p.x / VIEW.width, y: p.y / VIEW.height, brightness: 0.9 }],
      stars,
      VIEW
    )
    expect(r.matches.length).toBe(1)
    expect(r.hidden.map((s) => s.id)).toEqual(['b'])
  })

  it('handles empty inputs without crashing', () => {
    const r = matchDetections([], [star('a', 45, 180)], VIEW)
    expect(r.matches).toEqual([])
    expect(r.hidden.map((s) => s.id)).toEqual(['a'])
  })
})
