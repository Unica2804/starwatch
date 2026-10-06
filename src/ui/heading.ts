/**
 * Heading source selection: live compass wins, manual look-around covers
 * sensor-less devices (desktop, denied permission, silent sensors).
 * The app must never strand the user on "waiting for compass".
 */

/** Manual override wins when set; otherwise the live compass heading. */
export function effectiveHeading(
  compass: number | null,
  manual: number | null
): number | null {
  return manual ?? compass
}

/** Offer manual mode when sensors stay silent past the grace period. */
export function shouldOfferManual(
  live: boolean,
  supported: boolean,
  waitedMs: number,
  graceMs = 6000
): boolean {
  if (live) return false
  if (!supported) return true
  return waitedMs >= graceMs
}
