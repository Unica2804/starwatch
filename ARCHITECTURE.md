# ARCHITECTURE.md — StarWatch

## 1. Language
TypeScript strict. Sensor fusion + sky math need types. Transformers.js, astronomy-engine, Workbox are TS-first. Python forces a server (dies offline). Flutter/Dart has no instant URL for judges.

## 2. Stack
Vite 6 + React 18 + TS + vite-plugin-pwa (Workbox) + Tailwind + Canvas 2D → Render Static (`https://starwatch.onrender.com`).

```
[GPS + Compass + Gyro + Camera]
  → [Sensor] true-north + WMM declination, |B| interference (25–65µT ok), dynamic low-pass smoothing, figure-8 recal prompt
  → [Sky Engine] astronomy-engine + catalog.json (2000 bright stars + 88 constellation lines, ~300KB) → what should be there
  → [Detect] classical star-point detection on a 320px frame (adaptive threshold, ms, no model) → what is actually visible
  → [Match] detections × projected positions (24px tolerance) → verified stars; hidden = washed out, unknown = planets/planes
  → [Overlay] Canvas lines only through VISIBLE stars — haze never gets lines
  → [VLM Worker] fine-tuned Gemma 3n-E2B text head (SmolVLM2-256M fallback), ONNX quantized, WebGPU→WASM, isolated Worker → confirms matches
  → cross-validate: ephemeris proposes, detection verifies, VLM confirms (no hallucinated constellations)
  → [UI] Camera (video + overlay, default) → SkyCanvas map → PocketMode (deferred voice)
  → [Audio, deferred] build-time text via Tinker/Gemma → cached mp3 + SpeechSynthesis offline fallback (no ElevenLabs runtime)
  → [Offline] Workbox SW + IndexedDB, consent-before-200MB-download, model shards from HF (not Render, 25MB limit)
```

## 3. Offline-only + Tinker fine-tune ($10)
- Freeze vision encoder. LoRA text head only: r=8, 1–2 epochs, seq 512, quant base. Single run, no sweeps.
- Dataset: 60–80 JSONL written this week, MIT. `{instruction: "Scorpius, Oct, 19°lat, med pollution" → output: "20-sec whisper + where to look + myth"}`. 10 held out for eval.
- Export: merge LoRA → Q4 → ONNX/LiteRT → HF → PWA cache. Training log + dataset link + model card go in DEV post as proof.
- Runtime: zero network. Location never leaves phone.

## 4. Competition path
- Target: Overall ($250) + Best Use of Gemma ($200) + Best Use of Render ($200) + Best Use of Tinker ($200). Drop ElevenLabs ($100) — promo unclaimable.
- Entry: new code Oct 5–11 (due Oct 11 11:59 PM PDT / Oct 12 06:59 UTC), DEV post from template, tag `#hf26challenge`, repo + live demo URL, why-open paragraph, optional DevRelay session embed.
- Credits: Render $50 + Tinker $10 claimed at `hacktoberfest.com/my`. Week-1 MLH `list_event_offers` = empty, redemptions = none (verified via gateway). ElevenLabs failure → email `hacktoberfest@mlh.io` with screenshot, do not rapid-retry.

## 5. Layout
```
src/sky/catalog.json + engine.ts
src/sensors/useCompass.ts + useLocation.ts
src/ai/vlm.worker.ts + crossValidate.ts
src/ui/SkyCanvas.tsx + PocketMode.tsx
src/audio/player.ts (cached mp3 + speechSynthesis)
scripts/gen-narration.ts (Tinker build-time only)
public/audio/*.mp3
```
