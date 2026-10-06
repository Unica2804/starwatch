import { useEffect, useRef, useState } from 'react'
import {
  estimateDeclination,
  fieldMagnitude,
  fieldStatus,
  lowPassAngle,
  needsRecalibration,
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
}

const ALPHA = 0.18 // dynamic low-pass: responsive yet stable while pointing

/** True-north compass from DeviceOrientation + magnetometer. Android-first. */
export function useCompass(lat: number | null, lon: number | null): CompassState {
  const [mag, setMag] = useState<number | null>(null)
  const [fieldUt, setFieldUt] = useState<number | null>(null)
  const [supported, setSupported] = useState(true)
  const smooth = useRef<number | null>(null)

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
      setMag(smooth.current)
    }
    const onMag = (e: Event): void => {
      const m = e as Event & { x?: number; y?: number; z?: number }
      if (typeof m.x === 'number' && typeof m.y === 'number' && typeof m.z === 'number') {
        setFieldUt(fieldMagnitude(m.x, m.y, m.z))
      }
    }
    if (typeof window === 'undefined') return
    if (
      typeof DeviceOrientationEvent === 'undefined' &&
      typeof window.DeviceOrientationEvent === 'undefined'
    ) {
      setSupported(false)
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
  }, [lat, lon])

  const dec = lat !== null && lon !== null ? estimateDeclination(lat, lon) : null
  const heading =
    mag !== null && dec !== null ? trueHeading(mag, dec) : mag
  const status = fieldUt === null ? 'ok' : fieldStatus(fieldUt)
  return {
    heading,
    magnetic: mag,
    declination: dec,
    fieldUt,
    interference: status === 'interference',
    recalibrate: needsRecalibration(status, null),
    supported
  }
}
