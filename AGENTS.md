# AGENTS.md — StarWatch (Week 1: Touch Grass)

Main rules. Read this first, every run. Details live in the linked files.

## Project
Offline-only pocket stargazing PWA for DEV `Hacktoberfest Open-Source AI Challenge: Week 1` (ID `79`). Open camera → point at sky → fine-tuned open model reads the frame + compass/gyro alt-az + GPS → names the star/constellation on screen. Voice narration deferred to later.

## Decisions (locked)
- **Language:** TypeScript strict. See `ARCHITECTURE.md`.
- **Architecture:** Vite 6 + React + TS PWA. See `ARCHITECTURE.md`.
- **Tracks:** Overall ($250) + Gemma ($200) + Render ($200) + Tinker ($200). ElevenLabs dropped (claim failed). See `ARCHITECTURE.md` § Competition.
- **Offline-only:** Tinker = build-time LoRA fine-tune only. Zero runtime API calls. No keys in frontend.
- **Compatibility:** Android-first. Validate PWA install, sensors (GPS/compass/gyro), WebGPU→WASM fallback, and audio on Android first; iOS second.
- **Testing:** Write test cases for each feature targeting edge cases + performance (sensor noise, offline, low-memory, WebGPU→WASM fallback). Assert real outputs, never just "run finished".
- **Credits claimed:** Render $50, Tinker $10 via `hacktoberfest.com/my`. ElevenLabs claim failed → contact `hacktoberfest@mlh.io`, build with SpeechSynthesis fallback.

## Files (read when relevant)
- `ARCHITECTURE.md` — stack, layers, data flow, export recipe.
- `BACKLOG.md` — remaining tasks. Remove a task when completed. Single source of truth for what is left.
- `FAILED_APPROACH.md` — banned approaches. Check before coding so failures are not repeated.
- `session-*.md` — logs only. Never edit, never treat as spec.

## DevRelay MCP (always use it, never memory)
- Auth: `connect_mlh_account` (browser sign-in), `mlh_connection_status`.
- Rules: `get_challenge_details(id:79)` — `full_details` authoritative. `get_knowledge_document(hacktoberfest|global-hack-week|dev-challenges)` before program questions.
- Events: `search_mlh_events`, `get_mlh_event`, `list_my_mlh_events`.
- Research: `search_dev_to_semantic` + `get_article_content` + `get_comments` for non-trivial choices; deliver with Community Wisdom section.
- Debugging: when local investigation stalls (device bugs, silent sensor failures, deploy mysteries), use web search for the exact error/device/behavior before guessing. Never ship a fix for a problem you haven't reproduced or sourced.
- Offers/skills: `list_event_offers` only after confirmed `registered/checked_in`, `claim_promo_code` only after explicit user yes (show once, never write to files). `list_event_agent_skills` before sponsor API code; run `install_command` exactly, only after approval.
- Publishing: `create_article(published:false)` for drafts, tag `#hf26challenge`, `some_ai` disclosure.

## Hard rules (2026 PR-less year)
- New project built Oct 5–11, MIT license, one DEV entry. PRs to existing repos count for nothing.
- Post must explain why open > closed (offline, privacy, fine-tune/swap, $0). Writing Quality weighted heaviest.
- Never quote dates/rubrics/prizes from memory. Re-fetch.
