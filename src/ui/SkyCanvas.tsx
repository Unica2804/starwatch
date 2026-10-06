import { useEffect, useRef } from 'react'
import type { StarPosition } from '../sky/engine'
import { project, radiusFromMag } from './project'

interface Props {
  stars: readonly StarPosition[]
  lines: readonly { pairs: readonly (readonly string[])[] }[]
  heading: number
  pitch: number
  hFov?: number
  vFov?: number
}

/** Canvas 2D star field — one draw per frame, no DOM-per-star. */
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
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
    const view = { width: w, height: h, centerAz: heading, centerAlt: pitch, hFov, vFov }
    ctx.fillStyle = '#0a0000'
    ctx.fillRect(0, 0, w, h)

    const byId = new Map(stars.map((s) => [s.id, s]))
    ctx.strokeStyle = 'rgba(255,42,26,0.45)'
    ctx.lineWidth = 1 * dpr
    for (const g of lines) {
      for (const pair of g.pairs) {
        const a = byId.get(pair[0] as string)
        const b = byId.get(pair[1] as string)
        if (!a || !b) continue
        const pa = project(a.alt, a.az, view)
        const pb = project(b.alt, b.az, view)
        if (!pa.visible || !pb.visible) continue
        ctx.beginPath()
        ctx.moveTo(pa.x, pa.y)
        ctx.lineTo(pb.x, pb.y)
        ctx.stroke()
      }
    }
    for (const s of stars) {
      const p = project(s.alt, s.az, view)
      if (!p.visible) continue
      const r = radiusFromMag(s.mag) * dpr
      ctx.fillStyle = '#ffd9d4'
      ctx.beginPath()
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [stars, lines, heading, pitch, hFov, vFov])

  return (
    <canvas
      ref={ref}
      className="w-full h-[60vh] block"
      aria-label="Star map — red night vision"
    />
  )
}
