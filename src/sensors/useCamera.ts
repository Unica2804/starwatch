import { useCallback, useEffect, useRef, useState } from 'react'

export interface CameraState {
  stream: MediaStream | null
  error: string | null
  loading: boolean
  retry: () => void
}

/** Rear camera for sky-pointing. No recording, no network — frames stay on device. */
export function useCamera(active: boolean): CameraState {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const attempt = useRef(0)

  const stop = useCallback(() => {
    setStream((s) => {
      s?.getTracks().forEach((t) => t.stop())
      return null
    })
  }, [])

  const start = useCallback(() => {
    if (!('mediaDevices' in navigator) || !navigator.mediaDevices?.getUserMedia) {
      setError('Camera not supported on this device')
      return
    }
    const n = ++attempt.current
    setLoading(true)
    setError(null)
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then((s) => {
        if (n !== attempt.current) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        setLoading(false)
        setStream(s)
      })
      .catch((e: unknown) => {
        if (n !== attempt.current) return
        setLoading(false)
        const name = e instanceof DOMException ? e.name : ''
        setError(
          name === 'NotAllowedError'
            ? 'Camera blocked — allow it in the browser prompt to identify stars'
            : 'Camera failed to start — check another app isn’t using it'
        )
      })
  }, [])

  useEffect(() => {
    if (active) start()
    else stop()
    return () => {
      attempt.current += 1
      setStream((s) => {
        s?.getTracks().forEach((t) => t.stop())
        return null
      })
    }
  }, [active, start, stop])

  return { stream, error, loading, retry: start }
}
