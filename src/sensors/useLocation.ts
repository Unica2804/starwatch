import { useCallback, useState } from 'react'
import { isValidGps } from './fusion'

export interface GpsState {
  lat: number | null
  lon: number | null
  accuracyM: number | null
  error: string | null
  loading: boolean
  request: () => void
}

/** One-shot GPS fix. No watch, no network — pure satellite fix, cached. */
export function useLocation(): GpsState {
  const [lat, setLat] = useState<number | null>(null)
  const [lon, setLon] = useState<number | null>(null)
  const [accuracyM, setAccuracyM] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const request = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError('GPS not supported on this device')
      return
    }
    setLoading(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoading(false)
        const { latitude, longitude, accuracy } = pos.coords
        if (!isValidGps(latitude, longitude)) {
          setError('Got an invalid GPS fix — try outdoors with sky view')
          return
        }
        setLat(latitude)
        setLon(longitude)
        setAccuracyM(accuracy ?? null)
      },
      (err) => {
        setLoading(false)
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied — enable it to see your sky'
            : 'GPS fix failed — try outdoors with sky view'
        )
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
    )
  }, [])

  return { lat, lon, accuracyM, error, loading, request }
}
