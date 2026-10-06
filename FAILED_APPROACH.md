# FAILED_APPROACH.md — do not repeat

- ElevenLabs runtime API — promo unclaimable, needs cloud (dies at zero bars). Use build-time text + cached mp3 + SpeechSynthesis fallback. Do not chase $100 track.
- Cloud inference at runtime (StarLens-style Gemini API) — fails dark-sky offline requirement + privacy story. Tinker build-time only.
- Full Hipparcos 118k in context / 256K window — cloud-only, not phone. Use 2000-star catalog.json.
- Large "best quality" model on phone — Apple WebGPU 10-buffer limit + 4GB WASM OOM kill it. Use SmolVLM2-256M / Gemma-E2B quantized, benchmark weakest phone first.
- Full vision fine-tune on $10 — blows budget in one run. Freeze vision, LoRA text head only, single run, no sweeps.
- Next.js SSR — heavier, offline harder, no benefit for static sky PWA. Use Vite static.
- Native Expo/Flutter now — no instant URL for judges, review queue, 6-day risk. PWA first, native v2 later.
- DOM nodes per star — redraw overhead kills compass. Use Canvas 2D.
- API keys in frontend / committed mp3-generator keys — leak + billing risk. Build-time script with env key, commit outputs only.
- PRs to existing repos — counts for nothing in 2026 PR-less Hacktoberfest. Must be new project.
- Cloning TrailEcho woods-audio guide — direct Week-1 competitor. Differentiate: night sky + compass + fine-tuned narration.
- Silent WebGPU wrong output (e.g. white inpaint) — never trust "run finished". Assert pixel/chart output in tests.
- Quoting dates/rubrics/prizes from memory or session logs — re-fetch `get_challenge_details(79)` + knowledge docs every run.
