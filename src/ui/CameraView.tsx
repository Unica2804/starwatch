import { useEffect, useRef, useState } from 'react'
import { useCamera } from '../sensors/useCamera'
import { crossValidate } from '../ai/crossValidate'
import { matchConstellations, type ConstellationMatch } from '../ai/identify'
import { identify } from '../ai/vlm.worker'
import type { StarPosition } from '../sky/engine'

interface Props {
  heading: number | null
  pitch: number | null
  positioned: readonly StarPosition[]
}

interface Result {
  candidates: ConstellationMatch[]
  backend: string
  frameW: number
  frameH: number
}

// Phone rear-camera field of view estimate until calibrated per device.
const H_FOV = 60
const V_FOV = 40

/** Camera-first identification: frame + compass + GPS → what's in view. */
export function CameraView({ heading, pitch, positioned }: Props) {
  const { stream, error, loading, retry } = useCamera(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  const frameRef = useRef<HTMLCanvasElement>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const v = videoRef.current
    if (v && stream) {
      v.srcObject = stream
      void v.play().catch(() => {})
    }
  }, [stream])

  const onIdentify = (): void => {
    const video = videoRef.current
    const frame = frameRef.current
    if (!video || !frame || heading === null || pitch === null || busy) return
    const w = video.videoWidth
    const h = video.videoHeight
    if (w === 0 || h === 0) return
    setBusy(true)
    try {
      frame.width = w
      frame.height = h
      const ctx = frame.getContext('2d')
      if (!ctx) return
      ctx.drawImage(video, 0, 0, w, h)
      const pixels = ctx.getImageData(0, 0, w, h).data
      void identify({ pixels, width: w, height: h }).then((ai) => {
        const candidates = matchConstellations(positioned, {
          headingDeg: heading,
          pitchDeg: pitch,
          hFov: H_FOV,
          vFov: V_FOV
        })
        // Ephemeris proposes; the VLM may only confirm (none yet pre-fine-tune).
        const checked = crossValidate(
          candidates.map((c) => ({ constellation: c.constellation, stars: c.stars.map((s) => s.id) })),
          ai.claims
        )
        void checked
        setResult({ candidates: candidates.slice(0, 3), backend: ai.backend, frameW: w, frameH: h })
      }).finally(() => setBusy(false))
    } catch {
      setBusy(false)
    }
  }

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
      <canvas ref={frameRef} className="hidden" aria-hidden="true" />
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
          {result.candidates.length === 0 ? (
            <p className="text-sm text-center">No catalogued constellation in this frame — try tilting up.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {result.candidates.map((c) => (
                <li key={c.constellation}>
                  <p className="text-lg font-bold text-night-red">{c.constellation}</p>
                  <p className="text-sm opacity-80">{c.stars.map((s) => s.name).join(' · ')}</p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs opacity-60">
            Sky math ({result.frameW}×{result.frameH} frame) · AI vision: {result.backend} — fine-tuned model plugs in here.
          </p>
        </div>
      )}
    </section>
  )
}
