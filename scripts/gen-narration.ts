/**
 * Build-time narration generator. Runs ONCE on the dev machine with a
 * server-side key (env TINKER_KEY) — never in the frontend, never shipped.
 * Outputs committed to public/audio/*.mp3 + manifest. Runtime is
 * cached-mp3 + SpeechSynthesis fallback (no ElevenLabs runtime).
 *
 * Usage: TINKER_KEY=... npm run narrate
 * (Stub until Tinker Agent Skill is installed — see BACKLOG P0.)
 */
import { mkdirSync, writeFileSync } from 'node:fs'

const OUT = new URL('../public/audio/manifest.json', import.meta.url)

export function buildManifest(entries: string[]): Record<string, string> {
  const m: Record<string, string> = {}
  for (const e of entries) m[e] = `/audio/${e}.mp3`
  return m
}

if (import.meta.url === `file://${process.argv[1]}`) {
  mkdirSync(new URL('../public/audio', import.meta.url), { recursive: true })
  writeFileSync(OUT, JSON.stringify(buildManifest([]), null, 2))
  console.log('narrate: stub manifest written (install Tinker skill for real TTS)')
}
