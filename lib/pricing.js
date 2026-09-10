/** DeepSeek price list and request-image accounting.
 *
 * Source: https://api-docs.deepseek.com/quick_start/pricing (read 2026-09-10), plus the
 * request-image pixel budget the DeepSeek adapter applies before dispatch
 * (`imagePixelBudget`, 64e4 px, 1 MiB per image).
 *
 * Two things live here and nowhere else:
 *  - what a token costs (so reports can be in money, not in abstract tokens), and
 *  - how large an image may be before the request pipeline resizes it, because that
 *    resize decides both the bill and the resolution the model actually reads.
 */

/** Prices are USD per 1M tokens. Peak/off-peak follow the published table. */
export const PRICES = {
  "deepseek-flash": {
    vision: true,
    requestPixelBudget: 640000,
    requestMaxBytes: 1024 * 1024,
    peak: { cacheHit: 0.006, cacheMiss: 0.3, output: 1.2 },
    offPeak: { cacheHit: 0.003, cacheMiss: 0.15, output: 0.6 }
  },
  "deepseek-v4-pro": {
    vision: false,
    requestPixelBudget: 640000,
    requestMaxBytes: 1024 * 1024,
    peak: { cacheHit: 0.044, cacheMiss: 1.32, output: 3.96 },
    offPeak: { cacheHit: 0.022, cacheMiss: 0.66, output: 1.98 }
  }
};

export const DEFAULT_MODEL = "deepseek-flash";

export function priceFor(model) {
  const id = String(model ?? "").trim().toLowerCase();
  if (PRICES[id]) return PRICES[id];
  // Any other deepseek-v4 route shares the flash economy closely enough to report with it.
  if (id.startsWith("deepseek")) return PRICES[DEFAULT_MODEL];
  return undefined;
}

/**
 * USD for a number of tokens. `kind` is `cacheMiss` (fresh input, which is what a
 * dense image always is on its first send), `cacheHit`, or `output`.
 */
export function usdFor(tokens, kind, model, options = {}) {
  const price = priceFor(model);
  if (!price) return undefined;
  const table = options.offPeak === true ? price.offPeak : price.peak;
  const rate = table[kind];
  if (rate === undefined) throw new Error("unknown token kind: " + kind);
  return (Number(tokens) || 0) * rate / 1e6;
}

/** Format a small USD amount the way API dashboards do. */
export function formatUsd(value) {
  if (value === undefined || value === null || !Number.isFinite(value)) return "-";
  if (value === 0) return "$0";
  if (value < 0.000001) return "<$0.000001";
  if (value < 0.01) return "$" + value.toFixed(6);
  if (value < 1) return "$" + value.toFixed(4);
  return "$" + value.toFixed(2);
}

/**
 * The dimensions the request pipeline will actually send: scaled to fit
 * `budget` pixels with the aspect ratio kept, never upscaled.
 */
export function requestPreviewSize(width, height, model) {
  const price = priceFor(model);
  const budget = price?.requestPixelBudget ?? 640000;
  const px = width * height;
  if (px <= budget) return { width, height, resized: false, scale: 1, pixels: px };
  const scale = Math.sqrt(budget / px);
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  return { width: w, height: h, resized: true, scale: w / width, pixels: w * h };
}
