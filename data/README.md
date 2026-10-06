# StarWatch narration dataset — MIT, written Oct 2026 for Week 1

- `narration.seed.jsonl` — 12 hand-written examples (this week, MIT).
- Target: 60–80 lines + 10 held-out for eval before the Tinker run.
- Schema per line: `{"instruction": "<constellation, month, lat, sky>", "output": "<~20-sec whisper + where to look + one myth/sci fact>"}`
- Rules: no PII, no addresses, ≤90 words output (fits seq 512), offline-safe
  language (no "check the app store", no URLs).
- Expand with `scripts/expand-dataset.ts` (template slots), then human-review
  every line. Holdout: `narration.holdout.jsonl` (10 lines, never trained on).
- Tinker recipe (ARCHITECTURE §3): freeze vision, LoRA text head r=8,
  1–2 epochs, seq 512, single run. Log + model card go in the DEV post.
