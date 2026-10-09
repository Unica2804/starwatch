import { useEffect, useRef } from 'react'
import type { StarPosition } from '../sky/engine'
import { drawSkyMap, type SkyLines } from './mapRender'

interface Props {
  stars: readonly StarPosition[]
  lines: readonly SkyLines[]
  heading: number
  pitch: number
  hFov?: number
  vFov?: number
}

/**
 * Sky-map fallback for washed-out city skies: the full ephemeris sky,
 * driven by live compass + gyro. Google-Sky-Map mode — no camera needed.
 * One Canvas 2D draw per update, no DOM-per-star.
 */
export function SkyCanvas({ stars, lines, heading, pitch, hFov = 60, vFov = 40 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = canvas.clientWidth * dpr
    const h = canvas.clientHeight * dpr
    if (w === 0 || h === 0) return
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
    drawSkyMap(ctx, w, h, dpr, stars, lines, {
      width: w,
      height: h,
      centerAz: heading,
      centerAlt: pitch,
      hFov,
      vFov
    })
  }, [stars, lines, heading, pitch, hFov, vFov])

  return (
    <canvas
      ref={ref}
      className="w-full h-[60vh] block"
      aria-label="Star map — red night vision. Move your phone to look around."
    />
  )
}
