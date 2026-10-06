import { useEffect, useRef, useState } from 'react'
import {
  estimateDeclination,
  fieldMagnitude,
  fieldStatus,
  lowPass,
  lowPassAngle,
  needsRecalibration,
  pitchFromBeta,
  trueHeading
} from './fusion'

export interface CompassState {
  /** true-north heading, deg [0,360), smoothed */
  heading: number | null
  /** raw magnetic heading */
  magnetic: number | null
  /** applied declination */
  declination: number | null
  fieldUt: number | null
  interference: boolean
  recalibrate: boolean
  supported: boolean
  /** true once ≥1 orientation event arrived (vs. waiting for movement) */
  live: boolean  /** rear-camera altitude from gyro tilt, deg [0,90], smoothed */
  pitch: number | null
  /** true on iOS where motion needs an explicit user-granted permission */
  needsPermission: boolean
  /** ask for iOS motion permission. No-op elsewhere. Resolves granted? */
  enableMotion: () => Promise<boolean>
}

const ALPHA = 0.18 // dynamic low-pass: responsive yet stable while pointing

/** True-north compass from DeviceOrientation + magnetometer. Android-first. */
export function useCompass(lat: number | null, lon: number | null): CompassState {
  const [mag, setMag] = useState<number | null>(null)
  const [pitch, setPitch] = useState<number | null>(null)
  const [fieldUt, setFieldUt] = useState<number | null>(null)
  const [supported, setSupported] = useState(true)
  const [live, setLive] = useState(false)
  const [needsPermission, setNeedsPermission] = useState(false)
  const smooth = useRef<number | null>(null)
  const smoothPitch = useRef<number | null>(null)

  useEffect(() => {
    let dead = false
    const onOrient = (e: DeviceOrientationEvent): void => {
      // iOS gives webkitCompassHeading (true-north already); Android gives alpha.
      const w = e as DeviceOrientationEvent & { webkitCompassHeading?: number }
      let magnetic: number | null = null
      if (typeof w.webkitCompassHeading === 'number') {
        const dec =
          lat !== null && lon !== null ? estimateDeclination(lat, lon) : 0
        magnetic = (((w.webkitCompassHeading - dec) % 360) + 360) % 360
      } else if (typeof e.alpha === 'number') {
        magnetic = ((360 - e.alpha) % 360 + 360) % 360
      }
      if (magnetic === null || dead) return
      smooth.current =
        smooth.current === null
          ? magnetic
          : lowPassAngle(smooth.current, magnetic, ALPHA)
      if (!dead) {
        setLive(true)
        setMag(smooth.current)
        const p = pitchFromBeta(typeof e.beta === 'number' ? e.beta : null)
        if (p !== null) {
          smoothPitch.current =
            smoothPitch.current === null ? p : lowPass(smoothPitch.current, p, ALPHA)
          setPitch(smoothPitch.current)
        }
      }
    }
    const onMag = (e: Event): void => {
      const m = e as Event & { x?: number; y?: number; z?: number }
      if (typeof m.x === 'number' && typeof m.y === 'number' && typeof m.z === 'number') {
        setFieldUt(fieldMagnitude(m.x, m.y, m.z))
      }
    }
    if (typeof window === 'undefined') return
    const DOE = window.DeviceOrientationEvent as unknown as
      | { requestPermission?: () => Promise<string> }
      | undefined
    if (typeof DOE === 'undefined') {
      setSupported(false)
      return
    }
    if (typeof DOE.requestPermission === 'function') {
      // iOS: motion events stay silent until the user grants permission.
      setNeedsPermission(true)
      return
    }
    window.addEventListener('deviceorientationabsolute', onOrient as EventListener, true)
    window.addEventListener('deviceorientation', onOrient as EventListener, true)
    window.addEventListener('magnetometer', onMag as EventListener, true)
    return () => {
      dead = true
      window.removeEventListener('deviceorientationabsolute', onOrient as EventListener, true)
      window.removeEventListener('deviceorientation', onOrient as EventListener, true)
      window.removeEventListener('magnetometer', onMag as EventListener, true)
    }
  }, [lat, lon, needsPermission])

  const dec = lat !== null && lon !== null ? estimateDeclination(lat, lon) : null
  const heading =
    mag !== null && dec !== null ? trueHeading(mag, dec) : mag
  const status = fieldUt === null ? 'ok' : fieldStatus(fieldUt)

  const enableMotion = async (): Promise<boolean> => {
    try {
      const DOE = window.DeviceOrientationEvent as unknown as
        | { requestPermission?: () => Promise<string> }
        | undefined
      if (DOE && typeof DOE.requestPermission === 'function') {
        const res = await DOE.requestPermission()
        if (res === 'granted') {
          setNeedsPermission(false)
          return true
        }
        return false
      }
      setNeedsPermission(false)
      return true
    } catch {
      return false
    }
  }

  return {
    heading,
    pitch,
    magnetic: mag,
    declination: dec,
    fieldUt,
    interference: status === 'interference',
    recalibrate: needsRecalibration(status, null),
    supported,
    live,
    needsPermission,
    enableMotion
  }
}
