import { useEffect, useMemo, useState } from 'react'
import { playNarration } from './audio/player'
import { useCompass } from './sensors/useCompass'
import { useLocation } from './sensors/useLocation'
import catalog from './sky/catalog.json'
import { visibleStars, type Star } from './sky/engine'
import { CameraView } from './ui/CameraView'
import { effectiveHeading, shouldOfferManual } from './ui/heading'
import { PocketMode } from './ui/PocketMode'
import { SkyCanvas } from './ui/SkyCanvas'

const NARRATION: Record<string, string> = {
  Scorpius:
    "Face south. Antares burns red at the scorpion's heart. Trace right to Sargas, then down to Shaula's sting.",
  Orion:
    'Three belt stars in a short straight line. Above left glows red Betelgeuse; below right burns blue Rigel.',
  'Ursa Major':
    'Seven dipper stars pour a long ladle. Follow the two pointers away from the cup to Polaris.'
}

type Tab = 'camera' | 'map' | 'pocket'

export default function App() {
  const loc = useLocation()
  const compass = useCompass(loc.lat, loc.lon)
  const [tab, setTab] = useState<Tab>('camera')
  const [pitchManual, setPitchManual] = useState(45)
  const [manual, setManual] = useState<number | null>(null)
  const [waitedMs, setWaitedMs] = useState(0)

  // Grace timer: offer manual look-around if sensors stay silent.
  useEffect(() => {
    if (loc.lat === null || compass.live) return
    const t0 = Date.now()
    const id = window.setInterval(() => setWaitedMs(Date.now() - t0), 1000)
    return () => window.clearInterval(id)
  }, [loc.lat, compass.live])

  const positioned = useMemo(() => {
    if (loc.lat === null || loc.lon === null) return []
    return visibleStars(catalog.stars as Star[], { latitude: loc.lat, longitude: loc.lon }, new Date())
  }, [loc.lat, loc.lon])

  const heading = effectiveHeading(compass.heading, manual)
  const pitch = compass.pitch ?? pitchManual
  const offerManual = shouldOfferManual(compass.live, compass.supported, waitedMs)

  const top = positioned[0] ?? null
  const narration = top
    ? (NARRATION[top.constellation ?? ''] ?? `Overhead now: ${top.name}, magnitude ${top.mag}. Let your eyes rest soft.`)
    : 'Get a GPS fix, then point your phone at the sky.'

  const onListen = (): void => {
    void playNarration({ url: null, text: narration, audio: null })
  }

  if (loc.lat === null || loc.lon === null) {
    return (
      <main className="min-h-screen bg-night-bg text-night-text flex flex-col items-center justify-center p-6">
        <h1 className="text-3xl font-bold text-night-red">StarWatch</h1>
        <p className="mt-2 text-center max-w-xs">
          Offline pocket stargazing. Point your camera at the sky — AI names what’s there.
        </p>
        {loc.error && <p className="mt-4 text-center text-sm">{loc.error}</p>}
        <button
          type="button"
          onClick={loc.request}
          disabled={loc.loading}
          className="mt-8 min-h-touch w-full max-w-xs rounded-xl bg-night-red text-black text-xl font-bold disabled:opacity-50"
        >
          {loc.loading ? 'Finding you…' : '📍 Find my sky'}
        </button>
      </main>
    )
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'camera', label: '📷 Sky' },
    { id: 'map', label: '🗺 Map' },
    { id: 'pocket', label: '📴 Listen' }
  ]

  return (
    <main className="min-h-screen bg-night-bg text-night-text flex flex-col">
      <header className="px-4 pt-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-night-red">StarWatch</h1>
        <p className="text-xs opacity-70">
          {heading === null
            ? (compass.live ? 'Waiting for compass…' : 'Move or tilt your phone…')
            : `${Math.round(heading)}°${manual !== null ? ' manual' : ' true'} · ${Math.round(pitch)}° up`}
          {compass.recalibrate ? ' · figure-8 recal' : ''}
        </p>
      </header>
      <nav className="px-4 mt-2 flex gap-2" aria-label="Views">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={`flex-1 min-h-touch rounded-xl font-bold ${
              tab === t.id ? 'bg-night-red text-black' : 'border-2 border-night-red text-night-red'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'camera' && (
        <CameraView heading={heading} pitch={compass.pitch} positioned={positioned} />
      )}

      {tab === 'map' && (
        <>
          {compass.needsPermission && (
            <button
              type="button"
              onClick={() => { void compass.enableMotion() }}
              className="mx-4 mt-2 min-h-touch rounded-xl bg-night-red text-black font-bold"
            >
              Enable motion sensors
            </button>
          )}
          {offerManual && manual === null && (
            <div className="mx-4 mt-2 rounded-xl border-2 border-night-red p-4">
              <p className="text-sm text-center">
                {compass.heard && !compass.live
                  ? 'Your browser is blocking motion sensors — in Brave: address-bar lock → Site settings → Motion sensors → Allow, then reload.'
                  : !compass.supported
                    ? 'No compass on this device — explore by hand instead.'
                    : 'Compass is quiet — explore by hand instead.'}
              </p>
              <button
                type="button"
                onClick={() => setManual(180)}
                className="mt-3 min-h-touch w-full rounded-xl bg-night-red text-black font-bold"
              >
                Look around manually
              </button>
            </div>
          )}
          <SkyCanvas
            stars={positioned}
            lines={catalog.lines}
            heading={heading ?? 180}
            pitch={pitch}
          />
          {manual !== null && (
            <div className="px-4 flex flex-col gap-2">
              {compass.live && (
                <button
                  type="button"
                  onClick={() => setManual(null)}
                  className="min-h-touch rounded-xl bg-night-red text-black font-bold"
                >
                  Compass is live — use compass
                </button>
              )}
              <label className="text-xs opacity-70">
                Heading {Math.round(manual)}°
                <input
                  type="range"
                  min={0}
                  max={359}
                  value={Math.round(manual)}
                  onChange={(e) => setManual(Number(e.target.value))}
                  className="w-full min-h-touch"
                  aria-label="Manual heading"
                />
              </label>
              {compass.pitch === null && (
                <label className="text-xs opacity-70">
                  Tilt {pitchManual}°
                  <input
                    type="range"
                    min={0}
                    max={90}
                    value={pitchManual}
                    onChange={(e) => setPitchManual(Number(e.target.value))}
                    className="w-full min-h-touch"
                    aria-label="Manual tilt"
                  />
                </label>
              )}
            </div>
          )}
          <p className="px-4 py-2 text-center text-sm">
            {top ? `${top.name} · ${top.constellation ?? 'deep sky'}` : 'No bright stars in view — tilt up.'}
          </p>
        </>
      )}

      {tab === 'pocket' && (
        <PocketMode
          heading={heading}
          topConstellation={top?.constellation ?? null}
          narration={narration}
          audioUrl={null}
          onListen={onListen}
        />
      )}
      <footer className="px-4 pb-4 text-center text-[10px] opacity-40">
        build {__BUILD_ID__} · compass {compass.live ? 'live' : compass.supported ? 'silent' : 'unsupported'}
      </footer>
    </main>
  )
}
