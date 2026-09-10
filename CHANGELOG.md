# Changelog

## 0.7.0

Priced against the model that actually reads the frames (deepseek-flash), and measured.

### Added

- **`lib/pricing.js`** — the published DeepSeek table (peak/off-peak cache-hit, cache-miss and output rates for `deepseek-flash` and `deepseek-v4-pro`), plus `requestPreviewSize`, which reproduces the request pipeline's resize onto the model's image pixel budget (640000 px).
- **`bench/fidelity-bench.mjs`** — fixtures × layout variants × checkable questions against the live endpoint. It measures two things instead of assuming either: correctness from the picture, and the provider's own `usage.prompt_tokens` priced with the table. Every call is cached by content hash.
- **Measured DeepSeek v4 image accounting** (`deepseekImageTokens`): `≈ clamp(70 + 5.7e-4·px, 213, 1043)` on the resized dimensions. The published "one image caps at 384 tokens" calculator does not match live usage.
- `bench/report.md`, the raw result of a full matrix run.

### Changed

- **DeepSeek routes now draw inside the request pixel budget**: `8on16-budget 1024x624` (39 rows) instead of a 1024x2048 canvas that the pipeline resized to 566x1131. The resample, not the layout, was destroying legibility — the same content scored 1–2/10 answers when resized against 8/10 drawn natively, at the same ~430-token bill.
- **Image token estimates for DeepSeek are taken on the preview size**, so a full frame estimates 434 instead of 1445. The excerpt notice reports the preview when (and only when) the pipeline will resize.
- The layout bench now runs against `deepseek-flash` and reports money per frame next to the raw-text price.

## 0.6.0

Dense-image layout: the PNG now fills the tile bands it pays for.

### Added

- **`lib/layout.js`** — pure grid planner for the ingress image: column packing, in-cell wrapping, the source-line ruler, and an occupancy measure that charges gutters and gaps to the layout that asks for them.
- **Line ruler** in the raster: from 50 source lines up, the left gutter prints the source line number every 5 grid rows. An image stays addressable — a model that spots a bad row can `offset/limit` back to exact bytes instead of treating the picture as a dead end.
- **Layered ink** in the raster: body `16`, column rules `205`, ruler `150` on paper `245`. Hierarchy that costs no image tokens, only pixels that are already paid for.
- **`bench/layout-bench.mjs`** — per-fixture layout economics (text tokens, image tokens, lines carried, occupancy). Pure arithmetic, no model calls.
- Layout tests: tile-band cap, column packing, wrap guard, wrapped outliers, ruler ink levels, and the economy gate.

### Changed

- **The canvas cap is tile-aligned.** openai-family frames are `1024×2048` instead of `1024×1540`; at 1540 the last 512px band bought four usable pixels. Same bill (1445 tokens), 93 text rows instead of 70.
- **Short lines pack into columns.** The planner tries 1–24 columns and keeps the highest occupancy, rejecting any candidate that would wrap more than 2% of its cells. On a 3000-line numeric dump the same 1445 tokens now carry 1860 source lines instead of 93; a two-column layout doubles what a 60-character log fits.
- **The image must beat the text it renders** (`IMAGE_ECONOMY = 0.85`). If the drawn text would have been cheaper as text, ingress falls back to the excerpt — the case where a nearly blank PNG was attached for very short lines is now refused.
- The excerpt notice names the layout (`… PNG ~1445 tokens · 20 cols · line ruler`), so the model knows how the page is arranged.

### Fixed

- `wrapCell` no longer grows an empty trailing row when a line ends exactly on a cell edge.

## 0.5.0

### Added

- **Tabbed settings page** (入境 / 折页 / 诊断) with per-row icons, a denser 12.5 px layout, and a live fold-card preview in the 折页 tab.
- **诊断 tab backed by a new `getHealth()` host RPC**: plugin version, the session-event accessor this DSH actually exposes (`eventAt` or the legacy `events`), ingress counters (shaped / snapped / saved / failures plus the last error), and compaction-engine hook wiring.
- `VERSION` in `lib/config.js`, guarded by a test that compares it with `package.json`.

### Changed

- `settingsSchema.toJSON()` now emits the **canonical Schemastery `{uid, refs}` envelope** instead of a flat `{type, meta, dict}` document. Nested nodes keep their methods (`simplify`, …) after rehydration; a test compares the envelope field-by-field against a reference schema built with the real library when one is resolvable.
- The health snapshot records the session-event accessor observed at runtime, so a DSH upgrade that renames it again shows up in the UI instead of failing silently.

## 0.4.0

Compatibility and hardening release. Verified against the DSH 0.1.5-rc.1 API and the 0.1.1-rc.2 shapes it replaced.

### Fixed

- **Ingress shaping never ran on DSH 0.1.5-rc.1.** The public `session.events` accessor became `session.eventAt(seq)`, so every pre-step pass threw before appending anything, and `inventory()` broke `/fast-compact status` plus the input-bar pressure meter. Session events are now read through one version-tolerant helper.
- **The positional replace keys were renamed** (`start`/`end` → `startSeq`/`endSeq`). The rewrite emits the current names and retries the older ones once, remembering the shape for the process.

### Changed

- Ingress touches **only the immediately preceding step** of the current turn. That result's first request is the one being prepared, so a rewrite cannot invalidate a provider-cached prefix even when an earlier pass was skipped or failed.
- Rejected appends are counted and surfaced instead of swallowed: `/fast-compact status` prints `ingress FAILING (n): <message>`, and the first occurrence of each distinct message is logged once.
- Fold cards **carry earlier generations forward**: files, intents and errors recovered from a previous `[Snapcompact]` card are merged into the new one instead of being dropped.
- Engines without a `summarize` method are named in `/fast-compact status` — with replace-default on they would otherwise fall back to a model call silently.
- The retired `ingress: false` sidecar only decides while `enabled` was never written, so the settings switch can turn ingress back on.
- Client: the pressure poll reschedules itself, backs off to 30 s on failure, skips hidden tabs, and tints the bolt when the meter is unavailable. The settings-nav icon observer coalesces mutations into one frame and only runs while a settings dialog is open.
- `replaceToolResultContent` no longer deep-clones the whole tool message.

### Tests

32 tests via `node --test lib/ledger.test.js`, including a real `dsh-session` end-to-end rewrite when `DSH_SESSION_MODULE` points at the installed package.
