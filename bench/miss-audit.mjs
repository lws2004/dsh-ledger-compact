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

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fixtures } from "./fixtures.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const RESULTS = join(here, ".cache", "last-results.json");

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

/** The source text of each fixture, so a wrong answer can be checked against the real file. */
const sources = new Map(fixtures().map((f) => [f.name, f.lines.join("\n")]));

const rows = JSON.parse(readFileSync(RESULTS, "utf8"));
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
const misses = run.filter((r) => !r.correct);
let refutable = 0;
let silent = 0;
let inSource = 0;
let sameWidth = 0;
const perFixture = new Map();
for (const r of misses) {
  const answer = String(r.answer).trim();
  const expected = String(r.expected).trim();
  // A count question whose answer exceeds the range it counts refutes itself; so does a
  // question that demanded a bare number and got prose back.
  const range = /first ten/i.test(r.qa) ? 10 : (r.qa.match(/first (\d+)/) ?? r.qa.match(/前 (\d+)/) ?? [])[1];
  const counted = /how many|几批|几/i.test(r.qa) && range != null && bare(answer) && Number(answer) > Number(range);
  const shaped = /只回答数字|Answer with a number/i.test(r.qa) && !bare(answer);
  const present = tok(answer) !== "" && sources.get(r.fixture)?.includes(tok(answer));
  const width = tok(answer).length > 0 && tok(answer).length === tok(expected).length;
  if (counted || shaped) refutable += 1;
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
