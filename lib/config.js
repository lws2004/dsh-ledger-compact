export const NS = "dsh-ledger-compact";
export const SERVICE = "ledgerCompact";
export const PACKAGE = "dsh-ledger-compact";

export const DEFAULTS = {
  enabled: true,
  snapImages: false,
  minSnapTokens: 3000,
  savingsRatio: 0.85,
  confirmFold: true
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
  const enabled = bool(source.enabled, DEFAULTS.enabled);
  const ingress = source.ingress === false ? false : true;
  return {
    enabled: enabled && ingress,
    snapImages: bool(source.snapImages, DEFAULTS.snapImages),
    minSnapTokens: intInRange(source.minSnapTokens, 200, 200000, DEFAULTS.minSnapTokens),
    savingsRatio: ratio(source.savingsRatio, DEFAULTS.savingsRatio),
    confirmFold: bool(source.confirmFold, DEFAULTS.confirmFold)
  };
}

/** Schemastery envelope so the browser settingsScope can rehydrate and write. */
settingsSchema.toJSON = () => ({
  type: "object",
  meta: { default: {} },
  dict: {
    enabled: { type: "boolean", meta: { default: true } },
    snapImages: { type: "boolean", meta: { default: false } },
    minSnapTokens: { type: "number", meta: { step: 1, min: 200, max: 200000, default: 3000 } },
    savingsRatio: { type: "number", meta: { min: 0.05, max: 1, default: 0.85 } },
    confirmFold: { type: "boolean", meta: { default: true } }
  }
});
