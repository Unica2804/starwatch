interface Props {
  heading: number | null
  topConstellation: string | null
  narration: string
  audioUrl: string | null
  onListen: () => void
}

/**
 * PocketMode — red-on-black, audio-only, glove targets.
 * 2-tap flow: Open → Point → Listen. Phone goes in the pocket.
 */
export function PocketMode({ heading, topConstellation, narration, audioUrl, onListen }: Props) {
  return (
    <section className="min-h-screen bg-night-bg text-night-text flex flex-col items-center px-6 py-10">
      <p className="text-sm tracking-widest uppercase opacity-70">
        {heading === null ? 'Waiting for compass…' : `Heading ${Math.round(heading)}°`}
      </p>
      <h2 className="mt-4 text-4xl font-bold text-night-red text-center">
        {topConstellation ?? 'Point at the sky'}
      </h2>
      <p className="mt-4 max-w-sm text-center leading-relaxed">{narration}</p>
      <button
        type="button"
        onClick={onListen}
        className="mt-10 min-h-touch w-full max-w-xs rounded-xl bg-night-red text-black text-xl font-bold"
      >
        🔊 Listen {audioUrl ? '' : '(voice)'}
      </button>
      <p className="mt-4 text-xs opacity-60">Offline. No data leaves your phone.</p>
    </section>
  )
}
