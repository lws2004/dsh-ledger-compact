# What the fidelity loop found

`bench/fidelity-bench.mjs` renders real ingress frames, sends them through the same
pipeline the harness uses (pixel-budget resize, then JPEG), and asks the model that
actually reads them questions whose answers are known from the source text. Every call
is cached; results live in `bench/report.md`, raw usage included.

## Method

- **Fixtures**: 4 (numeric dump, access log, test log, CJK log). Every question is
  answerable from the first 39 source lines, so a small variant is never penalised for
  capacity — capacity is reported separately.
- **Questions**: 5 per fixture, split into `value` (read an exact token) and
  `structure` (count, order, presence). Answers are matched with number/letter
  boundaries, so `1050` never satisfies `105`.
- **Axes**: geometry (cell size), layout (columns, ruler density), prompt legend, ink
  colour.
- **Noise floor**: the endpoint is stochastic. One configuration scored 17/20, 16/20 and
  14/20 in three runs of 20 questions. **Effects below ~15% at n=20 are not measurable**;
  `--repeats 3` (60 samples per variant, paired) resolves ~10%.

## Results

| change | evidence | verdict |
| --- | --- | --- |
| Draw inside the request pixel budget (1024x624, 39 rows) | same content: 1–2/10 when the pipeline resized 1024x2046 → 566x1131, 8/10 drawn natively, same ~430-token bill | **shipped** — by far the largest effect measured |
| Pack columns to fill the paid canvas | 761 lines/frame vs 39 at equal accuracy and equal cost (~20x capacity) | **shipped** |
| Source-line ruler on every grid row (`gutterEvery: 1`) | value accuracy 73% → 87% in round 1 (n=20, suggestive), free in tokens and capacity | **shipped** — cheap, harmless, consistent with the dominant error class (reading the wrong line) |
| Prompt legend describing the grid | 14/20 with legend vs 14/20 without, +40 tokens per call | rejected |
| Roomier cells (cellW 10, cellH 20) | 15/20 vs 14/20 control, but 481 vs 761 lines/frame | rejected |
| Single column | 17/20 vs 17/20 control, 39 vs 761 lines/frame | rejected as a default (it is the right shape only when lines are long and few) |
| **Colour** | paired 3-repeat run, 60 samples per variant: grayscale 46/60 vs blue-chrome + blue-digits 44/60 (value accuracy identical at 76%). Round 2's 5-palette spread (12–16/20) is the same noise | **rejected** — no gain, and it adds chroma-subsampling risk on a channel that is currently provider-agnostic |

Colour is not removed from the library: `encodePngPalette` and the per-cell /
per-digit ink options stay, tested and ready, should a future model show a gain.

## The request-image budget is a knob, and the default is the sweet spot

`llm-deepseek` exposes `imagePixelBudget` per catalog model (640000 px by default; `"low"`
means 512x512; the old `imageDetail` is gone). The plugin cannot read it at runtime —
`resolveModelInfo` returns input modalities only — so the canvas is planned from a setting
that must match the deployment.

Raising it was measured, not assumed (n=20 per budget, same layout, same questions):

| budget | canvas | rows/frame | correct | value acc | est tok | $/correct |
| --- | --- | --- | --- | --- | --- | --- |
| **640000 (default)** | 1024x624 | 39 (761 packed) | 14/20 | 67% | 434 | **$0.000191** |
| 1300000 | 1024x1264 | 79 (1561 packed) | 14/20 | 73% | 808 | $0.000370 |
| 2100000 | 1024x2048 | 127 (2541 packed) | 6/20 | 33% | 1043 | $0.001070 |

Twice the budget buys the same accuracy for twice the money, and 2.1M collapses: the
provider projects a large frame onto its own vision grid, so the extra rows are drawn into
resolution nobody reads. **Keep 640000.**

The setting still earns its place, because the failure is asymmetric: if a deployment sets
`imagePixelBudget` to `"low"` (262144 px) while the plugin draws for 640000, the harness
resizes every frame — the exact failure mode measured at 1–2/10.

## The residual ceiling

Even in the shipped configuration roughly **a quarter of exact-value questions are
misread** (76% value accuracy over 60 paired samples). The failures cluster:

- multi-digit values losing or swapping a digit (`48213` → `4823`, `143` → `147`);
- picking a neighbouring row when the question names a field rather than a position
  (`503` → `200`, one row's IP for another's);
- reading-order questions on a 20-column numeric grid.

That is a property of the channel, not of the layout: **an image is a good index and a
bad notary**. The plugin therefore keeps exact bytes out of the image's critical path —
the text excerpt carries the head and tail, the fold card carries files/intents/errors,
and `re-read with offset/limit` recovers any exact byte from the source.

## Rule for the next change

Ship a layout change only when it beats the control by more than the noise floor on a
paired run (`--repeats 3`, both variants in the same run), or when it is free in tokens,
capacity and risk — as the ruler was.
