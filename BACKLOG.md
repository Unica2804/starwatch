# BACKLOG.md — StarWatch (remove when done)

## Direction (locked Oct 6)
- Camera-first: open camera → frame + compass/gyro + GPS → name the star/constellation on screen.
- Voice narration deferred to later (player.ts + PocketMode stay as stubs).

## P0 — sky data (seed done, expand before ship)
- [ ] `catalog.json`: expand seed (43 stars + 4 line groups) → 2000 stars + 88 lines via `scripts/build-catalog.ts`

## P0 — vision (detect+match+overlay done, VLM confirm pending)
- [x] `detect.ts` (adaptive star points, 320px, <100ms) + `match.ts` (24px tolerance, hidden/unknown split) + overlay in `CameraView`
- [ ] Live overlay tracking (currently redrawn per Identify; drift as phone moves)
- [ ] Calibrate camera FOV per device (currently 60×40 estimate in `CameraView.tsx`)

## P0 — offline AI (pipeline done, weights pending)
- [ ] Dataset: expand `data/narration.seed.jsonl` (12) → 60–80 JSONL + `narration.holdout.jsonl` (10), human-reviewed, MIT
- [ ] Tinker LoRA fine-tune (r=8, 1–2 epochs, seq 512), save log + model card
- [ ] Export Q4 ONNX/LiteRT → HF → wire weights into `vlm.worker.ts` (stub = ephemeris-only now)

## P0 — ship
- [x] Render Static live: https://starwatch.onrender.com (auto-deploys from main)
- [ ] IndexedDB consent-before-download UI for model shards
- [ ] Torch toggle for dark-sky focusing (needs capability check)

## P1 — prove + submit
- [ ] Night field test with real phone: camera identify on Orion/Scorpius (photo + notes, pollution check)
- [ ] DEV draft via `create_article(published:false)`, tag `#hf26challenge`, template + repo + demo + why-open + training proof
- [ ] Publish in-window (due Oct 11 11:59 PM PDT), verify sticker + completion badge at `hacktoberfest.com/my`
