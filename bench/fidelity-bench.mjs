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
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { planGrid } from "../lib/layout.js";
import { estImageTokens, maxRows, previewSize, raster, rasterGrid, resolveShape } from "../lib/snapfont.js";
import { encodePngGray } from "../lib/png.js";
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

function credential(ref) {
  const text = readFileSync(CREDENTIALS, "utf8");
  const m = text.match(new RegExp("^\\s*" + ref + ":\\s*(\\S+)\\s*$", "m"));
  if (!m) throw new Error("credential " + ref + " not found in " + CREDENTIALS);
  return m[1].replace(/["']/g, "");
}

// ---------------------------------------------------------------- fixtures

function fixtures() {
  const out = [];
  const SEED = 48213;
  out.push({
    name: "seq-3000",
    lines: ["SNAPSHOT seed=" + SEED + " rows=3000", ...Array.from({ length: 3000 }, (_, i) => String(i + 1))],
    qa: [
      { q: "What is the value of seed= on the first line?", a: String(SEED) },
      { q: "Reading left to right then top to bottom, which number comes immediately after 7?", a: "8" }
    ]
  });

  out.push({
    name: "access-log",
    lines: Array.from({ length: 2000 }, (_, i) =>
      "10.0." + (i % 256) + "." + ((i * 7) % 256) + ' - - [10/Sep/2026:19:00:00 +0800] "GET /api/v1/items/' + i +
      "?page=" + (i % 50) + ' HTTP/1.1" ' + (i % 37 === 0 ? 503 : 200) + " " + (100 + (i % 900))),
    qa: [
      { q: "What HTTP status does the request for /api/v1/items/37 have?", a: "503" },
      { q: "What is the client IP of the request for /api/v1/items/5?", a: "10.0.5.35" }
    ]
  });

  out.push({
    name: "test-log",
    lines: Array.from({ length: 1500 }, (_, i) => (i % 97 === 11 ? "FAIL" : "PASS") + " case-" + i + " dur=" + ((i * 13) % 400) + "ms"),
    qa: [
      { q: "Which case is the first FAIL and how long did it take? Answer like: case-11 dur=143ms", a: "case-11 dur=143ms" },
      { q: "How many milliseconds did case-4 take?", a: "52ms" }
    ]
  });

  out.push({
    name: "ls-long",
    lines: Array.from({ length: 800 }, (_, i) =>
      "-rw-r--r--  1 user user " + String((i * 131) % 900000).padStart(7) + " Sep 10 19:0" + (i % 10) + " asset-" + i + ".tar.gz"),
    qa: [
      { q: "What size in bytes is reported for asset-5.tar.gz?", a: "655" },
      { q: "What size in bytes is reported for asset-9.tar.gz?", a: "1179" }
    ]
  });

  out.push({
    name: "cjk-log",
    lines: Array.from({ length: 700 }, (_, i) => "[" + (i % 24) + "] 处理完成：第 " + i + " 批日志已归档，耗时 " + ((i * 7) % 997) + " 毫秒，队列剩余 " + (i % 13)),
    qa: [
      { q: "第 5 批日志耗时多少毫秒？只回答数字。", a: "35" },
      { q: "第 6 批日志处理完后队列剩余多少？只回答数字。", a: "6" }
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

const VARIANTS = {
  /** Pre-0.6: one column, no ruler, the old 1540px canvas. */
  "legacy-1col-22": (text, lines) => {
    const shape = { ...BASE, cellH: 22, frameH: 1540 };
    return { framed: raster(text, shape, maxRows(estTokensUtf8(text), 0, shape)), shape, note: "" };
  },
  /** Current default: packed grid on the tall canvas, resized by the request pipeline. */
  "auto-22": (text, lines) => {
    const plan = planGrid(lines, BASE);
    const framed = rasterGrid(plan, BASE, maxRows(estTokensUtf8(text), 0, BASE));
    return { framed, shape: BASE, note: layoutNote(plan, framed) };
  },
  /** Denser glyphs on the tall canvas: same preview bill, more rows, more blur. */
  "auto-14": (text, lines) => {
    const shape = { ...BASE, cellH: 14 };
    const plan = planGrid(lines, shape);
    const framed = rasterGrid(plan, shape, maxRows(estTokensUtf8(text), 0, shape));
    return { framed, shape, note: layoutNote(plan, framed) };
  },
  /** Draw natively inside the request pixel budget: nothing is resampled. */
  ...Object.fromEntries([22, 18, 16, 14].map((cellH) => ["native-h" + cellH, (text, lines) => {
    const shape = nativeShape(cellH);
    const plan = planGrid(lines, shape);
    const framed = rasterGrid(plan, shape, maxRows(estTokensUtf8(text), 0, shape));
    return { framed, shape, note: layoutNote(plan, framed) };
  }]))
};

/** A frame that the request pipeline will not have to resize. */
function nativeShape(cellH) {
  const budget = priceFor(MODEL)?.requestPixelBudget ?? 640000;
  const frameW = Math.min(BASE.frameW, Math.floor(budget / 400));
  const cols = Math.floor(frameW / BASE.cellW);
  const frameH = Math.floor(budget / (cols * BASE.cellW) / cellH) * cellH;
  return { ...BASE, name: "native", cellH, cols, frameW: cols * BASE.cellW, frameH };
}

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
    const { framed, note } = VARIANTS[variant](text, fixture.lines);
    if (!framed || calls >= MAX_CALLS) continue;
    const preview = requestPreviewSize(framed.w, framed.h, MODEL);
    const pixels = resizeGray(framed.pixels, framed.w, framed.h, preview.width, preview.height);
    const png = encodePngGray(pixels, preview.width, preview.height);
    const dataUri = "data:image/png;base64," + Buffer.from(png).toString("base64");
    const estTok = estImageTokens(framed.w, framed.h, family);
    const notice = "[Snapcompact: " + textTok + " tokens → " + framed.w + "x" + framed.h + " PNG" +
      (preview.resized ? " (preview " + preview.width + "x" + preview.height + ")" : "") +
      " ~" + estTok + " tokens" + note + "]";
    const carried = framed.sourceLines ?? (framed.gridRows !== undefined ? framed.gridRows * (framed.columns ?? 1) : framed.rows);
    for (const qa of fixture.qa) {
      if (calls >= MAX_CALLS) break outer;
      const prompt = notice + "\nQuestion: " + qa.q + "\nAnswer with only the answer.";
      const hash = createHash("sha256").update([MODEL, variant, fixture.name, qa.q, dataUri].join("|")).digest("hex").slice(0, 24);
      const out = await ask(key, cache, hash, dataUri, prompt);
      if (!out.error) calls += 1;
      const usd = usdFor(out.promptTokens, "cacheMiss", MODEL);
      results.push({
        fixture: fixture.name, variant, qa: qa.q, expected: qa.a,
        answer: out.answer ?? "", error: out.error ?? "",
        correct: !out.error && normalize(out.answer).includes(normalize(qa.a)),
        finish: out.finish ?? "",
        drawn: framed.w + "x" + framed.h, sent: preview.width + "x" + preview.height,
        carried, estTok, measured: out.promptTokens ?? null, usd: usd ?? null,
        textUsd: usdFor(textTok, "cacheMiss", MODEL), cached: out.cached === true
      });
    }
  }
}

writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 1));

const byVariant = new Map();
for (const r of results) {
  const row = byVariant.get(r.variant) ?? { variant: r.variant, n: 0, correct: 0, cached: 0, measuredSum: 0, measuredN: 0, usd: 0, est: 0, drawn: r.drawn, sent: r.sent, carried: r.carried, textUsd: r.textUsd, truncated: 0 };
  row.n += 1;
  if (r.finish === "length") row.truncated += 1;
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
md.push("| variant | drawn | sent (preview) | lines/frame | correct | est tok | measured tok | $/answer | $/correct | raw text $/answer |", "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
for (const r of byVariant.values()) {
  md.push("| \`" + r.variant + "\` | " + r.drawn + " | " + r.sent + " | " + r.carried + " | " + r.correct + "/" + r.n + " | " + r.est + " | " +
    (r.measuredN ? Math.round(r.measuredSum / r.measuredN) : "-") + " | " + formatUsd(r.usd / r.n) + " | " +
    (r.correct ? formatUsd(r.usd / r.correct) : "-") + " | " + formatUsd(r.textUsd) + " |");
}
md.push("");
if (wrong.length) {
  md.push("## Misses", "");
  for (const r of wrong) md.push("- \`" + r.variant + "\` " + r.fixture + " — " + r.qa + " → expected \`" + r.expected + "\`, got \`" + String(r.answer).replace(/\n/g, " ").slice(0, 120) + "\`");
  md.push("");
}
writeFileSync(REPORT_PATH, md.join("\n"));
console.log("report: " + REPORT_PATH);
