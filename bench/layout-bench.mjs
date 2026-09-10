#!/usr/bin/env node
/**
 * Layout bench for the ingress image — pure arithmetic, no model calls.
 *
 * For every fixture it prints what the pre-0.6 single-column raster would have
 * charged and carried, next to what the packed grid charges and carries now.
 *
 *   node bench/layout-bench.mjs
 */

import { planGrid } from "../lib/layout.js";
import { estImageTokens, maxRows, raster, rasterGrid, resolveShape } from "../lib/snapfont.js";
import { estTokensUtf8 } from "../lib/tokens.js";
import { snapExcerpt } from "../lib/excerpt.js";

const MODEL = "gpt-4o";
const shape = resolveShape(MODEL);
const legacyShape = { ...shape, frameH: 1540 }; // pre-0.6 canvas cap

const fixtures = [
  ["seq-3000", Array.from({ length: 3000 }, (_, i) => String(i + 1))],
  ["access-log", Array.from({ length: 2000 }, (_, i) =>
    '10.0.' + (i % 256) + '.' + ((i * 7) % 256) + ' - - [10/Sep/2026:19:00:00 +0800] "GET /api/v1/items/' + i +
    "?page=" + (i % 50) + ' HTTP/1.1" 200 ' + (100 + (i % 900)))],
  ["test-log", Array.from({ length: 1500 }, (_, i) =>
    (i % 97 === 0 ? "FAIL" : "PASS") + " suite/unit/case-" + i + ".test.js (" + (i % 40) + " ms) expect=" + (i % 9))],
  ["ls-long", Array.from({ length: 800 }, (_, i) =>
    "-rw-r--r--  1 user user " + String((i * 131) % 900000).padStart(7) + " Sep 10 19:0" + (i % 10) + " asset-" + i + ".tar.gz")],
  ["cjk-log", Array.from({ length: 700 }, (_, i) =>
    "[" + (i % 24) + "] 处理完成：第" + i + "批日志已归档，耗时 " + (i % 97) + " 毫秒，队列剩余 " + (i % 13))],
  ["prose", Array.from({ length: 300 }, (_, i) =>
    "line-" + i + " " + "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor".repeat(2))]
];

function excerptCost(text) {
  return Math.min(estTokensUtf8(snapExcerpt(text)) + 48, 800);
}

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
  const drawnTok = estTokensUtf8(framed.renderedText);
  table.push({
    fixture,
    "text tok": tok,
    "old img": legacyTok,
    "old lines": legacyFrame ? legacyFrame.rows : 0,
    "new img": newTok,
    cols: framed.columns,
    "new lines": framed.gridRows * framed.columns,
    "frame fill": (plan.occupancy * 100).toFixed(0) + "%",
    "text/img": (drawnTok / newTok).toFixed(2) + "x"
  });
}
console.table(table);
