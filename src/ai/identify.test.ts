import { describe, expect, it } from 'vitest'
import { matchConstellations } from './identify'
import type { StarPosition } from '../sky/engine'

function star(id: string, constellation: string | undefined, mag: number, alt: number, az: number): StarPosition {
  return { id, name: id, ra: 0, dec: 0, mag, constellation, alt, az }
}

const FOV = { headingDeg: 180, pitchDeg: 45, hFov: 60, vFov: 40 }

describe('matchConstellations', () => {
  it('groups in-frame stars and ranks by count then brightness', () => {
    const stars = [
      star('antares', 'Scorpius', 0.96, 45, 180),
      star('sargas', 'Scorpius', 1.86, 46, 182),
      star('rigel', 'Orion', 0.13, 44, 178)
    ]
    const m = matchConstellations(stars, FOV)
    expect(m.length).toBe(2)
    expect(m[0]!.constellation).toBe('Scorpius')
    expect(m[0]!.stars[0]!.id).toBe('antares')
    expect(m[1]!.constellation).toBe('Orion')
  })

  it('ignores out-of-frame stars and returns empty when the lens is covered', () => {
    const stars = [star('vega', 'Lyra', 0.03, 45, 0)]
    expect(matchConstellations(stars, FOV)).toEqual([])
    expect(matchConstellations([], FOV)).toEqual([])
  })
})
