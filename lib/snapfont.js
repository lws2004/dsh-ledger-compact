// snapfont.js — OMP 同款密图字库：X.org 8x13 + 16x16 CJK。
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const GLYPH_W = 8;
const GLYPH_H = 13;
const CJK_PX = 16;
const PAPER = 245;
const INK = 16;
/** Secondary inks: rules and the line ruler stay readable but recede. */
const RULE = 205;
const GUTTER_INK = 150;

const here = dirname(fileURLToPath(import.meta.url));
const font8 = readFileSync(join(here, "fonts", "font8x13.bin"));
const fontCjk = readFileSync(join(here, "fonts", "snapcjk.bin"));

function u32le(buf, off) {
  return buf.readUInt32LE(off);
}

function loadMap(buf, magic, hdr, glyphBytes) {
  if (buf.length < hdr + 4 || buf.subarray(0, magic.length).toString("binary") !== magic) {
    return new Map();
  }
  const count = u32le(buf, magic === "F8X13" ? 8 : 12);
  const cpsOff = magic === "F8X13" ? 12 : 16;
  const bitsOff = cpsOff + count * 4;
  const map = new Map();
  for (let i = 0; i < count; i++) {
    const cp = u32le(buf, cpsOff + i * 4);
    const start = bitsOff + i * glyphBytes;
    if (start + glyphBytes > buf.length) break;
    map.set(cp, buf.subarray(start, start + glyphBytes));
  }
  return map;
}

const map8 = loadMap(font8, "F8X13", 8, 13);
const mapCjk = loadMap(fontCjk, "SNAPCJK1", 8, 32);

export function familyOf(model) {
  const n = (model ?? "").toLowerCase();
  if (n.includes("claude") || n.includes("anthropic")) return "anthropic";
  return "openai";
}

export function resolveShape(model) {
  const family = familyOf(model);
  if (family === "anthropic") {
    return { name: "11on16", family, cellW: 11, cellH: 16, cols: 142, frameW: 142 * 11, frameH: 1568 };
  }
  // 2048 = four whole 512px tile bands. The bill is per band, so the canvas cap
  // has to land on a band edge — at 1540 the last band bought four usable pixels.
  return { name: "8on22", family, cellW: 8, cellH: 22, cols: 128, frameW: 1024, frameH: 2048 };
}

export function isWide(cp) {
  return (
    (cp >= 0x1100 && cp <= 0x115f) ||
    (cp >= 0x2329 && cp <= 0x232a) ||
    (cp >= 0x2e80 && cp <= 0xa4cf) ||
    (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe10 && cp <= 0xfe19) ||
    (cp >= 0xfe30 && cp <= 0xfe6f) ||
    (cp >= 0xff00 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x1f300 && cp <= 0x1faff)
  );
}

export function cellsOf(cp) {
  return isWide(cp) ? 2 : 1;
}

export function lookup8(cp) {
  return map8.get(cp);
}

export function lookupCjk(cp) {
  return mapCjk.get(cp);
}

export function estImageTokens(w, h, family) {
  if (family === "anthropic") return Math.max(1, Math.ceil((w * h) / 750));
  if (family === "google") return 1120;
  const tiles = Math.max(1, Math.ceil(w / 512) * Math.ceil(h / 512));
  return 85 + 170 * tiles;
}

export function maxRows(textTok, excerptTok, shape) {
  const keep = Math.floor((textTok * 85) / 100);
  if (keep <= excerptTok) return 0;
  const budget = keep - excerptTok;
  const hard = Math.floor(shape.frameH / shape.cellH);
  if (hard <= 0) return 0;
  let lo = 0;
  let hi = hard;
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo + 1) / 2);
    const tok = estImageTokens(shape.frameW, mid * shape.cellH, shape.family);
    if (tok <= budget) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

function put(px, stride, x, y, v) {
  if (x < 0 || x >= stride) return;
  const i = y * stride + x;
  if (i < 0 || i >= px.length) return;
  px[i] = v;
}

function blit8(px, stride, x, y, rows, shape, ink = INK) {
  const oy = shape.cellH > GLYPH_H ? Math.floor((shape.cellH - GLYPH_H) / 2) : 0;
  for (let r = 0; r < GLYPH_H; r++) {
    const bits = rows[r] ?? 0;
    for (let c = 0; c < GLYPH_W; c++) {
      if (((bits >> (7 - c)) & 1) === 0) continue;
      put(px, stride, x + c, y + oy + r, ink);
    }
  }
}

function blitCjk(px, stride, x, y, bits, shape, ink = INK) {
  const boxW = shape.cellW * 2;
  const ox = boxW > CJK_PX ? Math.floor((boxW - CJK_PX) / 2) : 0;
  const oy = shape.cellH > CJK_PX ? Math.floor((shape.cellH - CJK_PX) / 2) : 0;
  for (let r = 0; r < CJK_PX; r++) {
    const row = ((bits[r * 2] ?? 0) << 8) | (bits[r * 2 + 1] ?? 0);
    for (let c = 0; c < CJK_PX; c++) {
      if (((row >> (15 - c)) & 1) === 0) continue;
      put(px, stride, x + ox + c, y + oy + r, ink);
    }
  }
}

function blitBox(px, stride, x, y, bw, bh, ink = INK) {
  if (bw < 3 || bh < 3) return;
  for (let c = 1; c + 1 < bw; c++) {
    put(px, stride, x + c, y + 1, ink);
    put(px, stride, x + c, y + bh - 2, ink);
  }
  for (let r = 1; r + 1 < bh; r++) {
    put(px, stride, x + 1, y + r, ink);
    put(px, stride, x + bw - 2, y + r, ink);
  }
}

export function wrapLines(text, cols) {
  const rows = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] === "\n") {
      rows.push("");
      i += 1;
      continue;
    }
    const start = i;
    let used = 0;
    while (i < text.length && text[i] !== "\n") {
      const cp = text.codePointAt(i) ?? 63;
      const w = cellsOf(cp);
      if (used > 0 && used + w > cols) break;
      used += w;
      i += cp > 0xffff ? 2 : 1;
    }
    rows.push(text.slice(start, i));
    if (text[i] === "\n") i += 1;
  }
  return rows;
}

/** Draw already-wrapped sub-rows into a cell box whose top-left corner is (x, y). */
function drawCells(px, stride, x, y, lines, cols, shape, ink) {
  for (let k = 0; k < lines.length; k++) {
    const line = lines[k] ?? "";
    let col = 0;
    let i = 0;
    while (i < line.length) {
      const cp = line.codePointAt(i) ?? 63;
      const wcells = cellsOf(cp);
      if (col + wcells > cols) break;
      const gx = x + col * shape.cellW;
      const gy = y + k * shape.cellH;
      if (wcells === 2) {
        const bits = lookupCjk(cp);
        if (bits) blitCjk(px, stride, gx, gy, bits, shape, ink);
        else blitBox(px, stride, gx, gy, shape.cellW * 2, shape.cellH, ink);
      } else {
        const bits = lookup8(cp);
        if (bits) blit8(px, stride, gx, gy, bits, shape, ink);
        else blitBox(px, stride, gx, gy, shape.cellW, shape.cellH, ink);
      }
      col += wcells;
      i += cp > 0xffff ? 2 : 1;
    }
  }
}

/** Single-column raster of a whole text blob (no packing, no ruler). */
export function raster(text, shape, maxRowCount) {
  if (maxRowCount <= 0) return undefined;
  const lines = wrapLines(text, shape.cols);
  if (lines.length === 0) return undefined;
  const rows = Math.min(lines.length, maxRowCount);
  const w = shape.frameW;
  const h = rows * shape.cellH;
  const pixels = new Uint8Array(w * h);
  pixels.fill(PAPER);
  drawCells(pixels, w, 0, 0, lines.slice(0, rows), shape.cols, shape, INK);
  return { pixels, w, h, rows };
}

/**
 * Rasterize a layout plan from layout.js.
 *
 * \`maxSubRows\` is the token budget expressed in text rows. Whole grid rows are
 * taken while they fit — clipping mid-row would leave columns ending at different
 * heights and destroy the alignment the packing exists for.
 */
export function rasterGrid(plan, shape, maxSubRows) {
  if (!plan || !Array.isArray(plan.rows) || plan.rows.length === 0) return undefined;
  const cap = Math.floor(Math.min(Number(maxSubRows) || 0, shape.frameH / shape.cellH));
  if (cap <= 0) return undefined;

  const taken = [];
  const drawn = [];
  let subRows = 0;
  for (const row of plan.rows) {
    if (subRows + row.subRows > cap) break;
    taken.push(row);
    subRows += row.subRows;
    for (const cell of row.cells) for (const part of cell) if (part !== "") drawn.push(part);
  }
  if (taken.length === 0 || subRows <= 0) return undefined;

  const w = shape.frameW;
  const h = subRows * shape.cellH;
  const pixels = new Uint8Array(w * h);
  pixels.fill(PAPER);

  const gutterCols = plan.gutterCols ?? 0;
  const gutterW = gutterCols * shape.cellW;
  const stride = plan.cellCols + plan.gapCols;
  const every = plan.gutterEvery || 5;
  let y = 0;
  for (let r = 0; r < taken.length; r++) {
    const row = taken[r];
    const rowH = row.subRows * shape.cellH;
    if (gutterCols > 0) {
      if (r % every === 0) {
        drawCells(pixels, w, 0, y, [String(row.startLine)], gutterCols - 1, shape, GUTTER_INK);
      }
      for (let yy = y; yy < y + rowH; yy++) put(pixels, w, gutterW - shape.cellW, yy, RULE);
    }
    for (let j = 0; j < row.cells.length; j++) {
      const x = gutterW + j * stride * shape.cellW;
      if (j > 0) {
        const ruleX = x - Math.ceil(plan.gapCols / 2) * shape.cellW;
        for (let yy = y; yy < y + rowH; yy++) put(pixels, w, ruleX, yy, RULE);
      }
      drawCells(pixels, w, x, y, row.cells[j], plan.cellCols, shape, INK);
    }
    y += rowH;
  }
  return {
    pixels,
    w,
    h,
    rows: subRows,
    gridRows: taken.length,
    columns: plan.columns,
    cellCols: plan.cellCols,
    gutterCols,
    renderedText: drawn.join("\n")
  };
}
