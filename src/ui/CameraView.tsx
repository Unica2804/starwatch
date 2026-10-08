import { useEffect, useRef, useState } from 'react'
import { useCamera } from '../sensors/useCamera'
import { crossValidate } from '../ai/crossValidate'
import { detectStars } from '../ai/detect'
import { matchDetections, type MatchResult } from '../ai/match'
import { identify } from '../ai/vlm.worker'
import type { StarPosition } from '../sky/engine'
import catalog from '../sky/catalog.json'

interface Props {
  heading: number | null
  pitch: number | null
  positioned: readonly StarPosition[]
}

interface Result extends MatchResult {
  backend: string
  frameW: number
  frameH: number
  detected: number
}

// Phone rear-camera field of view estimate until calibrated per device.
const H_FOV = 60
const V_FOV = 40
// Detection runs on a downscaled frame: fast enough to feel instant.
const DETECT_W = 320

const LINES = catalog.lines as { constellation: string; pairs: string[][] }[]

function groupVisible(matches: MatchResult['matches']): { constellation: string; names: string[] }[] {
  const groups = new Map<string, string[]>()
  for (const m of matches) {
    const key = m.star.constellation ?? 'Unknown'
    const g = groups.get(key)
    if (g) g.push(m.star.name)
    else groups.set(key, [m.star.name])
  }
  return [...groups.entries()]
    .map(([constellation, names]) => ({ constellation, names }))
    .sort((a, b) => b.names.length - a.names.length)
    .slice(0, 3)
}

/** Camera-first identification: frame + compass + GPS → what's in view. */
export function CameraView({ heading, pitch, positioned }: Props) {
  const { stream, error, loading, retry } = useCamera(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const v = videoRef.current
    if (v && stream) {
      v.srcObject = stream
      void v.play().catch(() => {})
    }
  }, [stream])

  const drawOverlay = (r: MatchResult, vw: number, vh: number): void => {
    const canvas = overlayRef.current
    const video = videoRef.current
    if (!canvas || !video) return
    const rect = video.getBoundingClientRect()
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.scale(dpr, dpr)

    const sx = rect.width / vw
    const sy = rect.height / vh
    const at = new Map(r.matches.map((m) => [m.star.id, m]))

    // Constellation lines only through VISIBLE stars — haze gets no lines.
    ctx.strokeStyle = 'rgba(255,42,26,0.85)'
    ctx.lineWidth = 2
    for (const g of LINES) {
      for (const pair of g.pairs) {
        const a = at.get(pair[0] as string)
        const b = at.get(pair[1] as string)
        if (!a || !b) continue
        ctx.beginPath()
        ctx.moveTo(a.x * sx, a.y * sy)
        ctx.lineTo(b.x * sx, b.y * sy)
        ctx.stroke()
      }
    }
    // Rings on every verified star + dots on the unknowns.
    for (const m of r.matches) {
      ctx.strokeStyle = '#ffd9d4'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(m.x * sx, m.y * sy, 10, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.fillStyle = 'rgba(255,217,212,0.5)'
    for (const u of r.unknown) {
      ctx.beginPath()
      ctx.arc(u.x * sx, u.y * sy, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  const onIdentify = (): void => {
    const video = videoRef.current
    if (!video || heading === null || pitch === null || busy) return
    const vw = video.videoWidth
    const vh = video.videoHeight
    if (vw === 0 || vh === 0) return
    setBusy(true)
    try {
      // Downscaled scratch frame for detection (full frame never leaves RAM).
      const scratch = document.createElement('canvas')
      const scale = DETECT_W / vw
      scratch.width = DETECT_W
      scratch.height = Math.max(1, Math.round(vh * scale))
      const sctx = scratch.getContext('2d')
      if (!sctx) return
      sctx.drawImage(video, 0, 0, scratch.width, scratch.height)
      const pixels = sctx.getImageData(0, 0, scratch.width, scratch.height).data

      const detected = detectStars(pixels, scratch.width, scratch.height)
      const view = {
        width: vw,
        height: vh,
        centerAz: heading,
        centerAlt: pitch,
        hFov: H_FOV,
        vFov: V_FOV
      }
      const matched = matchDetections(detected, positioned, view)
      void identify({ pixels, width: scratch.width, height: scratch.height }).then((ai) => {
        // VLM may only confirm matched constellations (none claimed pre-fine-tune).
        const confirmed = crossValidate(
          groupVisible(matched.matches).map((g) => ({
            constellation: g.constellation,
            stars: g.names
          })),
          ai.claims
        )
        void confirmed
        const r: Result = { ...matched, backend: ai.backend, frameW: vw, frameH: vh, detected: detected.length }
        setResult(r)
        drawOverlay(matched, vw, vh)
      }).finally(() => setBusy(false))
    } catch {
      setBusy(false)
    }
  }

  const visible = result ? groupVisible(result.matches) : []

  return (
    <section className="flex flex-col min-h-[70vh]">
      <div className="relative bg-black">
        {error ? (
          <div className="p-6 text-center">
            <p className="text-sm">{error}</p>
            <button
              type="button"
              onClick={retry}
              className="mt-4 min-h-touch px-8 rounded-xl border-2 border-night-red text-night-red font-bold"
            >
              Retry camera
            </button>
          </div>
        ) : (
          <>
            <video ref={videoRef} playsInline muted className="w-full h-[52vh] object-cover" aria-label="Sky camera" />
            <canvas ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true" />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
              <div className="w-16 h-16 rounded-full border-2 border-night-red opacity-80" />
            </div>
            <p className="absolute top-2 left-2 text-xs bg-black/60 px-2 py-1 rounded">
              {heading === null ? '…' : `${Math.round(heading)}°`}
              {' · '}
              {pitch === null ? '…' : `${Math.round(pitch)}° up`}
            </p>
          </>
        )}
        {loading && <p className="absolute bottom-2 w-full text-center text-xs">Starting camera…</p>}
      </div>
      <button
        type="button"
        onClick={onIdentify}
        disabled={stream === null || heading === null || pitch === null || busy}
        className="mx-4 mt-4 min-h-touch rounded-xl bg-night-red text-black text-xl font-bold disabled:opacity-40"
      >
        {busy ? 'Reading the sky…' : '✦ Identify what’s overhead'}
      </button>
      {result && (
        <div className="mx-4 mt-3 rounded-xl border border-night-dim p-4">
          {visible.length === 0 ? (
            <p className="text-sm text-center">
              {result.detected === 0
                ? 'No stars detected — covered lens, daylight, or total cloud. The overlay stays empty rather than guessing.'
                : `${result.detected} lights found but none match the catalog here — planets, planes, or compass error.`}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {visible.map((g) => (
                <li key={g.constellation}>
                  <p className="text-lg font-bold text-night-red">{g.constellation} ✓ visible</p>
                  <p className="text-sm opacity-80">{g.names.join(' · ')}</p>
                </li>
              ))}
            </ul>
          )}
          {result.hidden.length > 0 && (
            <p className="mt-3 text-xs opacity-60">
              Should be here but washed out: {[...new Set(result.hidden.map((s) => s.constellation ?? 'Unknown'))].slice(0, 3).join(', ')}
            </p>
          )}
          <p className="mt-2 text-xs opacity-60">
            {result.detected} points in frame · AI vision: {result.backend} — fine-tuned model confirms here next.
          </p>
        </div>
      )}
    </section>
  )
}
