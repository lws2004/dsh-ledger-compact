# Changelog

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
