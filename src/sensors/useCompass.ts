import { useEffect, useRef, useState } from 'react'
import {
  estimateDeclination,
  fieldMagnitude,
  fieldStatus,
  lowPass,
  lowPassAngle,
  needsRecalibration,
  orientationReading,
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
  live: boolean
  /** true once any orientation event arrived, even an empty one (blocked sensors announce themselves with nulls) */
  heard: boolean  /** rear-camera altitude from gyro tilt, deg [0,90], smoothed */
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
  const [heard, setHeard] = useState(false)
  const [needsPermission, setNeedsPermission] = useState(false)
  const smooth = useRef<number | null>(null)
  const smoothPitch = useRef<number | null>(null)
  const permissionAsked = useRef(false)

  useEffect(() => {
    let dead = false
    const onOrient = (e: DeviceOrientationEvent): void => {
      const w = e as DeviceOrientationEvent & {
        absolute?: boolean
        webkitCompassHeading?: number
      }
      const dec = lat !== null && lon !== null ? estimateDeclination(lat, lon) : 0
      const reading = orientationReading(
        {
          alpha: typeof e.alpha === 'number' ? e.alpha : null,
          beta: typeof e.beta === 'number' ? e.beta : null,
          absolute: typeof w.absolute === 'boolean' ? w.absolute : undefined,
          webkitCompassHeading:
            typeof w.webkitCompassHeading === 'number' ? w.webkitCompassHeading : null
        },
        dec
      )
      if (dead) return
      setHeard(true)
      // Gyro tilt is valid from any event — update it independently so the
      // camera always knows where it points, even without a magnetometer.
      if (reading.pitch !== null) {
        smoothPitch.current =
          smoothPitch.current === null
            ? reading.pitch
            : lowPass(smoothPitch.current, reading.pitch, ALPHA)
        setPitch(smoothPitch.current)
      }
      // Compass heading only from Earth-referenced data. Relative alpha
      // (Chrome 50+ plain deviceorientation) would corrupt the heading.
      if (reading.magnetic === null) return
      smooth.current =
        smooth.current === null
          ? reading.magnetic
          : lowPassAngle(smooth.current, reading.magnetic, ALPHA)
      setLive(true)
      setMag(smooth.current)
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
    if (typeof DOE.requestPermission === 'function' && !permissionAsked.current) {
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
          permissionAsked.current = true
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
    heard,
    needsPermission,
    enableMotion
  }
}
