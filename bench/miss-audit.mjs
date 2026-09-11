#!/usr/bin/env node
/**
 * What the misses actually are, and what the money actually buys.
 *
 * `fidelity-bench.mjs` answers "how many were right, and what did it cost". This reads the
 * same run out of `.cache/last-results.json` and asks two questions the scoreboard cannot:
 *
 *  - **is the cost curve a compression curve at all?** The frame is a fixed bill; only the
 *    head/tail excerpt scales with the file, and it is capped at 24 lines. So the plugin's
 *    cost should be flat in the number of source lines while the same content as text is
 *    linear in it — meaning the "compression ratio" is set by the input, not by a knob.
 *  - **would a caller notice a wrong answer?** A truncated or garbled value announces
 *    itself. A well-formed value lifted from the wrong row does not. This classifies every
 *    miss by whether any cheap self-check could have caught it, and — for the ones that
 *    could not — whether the wrong value is a real value from the file it was asked about.
 *
 * No model calls, no cache misses: this is the recorded run, re-read.
 *
 *   node bench/miss-audit.mjs
 *   node bench/miss-audit.mjs --variant excerpt-blocks
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fixtures } from "./fixtures.mjs";
import { matches } from "./match.mjs";

const here = dirname(fileURLToPath(import.meta.url));
/** The tracked record; the working copy under .cache is only a fallback for old runs. */
const RESULTS = existsSync(join(here, "results.json"))
  ? join(here, "results.json")
  : join(here, ".cache", "last-results.json");

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

/** The source text of each fixture, so a wrong answer can be checked against the real file. */
const sources = new Map(fixtures().map((f) => [f.name, f.lines.join("\n")]));

const rows = JSON.parse(readFileSync(RESULTS, "utf8"));

// Re-decide every verdict instead of trusting the stored flag. The bench's own matcher
// carried three silent escaping bugs (`miss-audit.mjs` names them in match.mjs), and a
// scoring bug that flatters every arm at once is exactly what this tool exists to catch.
let corrected = 0;
let correctedUp = 0;
for (const r of rows) {
  const verdict = !r.error && matches(r.answer, r.expected);
  if (verdict !== r.correct) {
    corrected += 1;
    if (verdict) correctedUp += 1;
  }
  r.stored = r.correct;
  r.correct = verdict;
}

const only = flag("--variant", null);
const run = only ? rows.filter((r) => r.variant === only) : rows;
if (run.length === 0) throw new Error("no results for " + (only ?? "any variant"));

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const pct = (hit, n) => (n === 0 ? "  -" : String(Math.round((100 * hit) / n)).padStart(3) + "%");
const usd = (x) => "$" + x.toFixed(6);
const tok = (s) => (String(s).match(/-?\d+/g) ?? []).join("");
const bare = (s) => /^\s*-?\d+\s*$/.test(String(s));

const variants = [...new Set(run.map((r) => r.variant))];

console.log("# Miss audit — " + RESULTS.replace(here + "/", "") + "\n");
if (corrected > 0) {
  console.log(
    "**" + corrected + " of " + rows.length + " stored verdicts were wrong** (" + correctedUp +
    " scored wrong that were right, " + (corrected - correctedUp) + " the other way); the table below " +
    "recomputes every one with \`bench/match.mjs\`.\n"
  );
}

console.log("## What the scoreboard already says\n");
console.log("| variant | n | correct | value | structure | tok/answer | $/answer | $/correct | text $/correct | advantage |");
console.log("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
for (const v of variants) {
  const R = run.filter((r) => r.variant === v);
  const ok = R.filter((r) => r.correct).length;
  const val = R.filter((r) => r.kind === "value");
  const str = R.filter((r) => r.kind === "structure");
  const cost = mean(R.map((r) => r.usd));
  const text = mean(R.map((r) => r.textUsd));
  console.log(
    `| \`${v}\` | ${R.length} | ${ok}/${R.length} | ${pct(val.filter((r) => r.correct).length, val.length)} | ` +
      `${pct(str.filter((r) => r.correct).length, str.length)} | ${mean(R.map((r) => r.measured)).toFixed(0)} | ` +
      `${usd(cost)} | ${usd((cost * R.length) / ok)} | ${usd(text)} | ${(text / ((cost * R.length) / ok)).toFixed(1)}x |`,
  );
}
console.log("\nText is the source itself, so its accuracy is 1: $/correct for text is $/answer.\n");

console.log("## The bill does not grow with the file\n");
console.log("| fixture | source lines | accuracy | $/answer | same text | $/correct | advantage | tokens |");
console.log("| --- | --- | --- | --- | --- | --- | --- | --- |");
const byFixture = [...new Set(run.map((r) => r.fixture))];
const lineCount = new Map(fixtures().map((f) => [f.name, f.lines.length]));
byFixture.sort((a, b) => lineCount.get(a) - lineCount.get(b));
for (const f of byFixture) {
  const R = run.filter((r) => r.fixture === f);
  const ok = R.filter((r) => r.correct).length;
  const cost = mean(R.map((r) => r.usd));
  const text = mean(R.map((r) => r.textUsd));
  console.log(
    `| \`${f}\` | ${lineCount.get(f)} | ${pct(R.filter((r) => r.correct).length, R.length)} | ${usd(cost)} | ` +
      `${usd(text)} | ${usd((cost * R.length) / ok)} | ${(text / ((cost * R.length) / ok)).toFixed(1)}x | ${mean(R.map((r) => r.measured)).toFixed(0)} |`,
  );
}

console.log("\n## Would a caller notice?\n");
/**
 * Would a caller notice? A count that exceeds the range it counts refutes itself, and so
 * does prose where the question demanded a bare number. Everything else is silent.
 */
function isRefutable(r) {
  const answer = String(r.answer).trim();
  const range = /first ten/i.test(r.qa) ? 10 : (r.qa.match(/first (\d+)/) ?? r.qa.match(/前 (\d+)/) ?? [])[1];
  const counted = /how many|几批|几/i.test(r.qa) && range != null && bare(answer) && Number(answer) > Number(range);
  const shaped = /只回答数字|Answer with a number/i.test(r.qa) && !bare(answer);
  return counted || shaped;
}

const misses = run.filter((r) => !r.correct);
let refutable = 0;
let silent = 0;
let inSource = 0;
let sameWidth = 0;
const perFixture = new Map();
for (const r of misses) {
  const answer = String(r.answer).trim();
  const expected = String(r.expected).trim();
  const present = tok(answer) !== "" && sources.get(r.fixture)?.includes(tok(answer));
  const width = tok(answer).length > 0 && tok(answer).length === tok(expected).length;
  if (isRefutable(r)) refutable += 1;
  else silent += 1;
  if (present) inSource += 1;
  if (width) sameWidth += 1;
  const bucket = perFixture.get(r.fixture) ?? { n: 0, present: 0, width: 0 };
  bucket.n += 1;
  bucket.present += present ? 1 : 0;
  bucket.width += width ? 1 : 0;
  perFixture.set(r.fixture, bucket);
}
console.log(`${misses.length} misses of ${run.length} answers.\n`);
console.log(`- **caught by a shape or range check: ${refutable}** — the answer announces its own absurdity`);
console.log(`- **silent: ${silent}** — well-formed, plausible, and wrong\n`);
console.log("```");
console.log("wrong value occurs verbatim in the file it was asked about   " + inSource + " / " + misses.length);
console.log("wrong value has the same digit width as the truth           " + sameWidth + " / " + misses.length);
console.log("```\n");
console.log("| fixture | misses | of those, a real value from the file | same width as the truth |");
console.log("| --- | --- | --- | --- |");
for (const [f, b] of perFixture) console.log(`| \`${f}\` | ${b.n} | ${b.present} | ${b.width} |`);

// ---------------------------------------------------------------- did it go and look?

/**
 * The re-read arms answer a question the scoreboard cannot: given a read it was promised but
 * never told how to aim, does the model take it, does it aim at the answer, and does the read
 * pay for itself? "Aimed" means a read whose line range covers a source line that really
 * holds the expected value; a value that occurs on more than five lines (`3`, `19`) cannot
 * be aimed at, so those questions are counted as asked but left out of the aim column.
 */
const readArms = variants.filter((v) => run.some((r) => r.variant === v && Array.isArray(r.reads)));
if (readArms.length > 0) {
  const places = (fixture, expected) => {
    const src = sources.get(fixture);
    if (!src) return null;
    const want = String(expected);
    // A bare number is matched on digit boundaries, or "221" would claim every line holding
    // an id that happens to contain 221. Anything else is matched literally.
    const re = /^\d+$/.test(want) ? new RegExp("(^|[^0-9])" + want + "($|[^0-9])") : null;
    const hits = [];
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i++) if (re ? re.test(lines[i]) : lines[i].includes(want)) hits.push(i + 1);
    return hits.length > 0 && hits.length <= 5 ? hits : null;
  };
  console.log("\n## Did it go and look?\n");
  console.log("| variant | asked to read | reads/answer | aimed at the answer | right when aimed | right when not asked | extra $/answer |");
  console.log("| --- | --- | --- | --- | --- | --- | --- |");
  for (const v of readArms) {
    const R = run.filter((r) => r.variant === v);
    const asked = R.filter((r) => (r.reads ?? []).length > 0);
    const plain = R.filter((r) => (r.reads ?? []).length === 0);
    let aimable = 0;
    let aimed = 0;
    let aimedRight = 0;
    for (const r of asked) {
      const where = places(r.fixture, r.expected);
      if (!where) continue;
      aimable += 1;
      if ((r.reads ?? []).some((rd) => rd.offset <= where[where.length - 1] && rd.offset + rd.limit - 1 >= where[0])) {
        aimed += 1;
        if (r.correct) aimedRight += 1;
      }
    }
    const reads = R.reduce((s, r) => s + (r.reads ?? []).length, 0);
    const extra = R.reduce((s, r) => s + (r.extraUsd ?? 0), 0);
    console.log(
      `| \`${v}\` | ${pct(asked.length, R.length)} | ${(reads / R.length).toFixed(2)} | ` +
      `${aimable ? pct(aimed, aimable) + " (" + aimed + "/" + aimable + ")" : "-"} | ` +
      `${aimed ? pct(aimedRight, aimed) + " (" + aimedRight + "/" + aimed + ")" : "-"} | ` +
      `${pct(plain.filter((r) => r.correct).length, plain.length)} | ` +
      `${usd(extra / R.length)} |`,
    );
  }
  const silentUnread = misses.filter((r) => Array.isArray(r.reads) && r.reads.length === 0).length;
  console.log(
    `\nOf the ${misses.length} misses in this run, **${silentUnread} were answered without asking to read once**.`,
  );
}

// ---------------------------------------------------------------- two channels

/**
 * The frame and the written summary, on the same questions. "Carries" is what every later
 * request pays for the channel; "wrote" is the one-off model call that produced the summary,
 * amortised over the answers this run happens to ask. In a real session a summary is re-sent
 * for far more turns than a bench asks questions, so read the carrying column as the steady
 * state and the production column as an upper bound.
 */
const summaryArms = variants.filter((v) => run.some((r) => r.variant === v && (r.summaryCalls ?? 0) > 0));
const plainArms = variants.filter((v) => !summaryArms.includes(v) && !readArms.includes(v));
if (summaryArms.length > 0 && plainArms.length > 0) {
  const stat = (rows) => {
    const val = rows.filter((r) => r.kind === "value");
    const str = rows.filter((r) => r.kind === "structure");
    const wrong = rows.filter((r) => !r.correct);
    return {
      n: rows.length,
      ok: rows.filter((r) => r.correct).length,
      value: val.filter((r) => r.correct).length + "/" + val.length,
      structure: str.filter((r) => r.correct).length + "/" + str.length,
      carry: mean(rows.map((r) => r.measured ?? 0)),
      prod: rows.reduce((s, r) => s + (r.summaryUsd ?? 0), 0) / rows.length,
      calls: Math.max(0, ...rows.map((r) => r.summaryCalls ?? 0)),
      usd: mean(rows.map((r) => r.usd ?? 0)),
      silent: wrong.filter((r) => !isRefutable(r)).length,
      wrong: wrong.length,
    };
  };
  const order = [...plainArms, ...summaryArms];
  console.log("\n## Two channels, the same questions\n");
  console.log("| arm | carries tok/answer | wrote per answer | summary calls | correct | value | structure | $/answer | silent / all misses |");
  console.log("| --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const v of order) {
    const s = stat(run.filter((r) => r.variant === v));
    console.log(
      `| \`${v}\` | ${s.carry.toFixed(0)} | ${s.prod ? usd(s.prod) : "—"} | ${s.calls || "—"} | ` +
      `${s.ok}/${s.n} | ${s.value} | ${s.structure} | ${usd(s.usd)} | ${s.silent}/${s.wrong} |`,
    );
  }
  console.log("\n### Where each channel wins\n");
  console.log("| fixture | " + order.map((v) => "\`" + v + "\`").join(" | ") + " |");
  console.log("| --- |" + order.map(() => " --- |").join(""));
  for (const f of byFixture) {
    const cells = order.map((v) => {
      const R = run.filter((r) => r.fixture === f && r.variant === v);
      return R.length === 0 ? "—" : R.filter((r) => r.correct).length + "/" + R.length;
    });
    console.log("| \`" + f + "\` | " + cells.join(" | ") + " |");
  }
}
