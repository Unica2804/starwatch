/**
 * Cross-validation: ephemeris proposes, VLM disposes.
 * The VLM may only CONFIRM what sky math already placed in view.
 * Anything else is flagged unverified and never narrated as fact.
 * This is how we kill hallucinated constellations offline.
 */

export interface EphemerisClaim {
  constellation: string
  stars: string[]
}

export interface VlmClaim {
  label: string
  confidence: number // [0,1]
}

export interface ValidationResult {
  verified: VlmClaim[]
  rejected: VlmClaim[]
}

/** Normalize for comparison: case/space/punct-insensitive. */
export function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z]/g, '')
}

export function crossValidate(
  ephemeris: readonly EphemerisClaim[],
  vlm: readonly VlmClaim[],
  minConfidence = 0.5
): ValidationResult {
  const proposed = new Set(ephemeris.map((e) => norm(e.constellation)))
  const verified: VlmClaim[] = []
  const rejected: VlmClaim[] = []
  for (const c of vlm) {
    if (c.confidence >= minConfidence && proposed.has(norm(c.label))) {
      verified.push(c)
    } else {
      rejected.push(c)
    }
  }
  return { verified, rejected }
}
