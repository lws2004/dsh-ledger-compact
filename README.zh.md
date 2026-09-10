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

1. **入境定形** — 空闲步进时，把**尚未发送**的超大工具结果冻成头尾摘录。只看刚结束的那一步：它的第一次请求正是眼下要发的这一次，所以重写永远不会让已缓存的前缀失效。
2. **机械折页** — `/fast-compact` 和输入栏闪电把较旧历史折成一张短账卡，不调模型。
3. **替换默认压缩**（默认关） — 挂在官方引擎的 `summarize` 钩子上，让 `/compact`、自动压缩、溢出恢复也不再调模型。

不要卸 `dsh-compaction-basic`。本插件不换引擎。

## 安装

需要 **dsh ≥ 0.1.2-rc.1**；已在 **0.1.5-rc.1** 上验证。这一区间的两次 API 改名都已兼容：`session.events` → `session.eventAt(seq)`，以及定位替换键 `start/end` → `startSeq/endSeq`。

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

打开 **设置 → 快速压缩**。改动即时写入 Host 文档。页面分三个 tab：

- **入境** —— 下面四项定形设置。
- **折页** —— 折页二次确认、替换默认压缩，以及一张折页卡的实时预览。
- **诊断** —— 插件版本、这台 DSH 实际暴露的会话事件读取方式、入境计数与最近失败、压缩引擎钩住数量（以及哪些引擎会静默退回模型调用）。

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

`/fast-compact status` 还会报健康状态：入境定形的 shaped/snapped/节省计数、持续失败时的最后一条错误，以及缺少 `summarize` 钩子的压缩引擎（开着替换默认压缩时，那种引擎会静默改调模型）。

## 入境摘录

默认只出文本：不打图、不调模型。候选只有**当前回合紧邻上一步**的结果；其余已经发送过的节点保持逐字节不变——这正是前缀缓存不被破坏的原因。已经是占位符的结果不会再改。`skill`、`context` 工具结果会跳过。没有 `tokenMeter` 时整段入境跳过，避免只 `replace` 却写不出 `compaction/prune`。

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
- 图中真正画进去的文本，按文本计价必须**比这张图更贵**（默认 图 ≤ 文本 × 0.85）。一行三个字符、三千行的输出，贴图反而亏，这时只出摘录

### 密图排版

画布按面积计价（512px tile 带，画满和画空一个价），所以排版只干一件事：**把有信息的格子塞满已经付过钱的画布**。

- **画布对齐 tile 边界**：openai 系画布是 `1024×2048` 而不是 `1024×1540`。同样的 1445 token，正文从 70 行变 93 行（+33%）——旧高度里有 4 个像素跨进了下一条付费带。
- **短行自动分栏**：按行长分布试 1–24 栏，取占用率最高者；候选只要换行率超过 2% 就淘汰，所以「一行一格」的承诺在能守住时一定守住，只有整行宽过画布的内容才在格内折行。`seq 1 3000` 会排成 20 栏数字阵，同价从 93 行变 1860 行。
- **行号尺**：源行数 ≥ 50 时左侧留 gutter，每 5 个网格行标一次**源行号**，并画一条淡竖线。图因此是可寻址的：模型看到异常行，可以直接 `offset/limit` 回读精确字节，而不是只能猜。
- **灰阶层级**：正文 `16`、栏线 `205`、行号 `150`、纸面 `245`。层级不花 token，花的是已经付过钱的像素。
- 摘录提示会写明版面：`[Snapcompact: 3480 tokens → 1024x624 PNG ~434 tokens · 20 cols · line ruler]`，模型不必猜自己看的是一栏还是二十栏。

### 计费与保真（deepseek-flash）

密图按**输入 token** 计价，用官方价目（api-docs.deepseek.com，2026-09-10）：

| | 高峰 | 低谷 |
| --- | --- | --- |
| 输入 缓存命中 /1M | $0.006 | $0.003 |
| 输入 缓存未命中 /1M | $0.30 | $0.15 |
| 输出 /1M | $1.20 | $0.60 |

下面两条是实测出来的，不是估的：

- **画布必须画在请求像素预算内**。请求管线会把超过 `640000` px 的图缩到预算内再发，provider 按缩后的图计费、也按缩后的图识读。同一份内容实测：画 `1024x2046`（被缩到 `566x1131`）10 道题只对 1–2 道；直接画 `1024x624`（不触发缩放）对 8 道。所以 deepseek 路由的几何是 `8on16-budget 1024x624`（39 行）。
- **图片 token 曲线也是实测的**：`≈ clamp(70 + 5.7e-4·px, 213, 1043)`（先缩到预算再算）。官方文档那个「单图封顶 384 token」的算法对不上线上 `usage`，插件按实测曲线估，误差约 3%（估算 434 vs 实测 446，差值是提示文本本身）。
- 满帧约 **$0.00013**；同样内容按文本计价是 $0.001–$0.014，**便宜 10–100 倍**。
- 保真度有上限：即使不缩放，坐标、IP、状态码这类**精确值**仍有约 20% 会读错。所以精确字节继续留在文本摘录与可回读来源里，图片只负责体量与结构——这正是 `re-read with offset/limit` 契约存在的理由。

`bench/report.md` 是原始结果（fixtures × 版面变体 × 可判定问答，答案与 `usage` 全部缓存）；`bench/FINDINGS.md` 是方法与逐项裁决。要点：

- **必须画在请求像素预算内**：同一内容被管线缩放后只对 1–2/10，原生绘制对 8/10，而两者的账单一样。
- **分栏**：准确率不变的前提下，每帧多装约 20 倍行数。
- **每行都标源行号**：值类准确率 73% → 87%，且不花 token、不占容量（错误类型主要是"读错行"，这条正对着它）。
- **颜色试过并否掉了**：4 套配色、配对 3 次重复共 60 样本，灰度 46/60 vs 彩色 44/60，值类准确率完全相同。编码器（`encodePngPalette`）与逐格/逐位墨色能力保留在库里备用，但不默认开。
- **提示图例 / 更宽的格子 / 单栏默认**：都测了，都没赚回成本。
- **正确率的主因是"每字符有效像素"，不是画布大小、也不是 token 数**：把同内容缩到一半分辨率，14/20 → 9/20；先缩一半再放大回原尺寸（尺寸与账单和对照一模一样），仍掉到 12/20。所以"画得更大"只买容量，不买准确率；一旦有效分辨率掉到阈值以下（约每字符 5px），准确率立刻崩。
- **传图像素预算别调大**：`llm-deepseek` 的 `imagePixelBudget`（默认 640000）确实可配，但实测 1.3M 同准确率、价格翻倍；2.1M 掉到 33%。插件里的「传图像素预算」设置只在部署改了 DSH 那个值时才需要跟着改——尤其是调成 `"low"` 时必须改，否则画大的帧会被缩，正是那套 1–2/10 的失效模式。
- **天花板**：最优配置下精确值问题仍有约四分之一会读错。图是索引，不是公证人 —— 精确字节走文本摘录、折页卡与 `offset/limit` 回读。

## 折页卡

纯机械，不调模型。旧折页文本不会被套娃，但也不会丢：从上一张 `[Snapcompact]` 卡里解析出的文件、意图和错误会延续到新卡（文件只占用新跨度没用完的额度）。

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

# 版面经济性：每个 fixture 的文本/图像 token、承载行数、画布占用率。纯算术，不调模型
node bench/layout-bench.mjs

# 保真度 + 真实计费：fixtures × 版面变体 × 可判定问答，结果与 usage 缓存进 bench/.cache
node bench/fidelity-bench.mjs

# 有一个用例绑定真实 dsh-session，指向已安装包才会运行
DSH_SESSION_MODULE="$DSH/node_modules/@deepseek-ai/dsh-session/lib/index.js" \
DSH_SCHEMASTER_MODULE="$DSH/node_modules/@deepseek-ai/schemastery/lib/index.mjs" \
  node --test lib/ledger.test.js
```

| 文件 | 职责 |
| --- | --- |
| `lib/ctx.js` | 可选服务查找 + 跨版本 session 事件读取 |
| `lib/schema-envelope.js` | 规范 Schemastery `{uid, refs}` 设置信封 |
| `lib/ingress.js` | 上一步 `tool_result` 定形（结构上缓存安全） |
| `lib/vision.js` | 密图：`inputModalities` + 设置双门 |
| `lib/excerpt.js` / `lib/fold.js` / `lib/snapfont.js` | 摘录、折页卡、点阵与网格光栅化 |
| `lib/layout.js` | 密图排版：选栏、格内折行、行号尺、占用率 |
| `lib/hook.js` | 机械 `summarize` 钩子 |
| `lib/resolve.js` | 查找 isolate 里的压缩引擎 |
| `lib/index.js` | 命令、设置、pre-step |
| `lib/client.js` | 闪电、折页行、设置页 |

## 许可

MIT。`lib/fonts/` 里的点阵字体见 [`lib/fonts/README.md`](lib/fonts/README.md)。
