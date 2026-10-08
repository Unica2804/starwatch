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

  // Pass 1: luminance.
  const lum = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const r = data[i * 4] ?? 0
    const g = data[i * 4 + 1] ?? 0
    const b = data[i * 4 + 2] ?? 0
    lum[i] = (0.2126 * r + 0.5872 * g + 0.1142 * b) / 255
  }

  // Pass 2: subtract the slow background (city glow, airglow, Earth limb)
  // via a box-blurred background map, so gradients can't flood the output.
  // Integral image keeps it O(n).
  const w = width
  const h = height
  const sat = new Float64Array((w + 1) * (h + 1))
  for (let y = 0; y < h; y++) {
    let row = 0
    for (let x = 0; x < w; x++) {
      row += lum[y * w + x] ?? 0
      sat[(y + 1) * (w + 1) + (x + 1)] = (sat[y * (w + 1) + (x + 1)] ?? 0) + row
    }
  }
  const R = 12
  const box = (x0: number, y0: number, x1: number, y1: number): number => {
    const a = sat[y0 * (w + 1) + x0] ?? 0
    const b = sat[y0 * (w + 1) + (x1 + 1)] ?? 0
    const c = sat[(y1 + 1) * (w + 1) + x0] ?? 0
    const d = sat[(y1 + 1) * (w + 1) + (x1 + 1)] ?? 0
    return (d - b - c + a) / ((x1 - x0 + 1) * (y1 - y0 + 1))
  };
  const sig = new Float32Array(n)
  let sum = 0
  let sumSq = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const bg = box(Math.max(0, x - R), Math.max(0, y - R), Math.min(w - 1, x + R), Math.min(h - 1, y + R))
      const s = Math.max(0, (lum[y * w + x] ?? 0) - bg)
      sig[y * w + x] = s
      sum += s
      sumSq += s * s
    }
  }
  const mean = sum / n
  const std = Math.sqrt(Math.max(0, sumSq / n - mean * mean))
  // Flat frame (covered lens): no variance, no stars.
  if (std < 1e-9) return []
  const threshold = mean + sigmaFactor * std

  // Pass 3: local maxima above threshold (3x3 neighborhood).
  interface Cand { x: number; y: number; l: number }
  const cands: Cand[] = []
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      const l = sig[i] ?? 0
      if (l < threshold) continue
      let peak = true
      for (let dy = -1; dy <= 1 && peak; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue
          if ((sig[(y + dy) * w + (x + dx)] ?? 0) > l) {
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
