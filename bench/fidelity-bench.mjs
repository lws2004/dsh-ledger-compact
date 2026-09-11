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
import { deepseekImageTokens, maxRows, parseAsciiAtlas, previewSize, raster, rasterGrid, resolveShape, setAsciiAtlas, setDigitAtlas } from "../lib/snapfont.js";
import { encodePngGray, encodePngPalette } from "../lib/png.js";
import { formatUsd, priceFor, requestPreviewSize, usdFor } from "../lib/pricing.js";
import { estTokensUtf8 } from "../lib/tokens.js";
import { SNAP_HEAD_LINES, SNAP_TAIL_LINES, snapExcerpt } from "../lib/excerpt.js";
import { fixtures } from "./fixtures.mjs";

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

// The fixtures (and their questions) live in fixtures.mjs, so miss-audit.mjs can rebuild
// the same sources and check a wrong answer against the file it was asked about.

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

function packed(cellW, cellH, layout = {}, rasterOptions = undefined) {
  return (text, lines) => {
    const shape = budgetShape(cellW, cellH);
    const plan = planGrid(lines, shape, layout);
    const framed = rasterGrid(plan, shape, maxRows(estTokensUtf8(text), 0, shape), rasterOptions);
    return { framed, shape, note: layoutNote(plan, framed) };
  };
}

/**
 * Alternating grid-row shading. The left ruler anchors a row at its first column; a
 * value 120 columns away has nothing tying it to that row. A shade band costs no cells.
 */
function zebra(cellW, cellH, layout = {}) {
  return packed(cellW, cellH, layout, { rowPaper: (r) => (r % 2 ? 236 : 245) });
}

/** Draw the digits from a second atlas — bolder, or from a bigger box. Same cells. */
function digitVariant(file, cellW, cellH, layout = {}, build = packed) {
  const digits = parseAsciiAtlas(readFileSync(join(here, "atlas", file)));
  if (!digits.w) throw new Error("unreadable atlas: " + file);
  const base = build(cellW, cellH, layout);
  return (text, lines) => {
    setDigitAtlas(digits);
    try {
      return base(text, lines);
    } finally {
      setDigitAtlas(null);
    }
  };
}

/**
 * Every digit run of five or more gets a space every three digits, so a long value
 * reads as groups a human (or an encoder) can hold: 48213 -> "48 213". Shorter runs are
 * left alone; the bench's matcher ignores whitespace, and the notice still carries the
 * exact bytes.
 */
const groupDigits = (line) => String(line).replace(/\d{5,}/g, (run) => run.replace(/\B(?=(\d{3})+$)/g, " "));

function grouped(cellW, cellH, layout = {}, transform = groupDigits) {
  const base = packed(cellW, cellH, layout);
  return (text, lines) => base(text, lines.map(transform));
}

/**
 * The same chunking with a visible separator. A space inside a number is ambiguous in a
 * packed grid — it can read as a column boundary — so this is the version that cannot be
 * mistaken for one: 48213 -> "48,213", 1000074 -> "1,000,074".
 */
const commaDigits = (line) => String(line).replace(/\d{5,}/g, (run) => run.replace(/\B(?=(\d{3})+$)/g, ","));

/** Points at the split the measurements found: image for bulk, text for exact values. */
const TRUST_HINT = "The image is a frozen preview of the text above it. For exact values — ids, counts, byte counts, timings, status codes — prefer the text; use the image for structure and for what the text elided.";

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

/**
 * The shipped shape: the same notice, with the head/tail excerpt the plugin actually
 * sends underneath it. Every other variant here asks the image alone, which is a lower
 * bound on what production sees — and the questions whose answers sit in the first 16
 * or last 8 lines are exactly the ones the image keeps failing.
 */
function withExcerpt(build, options = undefined, make = null) {
  const buildExcerpt = make ?? ((text) => snapExcerpt(text, options));
  return (text, lines) => ({ ...build(text, lines), excerpt: buildExcerpt(text) });
}

/**
 * Excerpt lines carry the source line number, the way the image's ruler does, and the
 * elision marker says which lines it stands for. Without them a range question ("cases 0
 * through 19") has to be aligned by eye and a truncated head reads as a complete one.
 */
function numberedExcerpt(text, options = {}) {
  const head = options.headLines ?? SNAP_HEAD_LINES;
  const tail = options.tailLines ?? SNAP_TAIL_LINES;
  const lines = String(text).split("\n");
  const numbered = (line, i) => (i + 1) + "| " + line;
  if (lines.length <= head + tail) return lines.map(numbered).join("\n");
  const from = head + 1;
  const to = lines.length - tail;
  return [
    ...lines.slice(0, head).map(numbered),
    "… lines " + from + "-" + to + " elided (" + (to - from + 1) + "); see image …",
    ...lines.slice(-tail).map((line, i) => numbered(line, lines.length - tail + i))
  ].join("\n");
}

/**
 * Mechanical whole-file totals, counted for free in text: tokens of 16 characters or
 * fewer that appear at least three times, top eight by count. This is what a "how many
 * X are in this file" question needs and what neither the image nor an excerpt can give.
 */
function countTokens(text) {
  const counts = new Map();
  for (const raw of String(text).split(/\s+/)) {
    const token = raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}%]+$/gu, "");
    if (!token || token.length > 16) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return counts;
}

function tokenDigest(text, top = 8) {
  const rows = [...countTokens(text)].filter(([, n]) => n >= 3)
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, top);
  return rows.length === 0 ? "" : "whole-file totals: " + rows.map(([t, n]) => t + "×" + n).join(" · ");
}

/**
 * Cumulative totals for the prefix ranges questions are actually asked about ("how many
 * of the first ten…"). Short values first on ties, because a status code is a value and an
 * IP or a path is structure.
 */
function blockDigest(text, ranges = [10, 20], top = 6) {
  const lines = String(text).split("\n");
  // Only values the whole file repeats are worth a block count: a numeric grid has
  // nothing else to say, and reporting every unique token would be noise in every notice.
  const whole = new Set([...countTokens(text)].filter(([, n]) => n >= 3)
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 8).map(([t]) => t));
  return ranges.filter((n) => n < lines.length).map((n) => {
    const rows = [...countTokens(lines.slice(0, n).join("\n"))]
      // A one-off in the block is only worth a slot when it is short enough to be a
      // code (a status, a flag) rather than a path or an identifier.
      .filter(([t, c]) => whole.has(t) && (c >= 2 || t.length <= 4))
      .sort((a, b) => b[1] - a[1] || a[0].length - b[0].length || (a[0] < b[0] ? -1 : 1)).slice(0, top);
    return rows.length === 0 ? "" : "lines 1-" + n + ": " + rows.map(([t, c]) => t + "×" + c).join(" · ");
  }).filter(Boolean).join("\n");
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
  /**
   * Exact-value arms, all free in cells and tokens unless noted: shading rows, a
   * bolder or bigger digit box, and grouping long digit runs.
   */
  "excerpt": { build: withExcerpt(packed(8, 16, { gutterEvery: 1 })), legend: false },
  /** The excerpt window itself: the shipped head is 16 lines, everything is clamped to 2400 bytes. */
  "excerpt-32": { build: withExcerpt(packed(8, 16, { gutterEvery: 1 }), { headLines: 32 }), legend: false },
  /** Same frame and excerpt, but told which channel to trust for exact values. */
  "excerpt-hint": { build: withExcerpt(packed(8, 16, { gutterEvery: 1 })), legend: false, hint: TRUST_HINT },
  /** The two text-side fixes for the enumeration class. */
  "excerpt-lines": { build: withExcerpt(packed(8, 16, { gutterEvery: 1 }), {}, (text) => numberedExcerpt(text)), legend: false },
  /** Shipped in 0.13.0: the notice carries the whole-file totals. */
  "excerpt-digest": { build: withExcerpt(packed(8, 16, { gutterEvery: 1 }), {}, (text) => snapExcerpt(text) + "\n" + tokenDigest(text)), legend: false },
  /** The same, plus cumulative totals for the 1-10 and 1-20 ranges. */
  "excerpt-blocks": { build: withExcerpt(packed(8, 16, { gutterEvery: 1 }), {}, (text) => snapExcerpt(text) + "\n" + tokenDigest(text) + "\n" + blockDigest(text)), legend: false },
  "zebra": { build: zebra(8, 16, { gutterEvery: 1 }), legend: false },
  "digit-bold": { build: digitVariant("xorg-8x13-bold-digits.bin", 8, 16, { gutterEvery: 1 }), legend: false },
  /** Both free arms at once: the ship candidate if either mechanism is real. */
  "zebra-bold": { build: digitVariant("xorg-8x13-bold-digits.bin", 8, 16, { gutterEvery: 1 }, zebra), legend: false },
  "digit-big": { build: digitVariant("xorg-8x16.bin", 8, 16, { gutterEvery: 1 }), legend: false },
  "digit-group": { build: grouped(8, 16, { gutterEvery: 1 }), legend: false },
  "digit-comma": { build: grouped(8, 16, { gutterEvery: 1 }, commaDigits), legend: false },
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
    const built = spec.build(text, fixture.lines);
    const { framed, note, palette } = built;
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
      const prompt = (spec.hint ? spec.hint + "\n" : "") + (spec.legend ? LEGEND + "\n" : "") + notice +
        (built.excerpt ? "\n" + built.excerpt : "") +
        "\nQuestion: " + qa.q + "\nAnswer with only the answer.";
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
