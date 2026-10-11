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

## P0 — offline AI (Week 1 scope: pipeline without weights)
- [x] Detection + match + overlay + hallucination harness (synthetic + real-photon gates green)
- [x] VLM spike (Oct 11): Florence-2 q4 captions generic only; SigLIP zero-shot prompt-fragile (Scorpius 0.354 > Orion 0.221 on Orion photo) — REJECTED for tonight, no AI-track claims
- [ ] DEFERRED: dataset 60–80, Tinker LoRA run, Q4 export → HF → wire weights. Week 2+.

## P0 — ship
- [x] Render Static live: https://starwatch.onrender.com (auto-deploys from main)
- [ ] IndexedDB consent-before-download UI for model shards
- [ ] Torch toggle for dark-sky focusing (needs capability check)

## P1 — prove + submit
- [x] DEV post published Oct 11: https://dev.to/unica_2804/starwatch-an-offline-pocket-stargazing-pwa-that-names-what-you-point-at-302d (tag `#hf26challenge`, Overall + Render only)
- [ ] Verify sticker + completion badge at `hacktoberfest.com/my`
- [ ] Winners week of Oct 12
