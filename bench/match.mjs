/**
 * Right-or-wrong, in one place.
 *
 * `fidelity-bench.mjs` decides every verdict with this, and `miss-audit.mjs` re-decides the
 * stored answers with it — so a scoring bug cannot quietly flatter every arm at once.
 *
 * It used to live inline in the bench with three escaping bugs, all of them silent:
 * the whitespace strip matched a literal backslash-s and never fired, the number-prefix
 * branch tested for a literal backslash-d and was dead, and the 5xx retry had the same
 * problem. The first made the matcher lax, the other two made it strict — a correct
 * `52` against an expected `52ms` was scored wrong.
 */

/** Lowercase, and take out every space so an answer may be spaced however it likes. */
export function normalize(s) {
  return String(s ?? "").replace(/\s+/g, "").toLowerCase();
}

/** Containment with number/letter boundaries, so "1050" never satisfies "105". */
export function matches(answer, expected) {
  const a = normalize(answer);
  const e = normalize(expected);
  if (!a || !e) return false;
  if (a === e) return true;
  const esc = e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (new RegExp("(^|[^0-9a-z])" + esc + "($|[^0-9a-z])").test(a)) return true;
  // An expected "52ms" is satisfied by an answer of "52": the unit is the question's, not
  // the answer's, and demanding it back scored correct answers wrong.
  const num = e.match(/^(\d+)/);
  if (num && new RegExp("(^|[^0-9])" + num[1] + "($|[^0-9])").test(a)) return true;
  return false;
}
