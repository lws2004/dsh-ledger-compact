# dsh-ledger-compact

[English](#english) · [中文](#中文)

**dsh-plugin** for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness): OMP / pi-zig / pi-moke style **ingress shaping**, plus an optional local `/fast-compact`. An opt-in setting can also replace DSH's LLM `/compact` and auto-compaction.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![dsh-plugin](https://img.shields.io/badge/dsh-plugin-111111)](https://github.com/topics/dsh-plugin)
[![test](https://github.com/telagod/dsh-ledger-compact/actions/workflows/test.yml/badge.svg)](https://github.com/telagod/dsh-ledger-compact/actions/workflows/test.yml)

---

## English

Large tool results are trimmed **before they reach the model**. Messages already in the prefix are left alone. `/fast-compact` is an optional mechanical fold (no model call). Replacing the default compact is **off** until you turn it on.

- **Ingress:** on idle pre-step, excerpt oversized `tool_result` blocks from the **current unsent turn**. Default is text excerpt only — no PNG, no LLM.
- **Input-bar bolt** is a context pressure meter. A second click (can be disabled) folds history into a mechanical short card. The chat shows an expandable fold line in the same style as the official compact row; the open view is a slim left-axis timeline, not a model summary.
- Settings write through to the Host document immediately: ingress, dense PNG, confirm-before-fold, replace-default-compact, ingress threshold, PNG savings ratio.
- **Replace default compact** (off by default): `/compact`, automatic pressure compaction, and overflow recovery all use the same mechanical `summarize` hook. Keep `@deepseek-ai/dsh-compaction-basic` mounted — this plugin does not swap the engine, only the summarizer. Turn it off to restore the LLM checkpoint.

### Install

Requires **dsh ≥ 0.1.2-rc.1**.

```bash
dsh plugin --profile web add github:telagod/dsh-ledger-compact
```

Restart the web profile after install. The bundle patch inserts plugin id `dsh-ledger-compact`.

Local checkout (dev):

```bash
git clone https://github.com/telagod/dsh-ledger-compact.git
dsh plugin --profile web add ./dsh-ledger-compact
```

### Commands

```
/fast-compact
/fast-compact status
```

There is no vision sidecar. `/fast-compact vision …` was removed.

### Dense PNG

Off by default. Even with “allow dense PNG” checked, a PNG is attached only when the main model's `inputModalities` **explicitly includes `image`**. Models are not guessed by name.

Ingress excerpt contract:

```
[Snapcompact: N tokens → excerpt]
first 16 lines
… (K lines elided; see image if attached. To inspect or edit exact bytes, re-read with offset/limit) …
last 8 lines
```

Default threshold is 3000 tokens. A PNG is attached only if it saves at least 15% versus the original. If `tokenMeter` is missing, ingress is skipped so the plugin never `replace`s without writing `compaction/prune`.

### Layout

- `lib/ingress.js` — ingress shaping (current unsent `tool_result` only)
- `lib/vision.js` — dense PNG gated by `inputModalities` + settings
- `lib/excerpt.js` / `lib/fold.js` / `lib/snapfont.js` — excerpt, mechanical card, PNG
- `lib/hook.js` — mechanical `summarize` hook on the existing compaction engine
- `lib/index.js` — command, settings, pre-step hook
- `lib/client.js` — pressure chip, expandable fold card, settings page

```bash
node --test lib/ledger.test.js
```

---

## 中文

对齐 OMP / pi-zig / pi-moke **入境定形**：大工具结果在进模型前裁成摘录，已经进过前缀的旧消息不回头改。`/fast-compact` 仍是可选的本地机械折页。替换默认压缩默认关闭。

- 入境：空闲步进前裁**当前回合尚未发送**的大 `tool_result`。默认只摘录，不打图、不调模型。
- 输入栏闪电是**上下文压力表**。默认再点一次才折页成机械短卡（可在设置里关掉二次确认）。成功后会话里是一行可展开的折页提示，样式对齐官方压缩行；展开是左侧细轴时间线，不展示模型摘录原文。
- 设置页改动即时写入 Host 文档：入境定形、密图、二次确认、替换默认压缩、入境阈值、密图节省比例。
- **替换默认压缩**（默认关）：`/compact`、自动压缩、溢出恢复都走同一套机械 `summarize` 钩子。不要卸 `@deepseek-ai/dsh-compaction-basic`，本插件只换摘要器，不换引擎。关掉即恢复 LLM checkpoint。

### 安装

需要 **dsh ≥ 0.1.2-rc.1**。

```bash
dsh plugin --profile web add github:telagod/dsh-ledger-compact
```

装完重启 web profile。bundle patch 会插入插件 id `dsh-ledger-compact`。

不要卸 `@deepseek-ai/dsh-compaction-basic`。默认只有 `/fast-compact` 把该 agent 标进 `summarize` 钩子；勾选「替换默认压缩」后，`/compact` 与自动摘要也走机械折页。Web 上 compaction 在 preset isolate 里，host 命令用 `agentPresets.serviceFor(agent, "compaction")` 读该会话的引擎，而不是 `inject: ['compaction']`。

### 命令

```
/fast-compact
/fast-compact status
```

没有 vision sidecar。旧的 `/fast-compact vision …` 已删除。

### 密图

默认关。即使勾选「允许密图」，也只在主模型 `inputModalities` **明确含 `image`** 时才可能贴 PNG。不按模型名字猜。

## License

MIT. Bitmap fonts under `lib/fonts/` are documented in [`lib/fonts/README.md`](lib/fonts/README.md).
