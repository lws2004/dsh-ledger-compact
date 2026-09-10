# dsh-ledger-compact

English · [中文](README.zh.md)

**dsh-plugin** for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). Large tool results are shaped **before** they reach the model. An optional local fold can replace DSH’s LLM `/compact`.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![dsh-plugin](https://img.shields.io/badge/dsh-plugin-111111)](https://github.com/topics/dsh-plugin)
[![test](https://github.com/telagod/dsh-ledger-compact/actions/workflows/test.yml/badge.svg)](https://github.com/telagod/dsh-ledger-compact/actions/workflows/test.yml)

---

## Why

Long agent turns dump huge `tool_result` blocks into the next request. DSH already has an excellent LLM compact (`@deepseek-ai/dsh-compaction-basic`), but it costs an extra model call and runs *after* pressure builds.

This plugin does two cheaper things first, and optionally a third:

1. **Ingress shaping** — freeze oversized *unsent* tool results into a head/tail excerpt on the idle pre-step. Only the step that just finished is touched: its first request is the one being prepared, so a rewrite never invalidates a provider-cached prefix.
2. **Mechanical fold** — `/fast-compact` and the input-bar bolt collapse older history into a short ledger card. No model call.
3. **Replace default compact** *(off)* — reuse the official engine’s `summarize` hook so `/compact`, auto-compaction, and overflow recovery also skip the LLM.

Keep `dsh-compaction-basic` mounted. This plugin does not replace the engine.

## Install

Requires **dsh ≥ 0.1.2-rc.1**; verified on **0.1.5-rc.1**. Both API renames in that range are handled: `session.events` → `session.eventAt(seq)` and the positional replace keys `start/end` → `startSeq/endSeq`.

```bash
dsh plugin --profile web add github:telagod/dsh-ledger-compact
```

Restart the web profile after install. The bundle patch inserts plugin id `dsh-ledger-compact`.

From a local checkout:

```bash
git clone https://github.com/telagod/dsh-ledger-compact.git
dsh plugin --profile web add ./dsh-ledger-compact
```

## What you get

| Layer | When | Model call | What changes |
| --- | --- | --- | --- |
| Ingress shaping | Idle `agent/pre-step` | No | Current unsent `tool_result` only |
| Bolt / `/fast-compact` | You click or type it | No | Older history → mechanical fold card |
| Replace default compact | `/compact`, auto, overflow | No | Same official transaction; local summarizer |
| Official `/compact` | Default DSH path | Yes | LLM `<compacted-summary>` checkpoint |

The input-bar **bolt** is a context-pressure meter. By default it needs a second click before folding (can be turned off). After a fold, the chat shows an expandable row in the same style as the official compact line; the open view is a slim left-axis timeline, not a model essay.

## Settings

Open **Settings → 快速压缩**. Changes write through to the Host document immediately.

| Setting | Default | Meaning |
| --- | --- | --- |
| Ingress shaping (`enabled`) | on | Excerpt large unsent `tool_result` blocks before the next request |
| Allow dense PNG (`snapImages`) | off | Attach a bitmap only when the main model lists `image` in `inputModalities` **and** the image is cheaper than the original |
| Confirm before fold (`confirmFold`) | on | Bolt requires a second click |
| Replace default compact (`replaceDefault`) | **off** | `/compact`, automatic pressure compaction, and overflow recovery use the mechanical summarizer |
| Ingress threshold (`minSnapTokens`) | `3000` | Approximate tokens before an excerpt (or PNG) is considered. Range 200–200000 |
| PNG savings (`savingsRatio`) | `0.85` | Excerpt + estimated image tokens must be ≤ this fraction of the original |

Turn **Replace default compact** off at any time to restore DSH’s LLM checkpoint. `/fast-compact` stays mechanical either way.

## Commands

```
/fast-compact
/fast-compact status
```

There is no vision sidecar. `/fast-compact vision …` was removed.

`/compact` remains the official DSH command. With replace-default **off**, it still calls the model. With it **on**, the same command runs the mechanical fold through the existing engine.

`/fast-compact status` also reports health: ingress shaped/snapped/saved counters, the last ingress error when one is repeating, and any compaction engine that lacks a `summarize` hook (with replace-default on, such an engine would silently call the model).

## Ingress excerpt

Default is text only — no PNG, no LLM. Only results from the **immediately preceding step** of the current turn are candidates; everything already sent stays byte-identical, which is what keeps the provider prefix cache intact. Already-shaped placeholders are not rewritten. `skill` and `context` tool results are skipped. If `tokenMeter` is missing, ingress is skipped so the plugin never `replace`s without writing `compaction/prune`.

```
[Snapcompact: N tokens → excerpt]
first 16 lines
… (K lines elided; see image if attached. To inspect or edit exact bytes, re-read with offset/limit) …
last 8 lines
```

A PNG is attached only when all of these hold:

- “Allow dense PNG” is on
- the routed model’s `inputModalities` **explicitly includes `image`** (names like `gpt-4o` are never guessed)
- excerpt + estimated image tokens ≤ original × savings ratio (default 15% cheaper)

## Fold card

Mechanical, no model. Prior fold text is never nested, but it is not lost either: files, intents and errors recovered from an earlier `[Snapcompact]` card are carried forward into the new one (files only fill capacity the new span left over).

```
[Snapcompact] Fold ~N tok. Exact file bytes are not stored — re-read with offset/limit if a detail matters.
FILES
- [edit] path
- [read] path
INTENTS
- recent user goals
TOOLS
- read 4
COMMANDS
- …
ERRORS
- …
EXCERPT
[user] …
[tool] …
```

This is cheaper and more predictable than an LLM checkpoint. It also keeps less prose: paths, intents, tool counts, and a short excerpt — not a narrative of *why*.

## Working with DSH compact

Do **not** unmount `@deepseek-ai/dsh-compaction-basic`.

- Pressure, range selection, shrink checks, and durable `compaction/*` events stay on the official engine.
- This plugin only wraps `summarize()`.
- `/fast-compact` marks the current agent for one `compactNow()` so other sessions keep the LLM path.
- Replace-default is a live setting: every hooked engine uses the mechanical summarizer until you turn it off (or unload the plugin).

On web, compaction lives in the preset isolate. Host code reads it with `agentPresets.serviceFor(agent, "compaction")`, not `inject: ['compaction']`.

## Develop

```bash
node --test lib/ledger.test.js

# one test binds a real dsh-session; point it at the installed package to run it
DSH_SESSION_MODULE="$DSH/node_modules/@deepseek-ai/dsh-session/lib/index.js" \
  node --test lib/ledger.test.js
```

| File | Role |
| --- | --- |
| `lib/ctx.js` | Optional service lookup + version-tolerant session event access |
| `lib/ingress.js` | Previous-step `tool_result` shaping (cache-safe by construction) |
| `lib/vision.js` | Dense PNG gated by `inputModalities` + settings |
| `lib/excerpt.js` / `lib/fold.js` / `lib/snapfont.js` | Excerpt, fold card, bitmap |
| `lib/hook.js` | Mechanical `summarize` hook |
| `lib/resolve.js` | Find isolated compaction engines |
| `lib/index.js` | Command, settings, pre-step |
| `lib/client.js` | Bolt, fold row, settings page |

## License

MIT. Bitmap fonts under `lib/fonts/` are documented in [`lib/fonts/README.md`](lib/fonts/README.md).
