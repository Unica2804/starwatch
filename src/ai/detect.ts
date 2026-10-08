/**
 * Fast on-device star-point detection — classical CV, no model, milliseconds.
 * Night skies are polluted: sky math names constellations the camera can't
 * actually see. Detection finds the points that ARE visible; matching
 * (see match.ts) decides which catalog stars they are. The overlay then
 * connects only visible stars, so haze never gets lines drawn through it.
 */

export interface StarPoint {
  /** normalized 0..1 — overlay scales to any canvas */
  x: number
  y: number
  /** 0..1 peak luminance */
  brightness: number
}

export interface DetectOptions {
  /** keep pixels brighter than mean + sigmaFactor*std (default 3) */
  sigmaFactor?: number
  /** min separation between points, in detection pixels (default 4) */
  minSeparation?: number
  /** hard cap on returned points (default 200) */
  maxPoints?: number
}

export function detectStars(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  opts: DetectOptions = {}
): StarPoint[] {
  const { sigmaFactor = 3, minSeparation = 4, maxPoints = 200 } = opts
  const n = width * height
  if (data.length < n * 4 || n === 0) return []

  // Pass 1: luminance + mean/std for an adaptive threshold that survives
  // city glow (bright background raises the bar instead of flooding output).
  let sum = 0
  let sumSq = 0
  const lum = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const r = data[i * 4] ?? 0
    const g = data[i * 4 + 1] ?? 0
    const b = data[i * 4 + 2] ?? 0
    const l = (0.2126 * r + 0.5872 * g + 0.1142 * b) / 255
    lum[i] = l
    sum += l
    sumSq += l * l
  }
  const mean = sum / n
  const std = Math.sqrt(Math.max(0, sumSq / n - mean * mean))
  // Flat frame (covered lens, pure haze): no variance, no stars.
  if (std < 1e-6) return []
  const threshold = mean + sigmaFactor * std

  // Pass 2: local maxima above threshold (3x3 neighborhood).
  const w = width
  interface Cand { x: number; y: number; l: number }
  const cands: Cand[] = []
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      const l = lum[i] ?? 0
      if (l < threshold) continue
      let peak = true
      for (let dy = -1; dy <= 1 && peak; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue
          if ((lum[(y + dy) * w + (x + dx)] ?? 0) > l) {
            peak = false
            break
          }
        }
      }
      if (peak) cands.push({ x, y, l })
    }
  }

  // Pass 3: brightest-first non-max suppression, then normalize.
  cands.sort((a, b) => b.l - a.l)
  const accepted: Cand[] = []
  const minSq = minSeparation * minSeparation
  for (const c of cands) {
    if (accepted.length >= maxPoints) break
    let clash = false
    for (const a of accepted) {
      const dx = a.x - c.x
      const dy = a.y - c.y
      if (dx * dx + dy * dy < minSq) {
        clash = true
        break
      }
    }
    if (!clash) accepted.push(c)
  }
  return accepted.map((c) => ({ x: c.x / width, y: c.y / height, brightness: c.l }))
}
