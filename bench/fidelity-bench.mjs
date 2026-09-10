#!/usr/bin/env node
/**
 * Fidelity + cost bench for the dense image.
 *
 * Fixtures x layout variants x questions with known answers, asked against the model
 * that actually reads the frames (default: deepseek-flash). Two things are measured,
 * and neither is assumed:
 *
 *  - **fidelity** — did the model answer correctly from the picture;
 *  - **cost** — the provider's own \`usage.prompt_tokens\`, priced with the published
 *    DeepSeek table, next to the plugin's estimate for the same frame.
 *
 * The bench reproduces the request pipeline: a frame larger than the model's image
 * pixel budget is box-filtered down before it is sent, exactly as the DeepSeek
 * adapter does, because that resize decides both the resolution the model reads and
 * the tokens the provider bills.
 *
 *   node bench/fidelity-bench.mjs                    # full matrix
 *   node bench/fidelity-bench.mjs --max-calls 4      # smoke
 *   node bench/fidelity-bench.mjs --variants auto-22,native-h16
 */

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { planGrid } from "../lib/layout.js";
import { deepseekImageTokens, maxRows, parseAsciiAtlas, previewSize, raster, rasterGrid, resolveShape, setAsciiAtlas } from "../lib/snapfont.js";
import { encodePngGray, encodePngPalette } from "../lib/png.js";
import { formatUsd, priceFor, requestPreviewSize, usdFor } from "../lib/pricing.js";
import { estTokensUtf8 } from "../lib/tokens.js";
import { snapExcerpt } from "../lib/excerpt.js";

const here = dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = join(here, ".cache", "fidelity.json");
const REPORT_PATH = join(here, "report.md");
const CREDENTIALS = join(process.env.DSH_HOME ?? "/home/telagod/.dsh", ".credentials.yaml");

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf("--" + name);
  return i === -1 ? fallback : argv[i + 1];
};
const MODEL = flag("model", "deepseek-flash");
const ENDPOINT = flag("endpoint", "https://api.deepseek.com/chat/completions");
const KEY_REF = flag("key-ref", "DEEPSEEK_API_KEY");
const ONLY_VARIANTS = flag("variants", "") ? flag("variants", "").split(",") : null;
const ONLY_FIXTURES = flag("fixtures", "") ? flag("fixtures", "").split(",") : null;
const MAX_CALLS = Number(flag("max-calls", "0")) || Infinity;
/** The provider receives what the harness normalizes: JPEG by default, like production. */
const WIRE = flag("wire", "jpeg");
/** Repeats per question. The endpoint is stochastic, so one sample per question cannot
 *  resolve effects below ~15%; repeats buy the power to tell a real gain from noise. */
const REPEATS = Math.max(1, Number(flag("repeats", "1")) || 1);
/** Request-image pixel budget to emulate. Must match the deployment's `imagePixelBudget`
 *  for the llm-deepseek model catalog entry, or the harness will resize the frame. */
const BUDGET = Number(flag("budget", "640000")) || 640000;
/** Write each variant's frame to bench/.cache/dump instead of asking the model. */
const DUMP = argv.includes("--dump");

function credential(ref) {
  const text = readFileSync(CREDENTIALS, "utf8");
  const m = text.match(new RegExp("^\\s*" + ref + ":\\s*(\\S+)\\s*$", "m"));
  if (!m) throw new Error("credential " + ref + " not found in " + CREDENTIALS);
  return m[1].replace(/["']/g, "");
}

// ---------------------------------------------------------------- fixtures

/**
 * Every question is answerable from the first 39 source lines, so the smallest
 * variant is never penalised for capacity — capacity is reported separately.
 * \`kind\` splits exact-value reading from structural reading.
 */
function fixtures() {
  const out = [];
  const SEED = 48213;
  out.push({
    name: "seq-3000",
    lines: ["SNAPSHOT seed=" + SEED + " rows=3000", ...Array.from({ length: 3000 }, (_, i) => String(i + 1))],
    qa: [
      { kind: "value", q: "What is the value of seed= on the first line?", a: String(SEED) },
      { kind: "structure", q: "Reading left to right then top to bottom, which number comes immediately after 7?", a: "8" },
      { kind: "value", q: "In the same reading order, which number comes immediately after 19?", a: "20" },
      { kind: "value", q: "In the same reading order, which number comes immediately before 30?", a: "29" },
      { kind: "structure", q: "Does the image contain the word SNAPSHOT? Answer yes or no.", a: "yes" }
    ]
  });

  out.push({
    name: "access-log",
    lines: Array.from({ length: 2000 }, (_, i) =>
      "10.0." + (i % 256) + "." + ((i * 7) % 256) + ' - - [10/Sep/2026:19:00:00 +0800] "GET /api/v1/items/' + i +
      "?page=" + (i % 50) + ' HTTP/1.1" ' + (i % 37 === 0 ? 503 : 200) + " " + (100 + (i % 900))),
    qa: [
      { kind: "value", q: "What HTTP status does the request for /api/v1/items/37 have?", a: "503" },
      { kind: "value", q: "What is the client IP of the request for /api/v1/items/5?", a: "10.0.5.35" },
      { kind: "value", q: "What HTTP status does the request for /api/v1/items/0 have?", a: "503" },
      { kind: "value", q: "At the end of the request line for /api/v1/items/5 there is a byte count. What is it?", a: "105" },
      { kind: "structure", q: "How many of the first ten requests (items/0 through items/9) returned status 503?", a: "1" }
    ]
  });

  out.push({
    name: "test-log",
    lines: Array.from({ length: 1500 }, (_, i) => (i % 97 === 11 ? "FAIL" : "PASS") + " case-" + i + " dur=" + ((i * 13) % 400) + "ms"),
    qa: [
      { kind: "value", q: "Which case is the first FAIL and how long did it take? Answer like: case-11 dur=143ms", a: "case-11 dur=143ms" },
      { kind: "value", q: "How many milliseconds did case-4 take?", a: "52ms" },
      { kind: "value", q: "How many milliseconds did case-12 take?", a: "156ms" },
      { kind: "value", q: "How many milliseconds did case-10 take?", a: "130ms" },
      { kind: "structure", q: "Among cases 0 through 19, how many are PASS?", a: "19" }
    ]
  });

  out.push({
    name: "cjk-log",
    lines: Array.from({ length: 700 }, (_, i) => "[" + (i % 24) + "] 处理完成：第 " + i + " 批日志已归档，耗时 " + ((i * 7) % 997) + " 毫秒，队列剩余 " + (i % 13)),
    qa: [
      { kind: "value", q: "第 5 批日志耗时多少毫秒？只回答数字。", a: "35" },
      { kind: "value", q: "第 6 批日志处理完后队列剩余多少？只回答数字。", a: "6" },
      { kind: "value", q: "第 12 批日志耗时多少毫秒？只回答数字。", a: "84" },
      { kind: "value", q: "第 7 批日志行首方括号里的数字是多少？只回答数字。", a: "7" },
      { kind: "structure", q: "前 10 批里有几批的队列剩余是 0？只回答数字。", a: "1" }
    ]
  });
  return out;
}

// ---------------------------------------------------------------- layout variants

const BASE = resolveShape(MODEL);

function layoutNote(plan, framed) {
  if (!framed) return "";
  return (framed.columns > 1 ? " · " + framed.columns + " cols" : "") + (framed.gutterCols > 0 ? " · line ruler" : "");
}

/** Budget in force for the variant currently being rendered. */
let activeBudget = BUDGET;

/** The frame the request pipeline will not have to resize. */
function budgetShape(cellW, cellH) {
  const budget = activeBudget;
  const cols = Math.max(8, Math.floor(Math.min(BASE.frameW, 1024) / cellW));
  const frameW = cols * cellW;
  const frameH = Math.floor(Math.floor(budget / frameW) / cellH) * cellH;
  return { ...BASE, name: "budget", cellW, cellH, cols, frameW, frameH };
}

function packed(cellW, cellH, layout = {}) {
  return (text, lines) => {
    const shape = budgetShape(cellW, cellH);
    const plan = planGrid(lines, shape, layout);
    const framed = rasterGrid(plan, shape, maxRows(estTokensUtf8(text), 0, shape));
    return { framed, shape, note: layoutNote(plan, framed) };
  };
}

const LEGEND = "Image legend: the picture is a text grid; vertical rules separate columns; the left gutter prints the SOURCE line number every few rows; reading order is left to right, then top to bottom.";

/**
 * Palette indices written into the pixel buffer; the encoder maps them to RGB.
 * A palette frame costs the same bytes per pixel as the gray one.
 */
const PAL = { paper: 0, body: 1, rule: 2, ruler: 3, digit: 4, alert: 5 };
const ALERT_LINE = /FAIL|ERROR|FATAL|503/;

const PALETTES = {
  rule: [[252, 252, 250], [16, 18, 22], [176, 199, 240], [52, 104, 206], [16, 18, 22], [188, 28, 38]],
  digit: [[252, 252, 250], [16, 18, 22], [214, 214, 214], [140, 140, 140], [8, 58, 190], [188, 28, 38]],
  both: [[252, 252, 250], [16, 18, 22], [176, 199, 240], [52, 104, 206], [8, 58, 190], [188, 28, 38]],
  alert: [[252, 252, 250], [16, 18, 22], [214, 214, 214], [140, 140, 140], [8, 58, 190], [196, 22, 32]]
};

function colored(cellW, cellH, palette, options = {}) {
  return (text, lines) => {
    const shape = budgetShape(cellW, cellH);
    const plan = planGrid(lines, shape, { gutterEvery: 1 });
    const framed = rasterGrid(plan, shape, maxRows(estTokensUtf8(text), 0, shape), {
      paper: PAL.paper,
      rule: PAL.rule,
      gutterInk: PAL.ruler,
      digitInk: options.digits ? PAL.digit : undefined,
      cellInk: (cell) => (options.alerts && ALERT_LINE.test(cell.join(" ")) ? PAL.alert : PAL.body)
    });
    return { framed, shape, note: layoutNote(plan, framed), palette };
  };
}

/**
 * Swap the ASCII atlas (tools/make-atlas.py). The cell defaults to the atlas's own
 * box; pass one explicitly to test a glyph box that does not fill the cell.
 */
function atlasVariant(file, cellW, cellH) {
  const atlas = parseAsciiAtlas(readFileSync(join(here, "atlas", file)));
  if (!atlas.w) throw new Error("unreadable atlas: " + file);
  const w = cellW ?? atlas.w;
  const h = cellH ?? atlas.h;
  return (text, lines) => {
    setAsciiAtlas(atlas);
    try {
      return packed(w, h, { gutterEvery: 1 })(text, lines);
    } finally {
      setAsciiAtlas(null);
    }
  };
}

/** Post-process a rendered frame: same content, different effective resolution. */
function rescaled(factor, upscaleBack = false) {
  return (text, lines) => {
    const base = packed(8, 16, { gutterEvery: 1 })(text, lines);
    const w = Math.max(1, Math.round(base.framed.w * factor));
    const h = Math.max(1, Math.round(base.framed.h * factor));
    let pixels = resizeGray(base.framed.pixels, base.framed.w, base.framed.h, w, h);
    let outW = w;
    let outH = h;
    if (upscaleBack) {
      pixels = resizeGray(pixels, w, h, base.framed.w, base.framed.h);
      outW = base.framed.w;
      outH = base.framed.h;
    }
    return { framed: { ...base.framed, pixels, w: outW, h: outH }, shape: base.shape, note: base.note + " · x" + factor };
  };
}

/** Same rows, same glyph size, but a canvas big enough to trip the provider's projection. */
function padded(frameW, frameH) {
  return (text, lines) => {
    const base = packed(8, 16, { gutterEvery: 1 })(text, lines);
    if (base.framed.w > frameW || base.framed.h > frameH) return base;
    const pixels = new Uint8Array(frameW * frameH).fill(245);
    for (let y = 0; y < base.framed.h; y++) {
      pixels.set(base.framed.pixels.subarray(y * base.framed.w, (y + 1) * base.framed.w), y * frameW);
    }
    return { framed: { ...base.framed, pixels, w: frameW, h: frameH }, shape: base.shape, note: base.note + " · padded" };
  };
}

/** Each variant turns one axis: geometry, layout, prompt legend, ink colour, or budget. */
const VARIANTS = {
  ruler1: { build: packed(8, 16, { gutterEvery: 1 }), legend: false },
  "color-rule": { build: colored(8, 16, PALETTES.rule, {}), legend: false },
  "color-digit": { build: colored(8, 16, PALETTES.digit, { digits: true }), legend: false },
  "color-both": { build: colored(8, 16, PALETTES.both, { digits: true }), legend: false },
  "color-alert": { build: colored(8, 16, PALETTES.alert, { digits: true, alerts: true }), legend: false },
  /** The same renderer at a larger request-image budget (set --budget to match). */
  "budget-1.3m": { build: packed(8, 16, { gutterEvery: 1 }), legend: false, budget: 1300000 },
  "budget-2.1m": { build: packed(8, 16, { gutterEvery: 1 }), legend: false, budget: 2100000 },
  /** Same 8x13 cell, glyphs rendered from an outline font instead of X.org 8x13. */
  "font-dejavu": { build: atlasVariant("dejavu-mono-11.bin", 8, 16), legend: false },
  "font-dejavu-bold": { build: atlasVariant("dejavu-mono-bold-11.bin", 8, 16), legend: false },
  "font-jetbrains": { build: atlasVariant("jetbrains-mono-11.bin", 8, 16), legend: false },
  /**
   * Larger glyph boxes. glyph-8x16 keeps the control's 8x16 cell — the only change
   * is 24.6 ink pixels per printable glyph against 15.8 — so it is free in tokens,
   * capacity and layout. glyph-8x16-lead buys a pixel of leading for 13% of the
   * rows; glyph-9x15 is the wider box at -7% capacity.
   */
  "glyph-8x16": { build: atlasVariant("xorg-8x16.bin"), legend: false },
  "glyph-8x16-lead": { build: atlasVariant("xorg-8x16.bin", 8, 18), legend: false },
  "glyph-9x15": { build: atlasVariant("xorg-9x15.bin"), legend: false },
  /** Resolution isolation: identical content and layout, fewer pixels per glyph. */
  "res-50": { build: rescaled(0.5), legend: false },
  "res-50-up": { build: rescaled(0.5, true), legend: false },
  /** Canvas isolation: identical rows at identical glyph size, mostly empty paper. */
  "tall-blank": { build: padded(1024, 2048), legend: false }
};

// ---------------------------------------------------------------- request pipeline emulation

/** Box-filter a grayscale frame down to the request pixel budget, like the adapter does. */
function resizeGray(pixels, w, h, nw, nh) {
  if (nw === w && nh === h) return pixels;
  const out = new Uint8Array(nw * nh);
  for (let y = 0; y < nh; y++) {
    const y0 = Math.floor((y * h) / nh);
    const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * h) / nh));
    for (let x = 0; x < nw; x++) {
      const x0 = Math.floor((x * w) / nw);
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * w) / nw));
      let sum = 0;
      let n = 0;
      for (let yy = y0; yy < y1; yy++) {
        const row = yy * w;
        for (let xx = x0; xx < x1; xx++) { sum += pixels[row + xx]; n += 1; }
      }
      out[y * nw + x] = Math.round(sum / n);
    }
  }
  return out;
}

// ---------------------------------------------------------------- wire

/** Same projection the adapter applies, at the budget under test. */
function previewFor(w, h) {
  const px = w * h;
  if (px <= activeBudget) return { width: w, height: h, resized: false, scale: 1 };
  const scale = Math.sqrt(activeBudget / px);
  const width = Math.max(1, Math.round(w * scale));
  const height = Math.max(1, Math.round(h * scale));
  return { width, height, resized: true, scale };
}

const WIRE_DIR = join(here, ".cache", "wire");

/** Normalize the frame the way the harness does before dispatch (JPEG, 4:2:0). */
function toWire(png, hash) {
  if (WIRE !== "jpeg") return { data: png, mediaType: "image/png" };
  if (!existsSync(WIRE_DIR)) mkdirSync(WIRE_DIR, { recursive: true });
  const dst = join(WIRE_DIR, hash + ".jpg");
  if (!existsSync(dst)) {
    const src = join(WIRE_DIR, hash + ".png");
    writeFileSync(src, png);
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", src, "-pix_fmt", "yuvj420p", "-q:v", "3", dst]);
  }
  return { data: readFileSync(dst), mediaType: "image/jpeg" };
}

// ---------------------------------------------------------------- model

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function askOnce(key, dataUri, prompt) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + key },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: dataUri } }
      ]}],
      max_tokens: 800,
      thinking: { type: "disabled" },
      stream: false
    })
  });
  const text = await res.text();
  if (res.status !== 200) return { error: res.status + " " + text.slice(0, 160) };
  const json = JSON.parse(text);
  return {
    answer: json.choices?.[0]?.message?.content ?? "",
    finish: json.choices?.[0]?.finish_reason ?? "",
    promptTokens: json.usage?.prompt_tokens ?? null,
    completionTokens: json.usage?.completion_tokens ?? null
  };
}

async function ask(key, cache, keyOf, dataUri, prompt) {
  const hit = cache[keyOf];
  if (hit) return { ...hit, cached: true };
  for (let attempt = 0; attempt < 3; attempt++) {
    const out = await askOnce(key, dataUri, prompt);
    if (!out.error) { cache[keyOf] = out; return { ...out, cached: false }; }
    if (!/^(429|5\\d\\d)/.test(out.error)) return out;
    await sleep(2000 * (attempt + 1));
  }
  return { error: "retries exhausted" };
}

// ---------------------------------------------------------------- main

const normalize = (s) => String(s ?? "").replace(/\\s+/g, "").toLowerCase();

/** Containment with number/letter boundaries, so "1050" never satisfies "105". */
function matches(answer, expected) {
  const a = normalize(answer);
  const e = normalize(expected);
  if (!a || !e) return false;
  if (a === e) return true;
  const esc = e.replace(/[.*+?^$`{}()|[\]\\]/g, "\\$&");
  if (new RegExp("(^|[^0-9a-z])" + esc + "($|[^0-9a-z])").test(a)) return true;
  const num = e.match(/^(\\d+)/);
  if (num && new RegExp("(^|[^0-9])" + num[1] + "($|[^0-9])").test(a)) return true;
  return false;
}

const cacheDir = dirname(CACHE_PATH);
if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
const cache = existsSync(CACHE_PATH) ? JSON.parse(readFileSync(CACHE_PATH, "utf8")) : {};
const key = credential(KEY_REF);
const family = BASE.family;
const price = priceFor(MODEL);

const all = fixtures().filter((f) => !ONLY_FIXTURES || ONLY_FIXTURES.includes(f.name));
const variants = Object.keys(VARIANTS).filter((v) => !ONLY_VARIANTS || ONLY_VARIANTS.includes(v));
const results = [];
let calls = 0;

outer:
for (const fixture of all) {
  const text = fixture.lines.join("\n");
  const textTok = estTokensUtf8(text);
  for (const variant of variants) {
    const spec = VARIANTS[variant];
    activeBudget = spec.budget ?? BUDGET;
    const { framed, note, palette } = spec.build(text, fixture.lines);
    if (!framed || calls >= MAX_CALLS) continue;
    if (DUMP) {
      const dir = join(here, ".cache", "dump");
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      const png = palette ? encodePngPalette(framed.pixels, framed.w, framed.h, palette)
        : encodePngGray(framed.pixels, framed.w, framed.h);
      const file = join(dir, variant + "-" + fixture.name + ".png");
      writeFileSync(file, png);
      let dark = 0;
      const paper = palette ? -1 : 128;
      for (let i = 0; i < framed.pixels.length; i++) if (framed.pixels[i] < paper) dark += 1;
      console.log(variant.padEnd(18) + fixture.name.padEnd(12) + framed.w + "x" + framed.h +
        "  rows " + framed.rows + "  lines " + (framed.sourceLines ?? "-") +
        "  ink " + (100 * dark / framed.pixels.length).toFixed(2) + "%  " + file);
      continue;
    }
    const preview = previewFor(framed.w, framed.h);
    const pixels = resizeGray(framed.pixels, framed.w, framed.h, preview.width, preview.height);
    // Guard: a frame that lost its ink (wrong palette, empty layout) would be measured
    // as a fidelity failure instead of as the bug it is.
    const levels = new Set();
    for (let i = 0; i < pixels.length; i += 7) levels.add(pixels[i]);
    if (levels.size < 3) throw new Error("degenerate frame for " + variant + "/" + fixture.name + ": " + levels.size + " ink level(s)");
    const png = palette
      ? encodePngPalette(pixels, preview.width, preview.height, palette)
      : encodePngGray(pixels, preview.width, preview.height);
    const wire = toWire(png, createHash("sha256").update(png).digest("hex").slice(0, 16));
    const dataUri = "data:" + wire.mediaType + ";base64," + Buffer.from(wire.data).toString("base64");
    // Price what will actually be sent, at the budget under test.
    const estTok = deepseekImageTokens(preview.width, preview.height);
    const notice = "[Snapcompact: " + textTok + " tokens → " + framed.w + "x" + framed.h + " PNG" +
      (preview.resized ? " (preview " + preview.width + "x" + preview.height + ")" : "") +
      " ~" + estTok + " tokens" + note + "]";
    const carried = framed.sourceLines ?? (framed.gridRows !== undefined ? framed.gridRows * (framed.columns ?? 1) : framed.rows);
    for (const qa of fixture.qa) {
      if (calls >= MAX_CALLS) break outer;
      const prompt = (spec.legend ? LEGEND + "\n" : "") + notice + "\nQuestion: " + qa.q + "\nAnswer with only the answer.";
      for (let repeat = 0; repeat < REPEATS; repeat++) {
        // Repeat 0 keeps the plain key, so earlier single-sample runs are reused as-is.
        const parts = [MODEL, variant, fixture.name, qa.q, dataUri];
        if (repeat > 0) parts.push("r" + repeat);
        const hash = createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 24);
        const out = await ask(key, cache, hash, dataUri, prompt);
        if (!out.error) calls += 1;
        const usd = usdFor(out.promptTokens, "cacheMiss", MODEL);
        results.push({
          fixture: fixture.name, variant, kind: qa.kind ?? "value", qa: qa.q, expected: qa.a, repeat,
          answer: out.answer ?? "", error: out.error ?? "",
          correct: !out.error && matches(out.answer, qa.a),
          finish: out.finish ?? "",
          drawn: framed.w + "x" + framed.h, sent: preview.width + "x" + preview.height,
          carried, estTok, measured: out.promptTokens ?? null, usd: usd ?? null,
          textUsd: usdFor(textTok, "cacheMiss", MODEL), cached: out.cached === true
        });
      }
      if (calls >= MAX_CALLS) break outer;
    }
  }
}

writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 1));
// Raw rows for the run, so a later analysis can split by repeat, fixture or question
// kind without re-asking (the console table only aggregates).
writeFileSync(join(here, ".cache", "last-results.json"), JSON.stringify(results));

const byVariant = new Map();
for (const r of results) {
  const row = byVariant.get(r.variant) ?? { variant: r.variant, n: 0, correct: 0, cached: 0, measuredSum: 0, measuredN: 0, usd: 0, est: 0, drawn: r.drawn, sent: r.sent, carried: r.carried, textUsd: r.textUsd, truncated: 0, kinds: {} };
  row.n += 1;
  if (r.finish === "length") row.truncated += 1;
  const bucket = row.kinds[r.kind] ?? (row.kinds[r.kind] = { n: 0, correct: 0 });
  bucket.n += 1;
  if (r.correct) bucket.correct += 1;
  if (r.correct) row.correct += 1;
  if (r.cached) row.cached += 1;
  if (r.measured) { row.measuredSum += r.measured; row.measuredN += 1; }
  row.usd += r.usd ?? 0;
  row.est = r.estTok;
  byVariant.set(r.variant, row);
}

console.log("model: " + MODEL + " · fixtures: " + all.length + " · variants: " + variants.length + " · answers: " + results.length);
console.table([...byVariant.values()].map((r) => ({
  variant: r.variant,
  drawn: r.drawn,
  sent: r.sent,
  "lines/frame": r.carried,
  correct: r.correct + "/" + r.n,
  "value acc": (r.kinds.value ? Math.round((r.kinds.value.correct / r.kinds.value.n) * 100) + "%" : "-"),
  "struct acc": (r.kinds.structure ? Math.round((r.kinds.structure.correct / r.kinds.structure.n) * 100) + "%" : "-"),
  "est tok": r.est,
  "measured tok": r.measuredN ? Math.round(r.measuredSum / r.measuredN) : "-",
  "$/answer": formatUsd(r.usd / r.n),
  "$/correct": r.correct ? formatUsd(r.usd / r.correct) : "-",
  "raw text $/answer": formatUsd(r.textUsd),
  truncated: r.truncated
})));

const wrong = results.filter((r) => !r.correct);
if (wrong.length) {
  console.log("--- misses ---");
  for (const r of wrong) console.log("  " + r.variant + " " + r.fixture + " | " + r.qa + " | expected " + r.expected + " | got " + JSON.stringify(r.answer).slice(0, 100));
}

const md = [];
md.push("# Dense-image fidelity + cost bench", "");
md.push("- model: \`" + MODEL + "\` · price " + (price ? "(cache miss $" + price.peak.cacheMiss + "/M peak)" : "(unknown)"));
md.push("- fixtures: " + all.length + " · variants: " + variants.length + " · answers: " + results.length +
  " · calls: " + results.filter((r) => !r.cached).length + " new / " + results.filter((r) => r.cached).length + " cached", "");
md.push("| variant | drawn | sent | lines/frame | correct | value acc | struct acc | est tok | measured tok | $/answer | $/correct |", "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
for (const r of byVariant.values()) {
  md.push("| \`" + r.variant + "\` | " + r.drawn + " | " + r.sent + " | " + r.carried + " | " + r.correct + "/" + r.n + " | " +
    (r.kinds.value ? r.kinds.value.correct + "/" + r.kinds.value.n : "-") + " | " +
    (r.kinds.structure ? r.kinds.structure.correct + "/" + r.kinds.structure.n : "-") + " | " + r.est + " | " +
    (r.measuredN ? Math.round(r.measuredSum / r.measuredN) : "-") + " | " + formatUsd(r.usd / r.n) + " | " +
    (r.correct ? formatUsd(r.usd / r.correct) : "-") + " |");
}
md.push("");
if (wrong.length) {
  md.push("## Misses", "");
  for (const r of wrong) md.push("- \`" + r.variant + "\` " + r.fixture + " — " + r.qa + " → expected \`" + r.expected + "\`, got \`" + String(r.answer).replace(/\n/g, " ").slice(0, 120) + "\`");
  md.push("");
}
writeFileSync(REPORT_PATH, md.join("\n"));
console.log("report: " + REPORT_PATH);
