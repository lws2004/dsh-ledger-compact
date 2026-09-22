/** Ingress excerpt: head/tail slice with a re-read contract. Never mutates later. */

import { clampUtf8 } from "./tokens.js";

export const SNAP_HEAD_LINES = 16;
export const SNAP_TAIL_LINES = 8;
export const SNAP_EXCERPT_MAX = 2400;

export const PLACEHOLDER_PREFIXES = [
  "[Output truncated",
  "[Superseded",
  "[Artifact stored",
  "[Shake elided",
  "[Snapcompact",
  "[Ledger]",
  "[Uneventful",
  "[image omitted",
  "[... tool result middle pruned"
];

export function isPlaceholder(text) {
  const value = String(text ?? "").trimStart();
  return PLACEHOLDER_PREFIXES.some((p) => value.startsWith(p));
}

export function skipIngressTool(name) {
  const tool = String(name ?? "");
  return tool === "skill" || tool === "context";
}

/**
 * Whether a result is instruction text that has to arrive whole.
 *
 * A skill body is a command to follow, not data to sample: an excerpt drops clauses
 * and the miss is silent, because the model cannot tell what it never saw. The tag is
 * a stable marker, so this guard holds even when the tool-name lookup does not.
 */
const INSTRUCTION_PREFIXES = ["<skill_content", "<skill_instructions"];

export function isInstructionText(text) {
  const head = String(text ?? "").trimStart();
  return INSTRUCTION_PREFIXES.some((prefix) => head.startsWith(prefix));
}

export function snapExcerpt(text, options = {}) {
  const head = options.headLines ?? SNAP_HEAD_LINES;
  const tail = options.tailLines ?? SNAP_TAIL_LINES;
  const maxBytes = options.maxBytes ?? SNAP_EXCERPT_MAX;
  const value = String(text ?? "");
  const lines = value.split("\n");
  let body;
  if (lines.length <= head + tail) body = value;
  else {
    const skipped = lines.length - head - tail;
    body = lines.slice(0, head).join("\n")
      + "\n… (" + skipped + " lines elided; see image if attached. To inspect or edit exact bytes, re-read with offset/limit) …\n"
      + lines.slice(-tail).join("\n");
  }
  return clampUtf8(body, maxBytes);
}

/** A token longer than this is structure (a path, a timestamp), not a value. */
const DIGEST_MAX_TOKEN = 16;
/** A token has to repeat this often before a count question can be about it. */
const DIGEST_MIN_COUNT = 3;
const DIGEST_TOP = 8;

/**
 * Mechanical whole-file totals — the values a "how many X are in this file" question is
 * about, counted for free in text. Neither a picture nor a head/tail excerpt can count a
 * 2000-line file, and the model cannot count it either; measured paired over 168
 * questions, this line takes that class from 35% to 78% structure accuracy and leaves
 * exact-value reading untouched (bench/FINDINGS.md, `excerpt-digest`).
 */
export function tokenDigest(text, options = {}) {
  const top = options.top ?? DIGEST_TOP;
  const counts = new Map();
  for (const raw of String(text ?? "").split(/\s+/)) {
    const token = raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}%]+$/gu, "");
    if (!token || token.length > DIGEST_MAX_TOKEN) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  const rows = [...counts]
    .filter(([, n]) => n >= DIGEST_MIN_COUNT)
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, top);
  return rows.length === 0 ? "" : "whole-file totals: " + rows.map(([t, n]) => t + "×" + n).join(" · ");
}

export function excerptNotice(originalTokens, excerpt, extra = "", digest = "", source = "") {
  // The source label is the whole point of the line: bench/FINDINGS.md found the
  // offset/limit re-read works but nothing cheap makes the model take one, because a
  // bare excerpt names neither the call nor the file it came from. Naming both lets the
  // model re-run the same read instead of guessing at what it is missing.
  const label = source ? " · " + source : "";
  const head = extra
    ? "[Snapcompact: " + originalTokens + " tokens → " + extra + label + "]"
    : "[Snapcompact: " + originalTokens + " tokens → excerpt" + label + "]";
  return head + "\n" + excerpt + (digest ? "\n" + digest : "");
}

/** Arguments that identify *which* call produced a result, most specific first. */
const SOURCE_ARG_KEYS = ["file_path", "notebook_path", "path", "command", "pattern", "query", "url", "description"];
/** Kept short on purpose: the label is priced like text on every later request. */
const SOURCE_ARG_MAX = 60;

function oneLine(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

function sourceArgOf(input) {
  if (!input || typeof input !== "object") return "";
  for (const key of SOURCE_ARG_KEYS) {
    const value = input[key];
    if (typeof value !== "string" || !value.trim()) continue;
    const flat = oneLine(value);
    return flat.length > SOURCE_ARG_MAX ? flat.slice(0, SOURCE_ARG_MAX - 1) + "…" : flat;
  }
  return "";
}

/**
 * Name the call an excerpt came from, so the excerpt stays addressable.
 *
 * A tool name alone says whether the result can be reproduced; the identifying
 * argument says where to re-read it. Both are needed to turn "this was truncated"
 * into an actionable re-read, and neither is available from the excerpt body.
 *
 * `description` is last on purpose: it is the weakest locator, but it is the only
 * one a wrapper tool has. Under this deployment every call arrives as `run_code`,
 * whose identifying argument is the task summary the model wrote, so without it the
 * label would name nothing beyond the wrapper itself.
 *
 * @param name - the `tool/call` name, empty when the log lookup found none.
 * @param input - the call arguments, when the event carried them.
 * @returns a one-line label such as `read src/a.ts`, or "" when nothing is known.
 */
export function toolSourceLabel(name, input) {
  const tool = oneLine(name ?? "");
  const detail = sourceArgOf(input);
  if (!tool) return detail;
  return detail ? tool + " " + detail : tool;
}

export function collectText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  const parts = [];
  for (const block of content) {
    if (!block || typeof block !== "object") continue;
    if (block.type === "text" && typeof block.text === "string") parts.push(block.text);
    else if (block.type === "tool-result" && Array.isArray(block.content)) parts.push(collectText(block.content));
  }
  return parts.filter(Boolean).join("\n");
}
