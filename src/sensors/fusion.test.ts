import { describe, expect, it } from 'vitest'
import {
  estimateDeclination,
  fieldMagnitude,
  fieldStatus,
  isValidGps,
  lowPass,
  lowPassAngle,
  needsRecalibration,
  pitchFromBeta,
  trueHeading
} from './fusion'

describe('magnetometer', () => {
  it('computes |B| and flags the 25–65µT window', () => {
    expect(fieldMagnitude(30, 40, 0)).toBeCloseTo(50, 6)
    expect(fieldStatus(50)).toBe('ok')
    expect(fieldStatus(25)).toBe('ok')
    expect(fieldStatus(65)).toBe('ok')
    expect(fieldStatus(24.9)).toBe('weak')
    expect(fieldStatus(120)).toBe('interference') // speaker / magnet mount
    expect(fieldStatus(NaN)).toBe('weak')
  })

  it('prompts figure-8 recal on interference or poor accuracy', () => {
    expect(needsRecalibration('interference', null)).toBe(true)
    expect(needsRecalibration('weak', null)).toBe(true)
    expect(needsRecalibration('ok', 20)).toBe(true)
    expect(needsRecalibration('ok', 5)).toBe(false)
    expect(needsRecalibration('ok', null)).toBe(false)
  })
})

describe('headings', () => {
  it('adds east declination and wraps', () => {
    expect(trueHeading(350, 10)).toBeCloseTo(0, 6)
    expect(trueHeading(10, -15)).toBeCloseTo(355, 6)
  })

  it('smooths 359°→1° along the short arc, not through 180°', () => {
    const s = lowPassAngle(359, 1, 0.5)
    expect(s).toBeCloseTo(0, 6)
  })

  it('clamps alpha and passes through stable readings', () => {
    expect(lowPass(10, 20, 0)).toBe(10)
    expect(lowPass(10, 20, 1)).toBe(20)
    expect(lowPassAngle(45, 45, 0.2)).toBeCloseTo(45, 6)
  })

  it('converges noisy compass walk instead of jumping', () => {
    let h = 0
    for (const noisy of [5, -4, 3, -2, 1]) {
      h = lowPassAngle(h, (0 + noisy + 360) % 360, 0.18)
    }
    expect(Math.abs(h) < 5 || Math.abs(h - 360) < 5).toBe(true)
  })

  it('estimates bounded declination without network', () => {
    const t0 = performance.now()
    const d = estimateDeclination(19.07, 72.87)
    expect(performance.now() - t0).toBeLessThan(50)
    expect(d).toBeGreaterThanOrEqual(-25)
    expect(d).toBeLessThanOrEqual(25)
  })
})

describe('gps validation', () => {
  it('rejects null-island, poles overflow, and NaN', () => {
    expect(isValidGps(19.07, 72.87)).toBe(true)
    expect(isValidGps(0, 0)).toBe(false)
    expect(isValidGps(91, 0)).toBe(false)
    expect(isValidGps(0, 181)).toBe(false)
    expect(isValidGps(NaN, 72)).toBe(false)
  })
})

describe('camera pitch', () => {
  it('maps upright phone to horizon, tilt-back to sky', () => {
    expect(pitchFromBeta(90)).toBe(0)
    expect(pitchFromBeta(135)).toBe(45)
    expect(pitchFromBeta(180)).toBe(90)
  })
  it('clamps face-down / over-tilt and null beta', () => {
    expect(pitchFromBeta(45)).toBe(0)
    expect(pitchFromBeta(270)).toBe(90)
    expect(pitchFromBeta(null)).toBe(null)
    expect(pitchFromBeta(NaN)).toBe(null)
  })
})
