import { starsInFov, type Fov, type StarPosition } from '../sky/engine'

export interface ConstellationMatch {
  constellation: string
  stars: StarPosition[]
  brightestMag: number
}

/**
 * Rank constellations currently in the camera frame, from sky math alone.
 * The VLM may only confirm these — never invent others (see crossValidate).
 */
export function matchConstellations(
  positioned: readonly StarPosition[],
  fov: Fov
): ConstellationMatch[] {
  const inView = starsInFov(positioned, fov)
  const groups = new Map<string, StarPosition[]>()
  for (const s of inView) {
    const key = s.constellation ?? 'Unknown'
    const g = groups.get(key)
    if (g) g.push(s)
    else groups.set(key, [s])
  }
  const out: ConstellationMatch[] = [...groups.entries()].map(([constellation, stars]) => ({
    constellation,
    stars: [...stars].sort((a, b) => a.mag - b.mag),
    brightestMag: Math.min(...stars.map((s) => s.mag))
  }))
  out.sort((a, b) => b.stars.length - a.stars.length || a.brightestMag - b.brightestMag)
  return out
}
