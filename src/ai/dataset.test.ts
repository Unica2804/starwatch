import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const seed = new URL('../../data/narration.seed.jsonl', import.meta.url)

describe('narration dataset', () => {
  it('parses as JSONL with instruction/output, offline-safe, seq-512-sized', () => {
    const lines = readFileSync(seed, 'utf8')
      .split('\n')
      .filter((l) => l.trim().length > 0)
    expect(lines.length).toBeGreaterThanOrEqual(10)
    for (const line of lines) {
      const row = JSON.parse(line) as { instruction?: unknown; output?: unknown }
      expect(typeof row.instruction).toBe('string')
      expect(typeof row.output).toBe('string')
      const out = row.output as string
      const words = out.split(/\s+/).length
      expect(words).toBeLessThanOrEqual(90) // fits seq 512 with prompt
      expect(out).not.toMatch(/http|app store|api key/i)
    }
  })
})
