# BACKLOG.md — StarWatch (remove when done)

## P0 — sky data (seed done, expand before ship)
- [ ] `catalog.json`: expand seed (43 stars + 4 line groups) → 2000 stars + 88 lines via `scripts/build-catalog.ts`
- [ ] Gyro pitch in `App.tsx` (currently fixed 45°) + `useCompass` device field test

## P0 — offline AI
- [ ] Dataset: expand `data/narration.seed.jsonl` (12) → 60–80 JSONL + `narration.holdout.jsonl` (10), human-reviewed, MIT
- [ ] Tinker LoRA fine-tune (r=8, 1–2 epochs, seq 512), save log + model card
- [ ] Export Q4 ONNX/LiteRT → HF → wire weights into `vlm.worker.ts` (stub = ephemeris-only now)

## P0 — ship
- [ ] IndexedDB consent-before-download UI for model shards + audio pack
- [ ] Render Static deploy, URL live (render.yaml ready, not yet deployed)

## P1 — prove + submit
- [ ] Night field test (photo + "took it outside" notes, pollution check)
- [ ] DEV draft via `create_article(published:false)`, tag `#hf26challenge`, template + repo + demo + why-open + training proof
- [ ] Publish in-window (due Oct 11 11:59 PM PDT), verify sticker + completion badge at `hacktoberfest.com/my`
