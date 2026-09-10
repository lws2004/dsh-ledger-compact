#!/usr/bin/env node
/**
 * Layout economics for the ingress image — pure arithmetic, no model calls.
 *
 * Compares the pre-0.6 single-column canvas with the shipped packed canvas for the
 * model the plugin actually talks to, and prices both with the published DeepSeek
 * table (the request pipeline's own resize is included in the estimate).
 *
 *   node bench/layout-bench.mjs
 *   BENCH_MODEL=deepseek-v4-pro node bench/layout-bench.mjs
 */

import { planGrid } from "../lib/layout.js";
import { estImageTokens, maxRows, raster, rasterGrid, resolveShape } from "../lib/snapfont.js";
import { estTokensUtf8 } from "../lib/tokens.js";
import { snapExcerpt } from "../lib/excerpt.js";
import { formatUsd, usdFor } from "../lib/pricing.js";

const MODEL = process.env.BENCH_MODEL ?? "deepseek-flash";
const shape = resolveShape(MODEL);
const legacyShape = { ...shape, cellH: 22, frameH: 1540 }; // pre-0.6 canvas

const fixtures = [
  ["seq-3000", Array.from({ length: 3000 }, (_, i) => String(i + 1))],
  ["access-log", Array.from({ length: 2000 }, (_, i) =>
    '10.0.' + (i % 256) + '.' + ((i * 7) % 256) + ' - - [10/Sep/2026:19:00:00 +0800] "GET /api/v1/items/' + i +
    "?page=" + (i % 50) + ' HTTP/1.1" ' + (i % 37 === 0 ? 503 : 200) + " " + (100 + (i % 900)))],
  ["test-log", Array.from({ length: 1500 }, (_, i) =>
    (i % 97 === 11 ? "FAIL" : "PASS") + " case-" + i + " dur=" + ((i * 13) % 400) + "ms")],
  ["ls-long", Array.from({ length: 800 }, (_, i) =>
    "-rw-r--r--  1 user user " + String((i * 131) % 900000).padStart(7) + " Sep 10 19:0" + (i % 10) + " asset-" + i + ".tar.gz")],
  ["cjk-log", Array.from({ length: 700 }, (_, i) =>
    "[" + (i % 24) + "] 处理完成：第 " + i + " 批日志已归档，耗时 " + ((i * 7) % 997) + " 毫秒，队列剩余 " + (i % 13))],
  ["prose", Array.from({ length: 300 }, (_, i) =>
    "line-" + i + " " + "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor".repeat(2))]
];

const excerptCost = (text) => Math.min(estTokensUtf8(snapExcerpt(text)) + 48, 800);

console.log(MODEL + " · shipped frame " + shape.name + " " + shape.frameW + "x" + shape.frameH +
  " (" + shape.frameH / shape.cellH + " rows, " + Math.round(shape.frameW * shape.frameH / 1000) + "k px) · pre-0.6 frame 1024x1540");

const table = [];
for (const [fixture, lines] of fixtures) {
  const text = lines.join("\n");
  const tok = estTokensUtf8(text);
  const exTok = excerptCost(text);

  const legacyRows = maxRows(tok, exTok, legacyShape);
  const legacyFrame = raster(text, legacyShape, legacyRows);
  const legacyTok = legacyFrame ? estImageTokens(legacyFrame.w, legacyFrame.h, legacyShape.family) : 0;

  const plan = planGrid(lines, shape);
  const budget = maxRows(tok, exTok, shape);
  const framed = rasterGrid(plan, shape, budget);
  if (!framed) {
    table.push({ fixture, "text tok": tok, note: "no image: budget or layout refused" });
    continue;
  }
  const newTok = estImageTokens(framed.w, framed.h, shape.family);
  const carried = framed.sourceLines ?? (framed.gridRows !== undefined ? framed.gridRows * framed.columns : framed.rows);
  table.push({
    fixture,
    "text tok": tok,
    "pre-0.6 tok": legacyTok,
    "pre-0.6 lines": legacyFrame ? legacyFrame.rows : 0,
    "shipped tok": newTok,
    "shipped lines": carried,
    cols: framed.columns,
    "frame fill": (plan.occupancy * 100).toFixed(0) + "%",
    "shipped $": formatUsd(usdFor(newTok, "cacheMiss", MODEL)),
    "raw text $": formatUsd(usdFor(tok, "cacheMiss", MODEL))
  });
}
console.table(table);
