import { describe, expect, it } from 'vitest'
import { project, radiusFromMag } from './project'

const VIEW = { width: 400, height: 300, centerAz: 180, centerAlt: 45, hFov: 60, vFov: 40 }

describe('project', () => {
  it('centers the exact look-point', () => {
    const p = project(45, 180, VIEW)
    expect(p.visible).toBe(true)
    expect(p.x).toBeCloseTo(200, 6)
    expect(p.y).toBeCloseTo(150, 6)
  })

  it('wraps azimuth: 359° visible when centered at 1°', () => {
    const v = { ...VIEW, centerAz: 1 }
    const p = project(45, 359, v)
    expect(p.visible).toBe(true)
    expect(p.x).toBeLessThan(200)
  })

  it('marks below-horizon and out-of-frame stars invisible (never drawn)', () => {
    expect(project(-5, 180, VIEW).visible).toBe(false)
    expect(project(45, 0, VIEW).visible).toBe(false)
    expect(project(90, 180, VIEW).visible).toBe(false)
  })

  it('renders 2000 projections within a frame budget', () => {
    const t0 = performance.now()
    for (let i = 0; i < 2000; i++) {
      project((i % 90) - 10, i % 360, VIEW)
    }
    expect(performance.now() - t0).toBeLessThan(100)
  })

  it('sizes bright stars larger than faint ones', () => {
    expect(radiusFromMag(-1.46)).toBeGreaterThan(radiusFromMag(3.3))
    expect(radiusFromMag(6)).toBeGreaterThanOrEqual(0.6)
  })
})
