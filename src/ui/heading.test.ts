import { describe, expect, it } from 'vitest'
import { effectiveHeading, shouldOfferManual } from './heading'

describe('effectiveHeading', () => {
  it('prefers the live compass, falls back to manual, else null', () => {
    expect(effectiveHeading(180, null)).toBe(180)
    expect(effectiveHeading(180, 90)).toBe(90)
    expect(effectiveHeading(null, 90)).toBe(90)
    expect(effectiveHeading(null, null)).toBe(null)
  })
})

describe('shouldOfferManual', () => {
  it('never interrupts a live compass', () => {
    expect(shouldOfferManual(true, true, 60_000)).toBe(false)
  })
  it('offers immediately when sensors are unsupported', () => {
    expect(shouldOfferManual(false, false, 0)).toBe(true)
  })
  it('waits out the grace period, then offers', () => {
    expect(shouldOfferManual(false, true, 1000)).toBe(false)
    expect(shouldOfferManual(false, true, 6000)).toBe(true)
    expect(shouldOfferManual(false, true, 30_000)).toBe(true)
  })
})
