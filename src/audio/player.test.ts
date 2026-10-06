import { describe, expect, it } from 'vitest'
import { pickMode } from './player'

describe('player fallback', () => {
  it('prefers cached mp3 over synthesis', () => {
    expect(pickMode(true, true)).toBe('cached')
  })
  it('falls back to on-device synthesis with no network', () => {
    expect(pickMode(false, true)).toBe('synthesis')
  })
  it('reports none when nothing can speak (silent pocket = fail loudly in UI)', () => {
    expect(pickMode(false, false)).toBe('none')
  })
})
