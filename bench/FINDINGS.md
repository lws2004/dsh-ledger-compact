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
| **A different glyph design** (DejaVu/JetBrains in the same 8x13 box) | paired 3-repeat run, 60 samples per variant: 46/60 vs 46/60 | **rejected** — the encoder reads pixels per glyph, not penmanship |
| **A larger glyph** (X.org 8x16 in the *same* 8x16 cell: +56% ink per character, same 39 rows and token bill) | screening 17/20 vs 14/20, then paired 3-repeat 60 samples per variant: **46/60 vs 46/60** | **rejected** — above the legibility floor, pixels buy capacity, not accuracy |
| **Seven fixes for the residual exact-value class** (row shading, bolder digits, bigger digit box, whitespace grouping, comma grouping, a deeper excerpt window, a trust hint in the prompt) | seven paired runs, 75–150 samples per arm | **rejected** — nothing beat the noise floor; digit grouping was measurably worse |
| **The head/tail excerpt beside the image** (what the plugin actually sends; the bench had only ever measured the image alone) | paired 3-repeat, 75 questions per arm: value accuracy 70% → **91%** (net +12/57, p=0.002), 447 → 1000 tokens | **confirmed and shipped** — it rescues exactly the questions the image cannot answer, and a wider window adds nothing |
| **Mechanical whole-file token totals in the notice** (`tokenDigest`, +50 tokens) | paired 6-repeat, 168 questions per arm: structure accuracy 35% → **78%** (net +23/54, p<0.0001), value unchanged (−1/114, p=1.00) | **shipped** — counting a file is free in text and impossible in a picture |
| **Prefix totals** (`lines 1-10`, `lines 1-20`, +39 tokens) | paired 6-repeat, 168 questions per arm: 142 vs 141, net +1, p=1.00 — but "cases 0-19 PASS count" 0/6 → 6/6 and a role-colliding cjk count 6/6 → 1/6 | **rejected** — token counts are role-blind, and a plausible wrong number is worse than none |
| **Compression ratio as the axis to trade on** (`bench/miss-audit.mjs`, the recorded run re-read at no model cost) | the frame is a fixed bill (~434 tokens) plus a 24-line excerpt, so it does not grow with the file: 6.4x the same content as text for 3001 short lines, 26x for 2000 long ones, **15.5x per correct answer** | **not a trade** — the ratio is set by the input, not by a knob, and every accuracy gain measured came from text, none from pixels |
| **Trading a silent error for a caught one** (same audit) | 53 misses of 336: **52 are well-formed and plausible**, 47 are values that occur verbatim in the file asked about, 51 have the same digit width as the truth; **1** refutes itself | **new axis, and the binding one** — `$/correct` scores a silent confabulation the same as a caught one; a caller cannot |

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

## What moves accuracy is resolution, not canvas size

Isolation run (n=20 each): same fixtures, same questions, same layout, same 8x16 cells.

| variant | what differs | actually sent | token bill | correct | value |
| --- | --- | --- | --- | --- | --- |
| control | — | 1024x624 | 434 | 14/20 | 67% |
| `res-50` | same content, half the linear resolution | 512x312 | 213 | 9/20 | 47% |
| `res-50-up` | downscaled 0.5 then upscaled back — **identical sent size and identical bill to the control** | 1024x624 | 434 | 12/20 | 60% |
| `tall-blank` | the same 39 rows at the same glyph size, on a 2048px canvas | 566x1131 (resized by the pipeline) | 435 | 4/20 | 13% |

`res-50-up` is the decisive row: the provider receives exactly the same dimensions and the
same token bill as the control, but the information was destroyed before the upscale, and
accuracy still drops 14 → 12. **The model reads effective pixels per glyph; image size and
token count are proxies for it, not the cause.**

That yields the three regimes the layout has to respect:

1. **Below the legibility threshold** (~5 px per glyph after every resize), accuracy
   collapses — 47% at half resolution, 13% when a padded canvas is projected back down.
2. **Above it**, extra pixels buy *capacity*, not accuracy: raising the request budget from
   640k to 1.3M px doubled the rows per frame and left accuracy flat.
3. **A residual floor** — roughly a quarter of exact-value questions — that resolution does
   not touch: wrong-row selection and dropped digits, the class the per-row ruler improved
   from 73% to 87%.

## The glyph design does not move accuracy at a fixed size

Four atlases in the same 8x13 cell (X.org 8x13, DejaVu Sans Mono 11, DejaVu Sans Mono Bold
11, JetBrains Mono 11 — the last three rendered by `tools/make-atlas.py`), screening run
n=20, then a paired 3-repeat confirmation for the leader:

| variant | screening | paired (n=60) | value acc | $/correct |
| --- | --- | --- | --- | --- |
| X.org 8x13 (shipped) | 14/20 | **46/60** | 76% | $0.000175 |
| DejaVu Sans Mono Bold 11 | 17/20 | **46/60** | 78% | $0.000175 |
| DejaVu Sans Mono 11 | 16/20 | — | 87% (n=20) | $0.000167 |
| JetBrains Mono 11 | 14/20 | — | 73% (n=20) | $0.000191 |

The screening's +3 answers were noise, exactly as the noise floor predicted. At a fixed
cell size a different glyph design trades shape for ink — the TTF renders carry slightly
less ink in an 8x13 box than the purpose-built terminal bitmap — and lands neutral. This is
the resolution result again from the other side: **the encoder reads pixels per glyph, not
penmanship**. The shipped atlas is therefore unchanged.

## A larger glyph box at the same geometry is neutral too

The other half of the idea: keep the frame identical and give every character more
pixels. Atlases now carry their own box (`FGATLAS1`), `tools/make-atlas.py --cell WxH`
packs any of them, and the renderer centres whatever box the header declares.

| atlas | box | ink / printable glyph | cells/frame at 640k px | capacity | screening |
| --- | --- | --- | --- | --- | --- |
| X.org 8x13 (shipped, in its 8x16 cell) | 8x13 | 15.8 | 4992 | — | 14/20 |
| **X.org 8x16** | 8x16 | **24.6 (+56%)** | **4992** | **±0** | 17/20 |
| X.org 9x15 | 9x15 | 18.7 (+18%) | 4633 | −7% | 10/20 |
| X.org 10x20 | 10x20 | 37.1 (+135%) | 3162 | −37% | not run |

This is not the `cellW 10 / cellH 20` row of the results table: that one widened the *cell*
around the same 8x13 glyph, trading whitespace for glyphs per frame. This one grows the
*glyph* inside the control's own cell, so nothing else moves.

`glyph-8x16` is the clean treatment: the same `1024x624`, the same 39 rows, the same
434-token bill, the same layout — the only change is that a glyph's box grows from 8x13 to
8x16, and the 8x16 face is a heavier design that fills it (+56% ink per character).
Screening put it three answers ahead, 17/20 against the control's 14/20.

The paired 3-repeat confirmation (n=60 each, same run) came out **46/60 vs 46/60**, value
accuracy 34/45 vs 35/45. The other numbers in that run say it better than the verdict
does — the *same* variant, the same images, the same questions, asked three times:

| variant | repeat 0 | repeat 1 | repeat 2 |
| --- | --- | --- | --- |
| control (X.org 8x13) | 14/20 | 15/20 | 17/20 |
| `glyph-8x16` | 17/20 | 13/20 | 16/20 |

That is the whole story of the last three experiments: a "+3" screening lead is the
spread of one unchanged variant. The `glyph-9x15` screening result (−4) sits inside the
same spread, in the other direction, so it is not evidence that a wider box hurts
either.

The resolution law therefore reads the same from above and from below:

1. below ~5 px per glyph accuracy collapses (9/20 at half resolution);
2. above it, extra pixels buy *capacity* — doubling the request budget doubled the rows
   and left accuracy flat;
3. and now: +56% ink per glyph at *identical* capacity buys nothing.

`10x20` (+135% ink, −37% capacity) is the last point on that axis and not worth a run:
it moves further into a plateau that has now been entered from both sides, and pays for
the move with the capacity the plugin exists to buy.

**No atlas ships; the glyph axis is closed.** Design at a fixed box is neutral, size at a
fixed geometry is neutral, and the only lever that moves accuracy is staying above the
legibility floor. The pipeline stays — `tools/make-atlas.py` (any box, any font FreeType
can open, `--show` to eyeball glyphs before spending a call) and the
`parseAsciiAtlas`/`setAsciiAtlas` seam — so the next font question is a bench run
rather than a rewrite.

## The residual exact-value class, measured from both sides

Even in the shipped configuration roughly **a quarter of exact-value questions are
misread** (76% value accuracy over 60 paired samples). The failures cluster: multi-digit
values losing or swapping a digit (`48213` → `4823`, `143` → `147`), picking a
neighbouring row when the question names a field rather than a position (`503` → `200`),
and reading-order questions on a packed numeric grid.

`id-grid` — 1500 near-identical `id=1000074 user=u2 qty=26 unit=$114` rows — was added to
measure that class on its own. Control, six samples per question:

| question | control |
| --- | --- |
| the unit price on the row whose **id is 1000851** (a literal to match) | 6/6 |
| the qty on the row whose **user is u17** (a literal to match) | 5/6 |
| the **id** on the row whose user is u30 (7 digits to transcribe) | **0/6** |
| the **id** two rows below the row whose user is u8 (7 digits, after counting) | **0/6** |
| how many of four named rows have qty above 100 | **0/6** |
| the byte count at the end of the `items/5` line | **0/6** |
| `seed=48213` on the first line (old fixture) | **0/6** |

Matching a literal and reading a short neighbouring field works. Transcribing five or more
digits does not — not at a rate, but as a wall.

### Seven fixes did nothing

Six change the frame, one changes the prompt:

| arm | mechanism | screening (n=25) | paired |
| --- | --- | --- | --- |
| `zebra` | alternate grid-row shading, so a value 120 columns from the ruler still belongs to a visible band | 18 vs 16 | net −7/150 (p=0.26), value −4/114 |
| `digit-bold` | digits from a 1px-thicker copy of the same face | 18 vs 16 | net +3/150, value +5/114 (p=0.36) |
| `digit-big` | digits from the 8x16 face, same cell | 16 vs 16 | — |
| `digit-group` | a space every three digits in 5+ digit runs (`48 213`) | 15 vs 16 | — |
| `digit-comma` | the same chunking with an unambiguous separator (`48,213`, `1,000,074`) | — | 48/75 vs 52/75 — and two questions the control answered 3/3 fell to 0/3 |
| `excerpt-32` | the shipped excerpt with a 32-line head instead of 16 | — | +1/75 (p=1.00) for 13% more tokens |
| `excerpt-hint` | the excerpt plus a line in the prompt saying which channel to trust for exact values | — | +2/75 (p=0.75): structure +3/18, value −1/57 |

The shading survives the wire JPEG untouched (245/236 bands in the encoded image), so the
null result is not a wire artifact. The comma separator was the sharpest test of the
chunking idea — `id=1,000,074` cannot be mistaken for three fields — and it failed on its
own target: `48213` still 0/3, the 7-digit ids still 0/3.

### The excerpt does the work, and 16 lines is already enough

Every variant above is asked *without* the head/tail excerpt the plugin really sends. The
same images and questions, with it:

| configuration | all | value | structure | measured tokens | $/answer |
| --- | --- | --- | --- | --- | --- |
| image only | 52/75 | 40/57 (70%) | 12/18 | 447 | $0.000134 |
| **image + excerpt (shipped)** | **62/75** | **52/57 (91%)** | 10/18 | 1000 | $0.000300 |
| image + a 32-line head | 63/75 | 53/57 (93%) | 10/18 | 1135 | $0.000341 |

The excerpt is worth **+21.1 points of value accuracy** (net +12 of 57, 95% CI [+9.4,
+32.7], p=0.002), and it rescues exactly the questions the image cannot answer: the
`seed=48213` line, the `items/5` byte count and the `items/5` client IP are each 0/3 from
the image and 3/3 with the excerpt. That is the plugin's thesis with a number on it — the
image carries bulk and structure, the text carries exact values — and it is still cheap:
1000 tokens per answer, $0.000300, against $0.001044 for the same content as raw text.

Widening the window buys nothing (+1 of 75, p=1.00) for 13% more tokens, and the questions
that still fail are not failing for lack of text: reading a 7-digit value off a named row
is 0/6 with the excerpt too.

**Verdict: nothing changes.** The rendering search is closed, the shipped 16/8 excerpt
stays, and a question whose answer is a 5+ digit value or the tail field of a dense line
belongs in text — which is what the notice, the fold card and the `offset/limit` re-read
contract already do.

## The enumeration class: count it in text, for free

What survived every rendering fix was the counting: "among cases 0 through 19, how many are
PASS" (2/6 at best), "how many of the first ten requests returned 503" (3/6), and the
questions about the file as a whole, which nothing shaped like a picture can answer at all.

A frame cannot count 2000 lines and neither can an excerpt, but the plugin holds the whole
text and counting it is free. `tokenDigest` puts one line in the notice:

    whole-file totals: 0800×2000 · GET×2000 · HTTP/1.1×2000 · 200×1945 · 503×55 · …

Tokens of 16 characters or fewer appearing at least three times anywhere in the result, top
eight by count — 50 tokens, no model involved.

| configuration | all (n=168) | value (n=114) | structure (n=54) | measured tokens |
| --- | --- | --- | --- | --- |
| image + excerpt | 119/168 (71%) | 100/114 (88%) | 19/54 (35%) | 1047 |
| **image + excerpt + digest** | **141/168 (84%)** | 99/114 (87%) | **42/54 (78%)** | 1097 |

Paired: **+22 of 168, +13.1 points, 95% CI [+6.0, +20.2], p=0.0007**, at +50 tokens. The
three whole-file questions ("how many 503s", "how many 200s", "how many FAILs") go 0/6 →
6/6 each — that is the mechanism, not a sampling result: the answer is in the line. The cjk
range question ("of the first ten batches, how many have queue left 0") also goes 0/6 → 6/6
*without* the digest containing that count; unexplained, and reported as measured.

Two questions lose two samples each (a 7-digit id, and the cases 0–19 count), which is what
the value-class interval is for: **it excludes a value-accuracy loss larger than 7 points**.
The line-numbered excerpt (`excerpt-lines`) measured neutral (+0 of 84, p=1.00) and did not
ship.

### Prefix totals are a wash, and the reason is the interesting part

The obvious follow-up is to report the same totals for the prefix ranges questions are
actually asked about ("how many of the first ten…"). `excerpt-blocks` adds two lines —
`lines 1-10: GET×10 · 0800×10 · HTTP/1.1×10 · 200×9 · 503×1` and the same for 1-20 — built
only from values the whole file repeats, dropping one-off tokens longer than four
characters so a numeric grid adds no line at all. Paired 6-repeat, 168 questions per arm:
**142/168 against 141/168, net +1, p=1.00**, for +39 tokens. It did not ship.

The per-question result is not noise, though, and it is the reason to stop here:

| question | whole-file totals | + prefix totals |
| --- | --- | --- |
| "among cases 0 through 19, how many are PASS" | 0/6 | **6/6** |
| "of the first ten batches, how many have queue left 0" | **6/6** | 1/6 |
| "how many of the first ten requests returned 503" | 3/6 | 3/6 |

The first line of that table is the mechanism working: `lines 1-20: PASS×19 · FAIL×1` *is*
the answer. The second is the mechanism failing, and its failure is predictable in hindsight:
in the cjk fixture the token `0` appears four times in the first ten lines — in the `[0]`
bracket, in "第 0 批", and as the queue field the question is about — so the block line says
`0×4` where the honest answer is `1`. **A token count is role-blind.** The whole-file line
gets away with the same blindness because `0×86` is nowhere near any range answer, so no one
copies it; a prefix count of 4 looks like an answer, and it was copied.

That is the rule this axis ends on: a mechanical digest helps when its numbers *are* the
answer, and hurts when they are merely plausible. Everything past this point would need
role-aware counting — per-field positions, per-column values — which is no longer mechanical
general-purpose text, it is a schema the plugin would have to guess.

## The bill is constant, so there is no ratio to trade

The frame is one 1024x624 image whatever the file weighs, and the excerpt beside it is
capped at 16 head + 8 tail lines. Nothing else in the request scales. So the plugin's bill
is `frame + 24 lines + the answer`, and the same content as text is *every* line:

| fixture | source lines | source bytes | $/answer | same text | advantage | $/correct | advantage |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `seq-3000` | 3001 | 13922 | $0.000163 | $0.001044 | 6.4x | $0.000174 | 6.0x |
| `test-log` | 1500 | 35974 | $0.000236 | $0.002698 | 11.4x | $0.000258 | 10.5x |
| `id-grid` | 1501 | 56706 | $0.000284 | $0.004253 | 15.0x | $0.000710 | 6.0x |
| `cjk-log` | 700 | 58475 | $0.000375 | $0.005540 | 14.8x | $0.000410 | 13.5x |
| `access-log` | 2000 | 190744 | $0.000550 | $0.014306 | 26.0x | $0.000563 | 25.4x |

The ratio rises with the file and the frame does not, so "compression ratio" is a property
of what arrives, not a dial the plugin turns. The dials it does have are all elsewhere, and
the measurements put each of them on one side of the legibility knee or the other:

- **Below the knee, compressing costs accuracy.** Half the linear resolution halves the bill
  and takes value accuracy 14/20 → 9/20. That is the only real point on a ratio/accuracy
  curve, and it is on the wrong side of the knee.
- **Above the knee, spending buys nothing.** Doubling the request budget doubled the rows and
  the bill and left accuracy flat; +56% ink per glyph at identical capacity did the same.
- **Every accuracy gain measured came from text.** The excerpt (+21.1 points of value, +553
  tokens), the digest (+43 points of structure, +50 tokens). The pixel side contributed the
  frame, which bought capacity, and the ruler, which fixed the dominant error class.

The shipped point therefore sits at the knee — the cheapest frame that stays above the
legibility floor — and spends the rest on text, where returns are still positive. There is
no accuracy left to buy by compressing less, and nothing to gain by compressing more.

## What the misses are: a confabulation channel, not a noise channel

`bench/miss-audit.mjs` re-reads the recorded run and asks of every miss whether any cheap
check could have caught it. It costs nothing to run and it changes what the scoreboard means.

Of 336 answers, 53 were wrong. **One** refuted itself — `157` for "how many of the first ten
requests returned 503" is larger than the ten it counts. The other **52 were well-formed,
plausible, and wrong**:

```
wrong value occurs verbatim in the file it was asked about   47 / 53
wrong value has the same digit width as the truth            51 / 53
```

`1001110` came back `1001147`. `261` came back `$268`. `221` came back `234`. `29` came back
`42`. Every one of those is a real value, correctly formatted, from a nearby row — a lossy
codec garbles and announces itself; this channel substitutes and does not. The caller has no
signal, and neither does the model: the answer looks exactly like the 141 that were right.

That is the third axis the tradeoff was missing. Compression was being judged on
`(ratio, accuracy)`, and `$/correct` prices a silent substitution the same as a caught one.
A caller cannot. What matters is `(ratio, accuracy, detectability)`, and the shipped profile
is strong on the first, decent on the second, and near-zero on the third — and the third is
the one that decides whether a wrong answer costs one question or a downstream action.

The plugin can only make an error self-refuting where it computes the truth itself. The
whole-file digest is exactly that, which is why the single detectable miss is a count. Past
that boundary lies per-field, per-column counting — the schema the prefix-totals experiment
showed the plugin must not guess. So detectability has the same ceiling as mechanical text,
and the honest place to raise it is the caller: the re-read contract, whose errors are the
source's own.

## Rule for the next change

Ship a layout change only when it beats the control by more than the noise floor on a
paired run (`--repeats 3`, both variants in the same run), or when it is free in tokens,
capacity and risk — as the ruler was.

And score detectability alongside accuracy before shipping either: never trade an error a
caller can catch for one they cannot, at equal accuracy. `node bench/miss-audit.mjs` reports
both from the recorded run, for free.
