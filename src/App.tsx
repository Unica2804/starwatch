import { useMemo, useState } from 'react'
import { playNarration } from './audio/player'
import { useCompass } from './sensors/useCompass'
import { useLocation } from './sensors/useLocation'
import catalog from './sky/catalog.json'
import { visibleStars, type Star } from './sky/engine'
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

export default function App() {
  const loc = useLocation()
  const compass = useCompass(loc.lat, loc.lon)
  const [pocket, setPocket] = useState(false)
  const [pitch] = useState(45)

  const positioned = useMemo(() => {
    if (loc.lat === null || loc.lon === null) return []
    return visibleStars(catalog.stars as Star[], { latitude: loc.lat, longitude: loc.lon }, new Date())
  }, [loc.lat, loc.lon])

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
          Offline pocket stargazing. One GPS fix, then the sky is yours — no network.
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

  if (pocket) {
    return (
      <main className="bg-night-bg">
        <PocketMode
          heading={compass.heading}
          topConstellation={top?.constellation ?? null}
          narration={narration}
          audioUrl={null}
          onListen={onListen}
        />
        <button
          type="button"
          onClick={() => setPocket(false)}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 min-h-touch px-8 rounded-xl border-2 border-night-red text-night-red font-bold"
        >
          Show map
        </button>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-night-bg text-night-text flex flex-col">
      <header className="px-4 pt-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-night-red">StarWatch</h1>
        <p className="text-xs opacity-70">
          {compass.heading === null ? 'Waiting for compass…' : `${Math.round(compass.heading)}° true`}
          {compass.recalibrate ? ' · figure-8 recal' : ''}
        </p>
      </header>
      <SkyCanvas
        stars={positioned}
        lines={catalog.lines}
        heading={compass.heading ?? 180}
        pitch={pitch}
      />
      <p className="px-4 py-2 text-center text-sm">
        {top ? `${top.name} · ${top.constellation ?? 'deep sky'}` : 'No bright stars in view — tilt up.'}
      </p>
      <button
        type="button"
        onClick={() => setPocket(true)}
        className="mx-4 mb-6 min-h-touch rounded-xl bg-night-red text-black text-xl font-bold"
      >
        📴 Pocket mode — listen
      </button>
    </main>
  )
}
