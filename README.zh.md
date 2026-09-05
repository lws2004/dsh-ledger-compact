# dsh-ledger-compact

[English](README.md) · 中文

面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的 **dsh-plugin**。大工具结果在进模型前定形；可选的本地折页也能顶替 DSH 的 LLM `/compact`。

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![dsh-plugin](https://img.shields.io/badge/dsh-plugin-111111)](https://github.com/topics/dsh-plugin)
[![test](https://github.com/telagod/dsh-ledger-compact/actions/workflows/test.yml/badge.svg)](https://github.com/telagod/dsh-ledger-compact/actions/workflows/test.yml)

---

## 为什么要它

长回合会把巨大的 `tool_result` 塞进下一次请求。DSH 自带的 LLM 压缩（`@deepseek-ai/dsh-compaction-basic`）很好，但要多打一次模型，而且往往等压力上来才动。

本插件先做两件更便宜的事，第三件可选：

1. **入境定形** — 空闲步进时，把**尚未发送**的超大工具结果冻成头尾摘录。已经进过前缀的旧消息不回头改。
2. **机械折页** — `/fast-compact` 和输入栏闪电把较旧历史折成一张短账卡，不调模型。
3. **替换默认压缩**（默认关） — 挂在官方引擎的 `summarize` 钩子上，让 `/compact`、自动压缩、溢出恢复也不再调模型。

不要卸 `dsh-compaction-basic`。本插件不换引擎。

## 安装

需要 **dsh ≥ 0.1.2-rc.1**。

```bash
dsh plugin --profile web add github:telagod/dsh-ledger-compact
```

装完重启 web profile。bundle patch 会插入插件 id `dsh-ledger-compact`。

本地开发：

```bash
git clone https://github.com/telagod/dsh-ledger-compact.git
dsh plugin --profile web add ./dsh-ledger-compact
```

## 三层分别干什么

| 层 | 何时 | 调模型 | 改什么 |
| --- | --- | --- | --- |
| 入境定形 | 空闲 `agent/pre-step` | 否 | 只动当前尚未发送的 `tool_result` |
| 闪电 / `/fast-compact` | 你点或你敲 | 否 | 较旧历史 → 机械折页卡 |
| 替换默认压缩 | `/compact`、自动、溢出 | 否 | 仍走官方事务，只换成本地摘要 |
| 官方 `/compact` | DSH 默认路径 | 是 | LLM `<compacted-summary>` checkpoint |

输入栏**闪电**是上下文压力表。默认再点一次才折页（可关）。成功后会话里是一行可展开的提示，样式对齐官方压缩行；展开是左侧细轴时间线，不是模型写的长摘要。

## 设置

打开 **设置 → 快速压缩**。改动即时写入 Host 文档。

| 设置 | 默认 | 含义 |
| --- | --- | --- |
| 入境定形 (`enabled`) | 开 | 下一轮请求前裁当前回合尚未发送的大 `tool_result` |
| 允许密图 (`snapImages`) | 关 | 仅当主模型 `inputModalities` **明确含 `image`**，且图比原文更省时才贴 PNG |
| 折页二次确认 (`confirmFold`) | 开 | 输入栏闪电需再点一次 |
| 替换默认压缩 (`replaceDefault`) | **关** | `/compact`、自动压缩、溢出恢复都走机械摘要 |
| 入境阈值 (`minSnapTokens`) | `3000` | 大约这么多 token 才摘录或贴图。范围 200–200000 |
| 密图节省 (`savingsRatio`) | `0.85` | 摘录 + 估图 token 必须 ≤ 原文的这个比例 |

随时关掉「替换默认压缩」即可恢复 DSH 的 LLM checkpoint。`/fast-compact` 无论开关都走机械折页。

机械折页免费、即时，但只留路径、意图、工具次数和短摘录，语义比官方 checkpoint 粗。不想丢叙事摘要，就保持这项关闭。

## 命令

```
/fast-compact
/fast-compact status
```

没有 vision sidecar。旧的 `/fast-compact vision …` 已删除。

`/compact` 仍是官方命令。替换默认压缩**关**时照旧调模型；**开**时同一条命令经现有引擎走机械折页。

## 入境摘录

默认只出文本：不打图、不调模型。已经是占位符的结果不会再改。`skill`、`context` 工具结果会跳过。没有 `tokenMeter` 时整段入境跳过，避免只 `replace` 却写不出 `compaction/prune`。

```
[Snapcompact: N tokens → excerpt]
前 16 行
… (K lines elided; see image if attached. To inspect or edit exact bytes, re-read with offset/limit) …
后 8 行
```

贴 PNG 必须同时满足：

- 勾了「允许密图」
- 当前路由模型的 `inputModalities` **明确包含 `image`**（绝不按 `gpt-4o` 这类名字猜）
- 摘录 + 估图 token ≤ 原文 × 节省比例（默认至少省 15%）

## 折页卡

纯机械，不调模型。旧的折页占位和 `<compacted-summary>` 会被丢掉，不会套娃。

```
[Snapcompact] Fold ~N tok. Exact file bytes are not stored — re-read with offset/limit if a detail matters.
FILES
- [edit] 路径
- [read] 路径
INTENTS
- 最近的用户目标
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

文件字节不进卡。细节要对，用 `offset` / `limit` 再读一遍。

## 和官方压缩怎么配合

**不要卸** `@deepseek-ai/dsh-compaction-basic`。

- 压力、选段、缩水校验、持久化的 `compaction/*` 事件仍由官方引擎负责。
- 本插件只包一层 `summarize()`。
- `/fast-compact` 只把当前 agent 标进一次 `compactNow()`，其它会话继续走 LLM。
- 「替换默认压缩」是即时设置：勾上后已钩住的引擎都改走机械摘要，关掉或卸载插件即恢复。

Web 上 compaction 在 preset isolate 里。Host 侧用 `agentPresets.serviceFor(agent, "compaction")` 读该会话的引擎，不要 `inject: ['compaction']`。

## 开发

```bash
node --test lib/ledger.test.js
```

| 文件 | 职责 |
| --- | --- |
| `lib/ingress.js` | 当前回合 `tool_result` 定形 |
| `lib/vision.js` | 密图：`inputModalities` + 设置双门 |
| `lib/excerpt.js` / `lib/fold.js` / `lib/snapfont.js` | 摘录、折页卡、点阵 |
| `lib/hook.js` | 机械 `summarize` 钩子 |
| `lib/resolve.js` | 查找 isolate 里的压缩引擎 |
| `lib/index.js` | 命令、设置、pre-step |
| `lib/client.js` | 闪电、折页行、设置页 |

## 许可

MIT。`lib/fonts/` 里的点阵字体见 [`lib/fonts/README.md`](lib/fonts/README.md)。
