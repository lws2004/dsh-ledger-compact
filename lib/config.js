import { buildObjectEnvelope } from "./schema-envelope.js";

export const NS = "dsh-ledger-compact";
export const SERVICE = "ledgerCompact";
export const PACKAGE = "dsh-ledger-compact";
/** Kept in sync with package.json by a test. */
export const VERSION = "0.10.0";

export const DEFAULTS = {
  enabled: true,
  snapImages: false,
  /**
   * Request-image pixel budget of the routed deployment (llm-deepseek's
   * `imagePixelBudget`, 640000 by default). The canvas is drawn to fit it: a frame the
   * request pipeline has to resize loses its detail to the resample, which measured
   * 1–2/10 answers against 8/10 drawn natively.
   */
  imagePixelBudget: 640000,
  minSnapTokens: 3000,
  savingsRatio: 0.85,
  confirmFold: true,
  replaceDefault: false
};

function bool(value, fallback) {
  if (value === true || value === false) return value;
  return fallback;
}

function intInRange(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isInteger(n)) return fallback;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

function ratio(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  if (n < 0.05) return 0.05;
  if (n > 1) return 1;
  return n;
}

export function settingsSchema(value) {
  const source = value && typeof value === "object" ? value : {};
  /** Legacy sidecar: it only decides while the schema key itself was never written. */
  const enabled = source.enabled === undefined
    ? (source.ingress === false ? false : DEFAULTS.enabled)
    : bool(source.enabled, DEFAULTS.enabled);
  return {
    enabled,
    snapImages: bool(source.snapImages, DEFAULTS.snapImages),
    imagePixelBudget: intInRange(source.imagePixelBudget, 200000, 4000000, DEFAULTS.imagePixelBudget),
    minSnapTokens: intInRange(source.minSnapTokens, 200, 200000, DEFAULTS.minSnapTokens),
    savingsRatio: ratio(source.savingsRatio, DEFAULTS.savingsRatio),
    confirmFold: bool(source.confirmFold, DEFAULTS.confirmFold),
    replaceDefault: bool(source.replaceDefault, DEFAULTS.replaceDefault)
  };
}

/** Field table shared by the schema and its canonical wire envelope. */
export const FIELDS = {
  enabled: { type: "boolean", meta: { default: DEFAULTS.enabled } },
  snapImages: { type: "boolean", meta: { default: DEFAULTS.snapImages } },
  imagePixelBudget: { type: "number", meta: { step: 1000, min: 200000, max: 4000000, default: DEFAULTS.imagePixelBudget } },
  minSnapTokens: { type: "number", meta: { step: 1, min: 200, max: 200000, default: DEFAULTS.minSnapTokens } },
  savingsRatio: { type: "number", meta: { min: 0.05, max: 1, default: DEFAULTS.savingsRatio } },
  confirmFold: { type: "boolean", meta: { default: DEFAULTS.confirmFold } },
  replaceDefault: { type: "boolean", meta: { default: DEFAULTS.replaceDefault } }
};

/** Canonical `{ uid, refs }` envelope so the browser settingsScope can rehydrate and write. */
settingsSchema.toJSON = () => buildObjectEnvelope(FIELDS);
