/**
 * Audio player: cached build-time mp3 first, SpeechSynthesis fallback.
 * Zero runtime API calls — offline by design (no ElevenLabs runtime).
 */

export type AudioMode = 'cached' | 'synthesis' | 'none'

export function pickMode(hasCached: boolean, hasSynthesis: boolean): AudioMode {
  if (hasCached) return 'cached'
  if (hasSynthesis) return 'synthesis'
  return 'none'
}

export async function playNarration(opts: {
  url: string | null
  text: string
  audio: HTMLAudioElement | null
}): Promise<AudioMode> {
  const hasSynthesis =
    typeof window !== 'undefined' && 'speechSynthesis' in window
  const mode = pickMode(opts.url !== null, hasSynthesis)
  if (mode === 'cached' && opts.url && opts.audio) {
    opts.audio.src = opts.url
    await opts.audio.play()
    return mode
  }
  if (mode === 'synthesis') {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(opts.text)
    u.rate = 0.9
    window.speechSynthesis.speak(u)
    return mode
  }
  return 'none'
}
