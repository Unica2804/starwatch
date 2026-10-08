import { describe, expect, it } from 'vitest'
import { crossValidate } from './crossValidate'

const EPHEMERIS = [
  { constellation: 'Scorpius', stars: ['antares', 'sargas', 'shaula'] },
  { constellation: 'Orion', stars: ['betelgeuse', 'rigel', 'alnilam'] }
]

describe('crossValidate', () => {
  it('confirms what ephemeris proposed', () => {
    const r = crossValidate(EPHEMERIS, [
      { label: 'Scorpius', confidence: 0.9 }
    ])
    expect(r.verified.length).toBe(1)
    expect(r.rejected.length).toBe(0)
  })

  it('rejects hallucinated constellations not in view', () => {
    const r = crossValidate(EPHEMERIS, [
      { label: 'Ursa Major', confidence: 0.95 }
    ])
    expect(r.verified.length).toBe(0)
    expect(r.rejected.length).toBe(1)
  })

  it('rejects low-confidence guesses even when proposed', () => {
    const r = crossValidate(
      EPHEMERIS,
      [{ label: 'Orion', confidence: 0.2 }],
      0.5
    )
    expect(r.verified.length).toBe(0)
    expect(r.rejected.length).toBe(1)
  })

  it('matches despite case/punctuation noise from the model', () => {
    const r = crossValidate(EPHEMERIS, [
      { label: '  scorpius! ', confidence: 0.8 }
    ])
    expect(r.verified.length).toBe(1)
  })

  it('handles empty VLM output (camera covered) without crashing', () => {
    const r = crossValidate(EPHEMERIS, [])
    expect(r.verified).toEqual([])
    expect(r.rejected).toEqual([])
  })

  it('rejects a 0.99-confidence fake and a whole sky of fakes', () => {
    const r = crossValidate(EPHEMERIS, [
      { label: 'Ursa Major', confidence: 0.99 },
      { label: 'Cassiopeia', confidence: 0.99 },
      { label: 'Scorpius', confidence: 0.51 }
    ])
    expect(r.verified.map((c) => c.label)).toEqual(['Scorpius'])
    expect(r.rejected.map((c) => c.label).sort()).toEqual(['Cassiopeia', 'Ursa Major'])
  })

  it('rejects everything when ephemeris proposes nothing (daylight frame)', () => {
    const r = crossValidate([], [{ label: 'Orion', confidence: 0.99 }])
    expect(r.verified).toEqual([])
    expect(r.rejected.length).toBe(1)
  })
})
