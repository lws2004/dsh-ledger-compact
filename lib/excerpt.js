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

export function excerptNotice(originalTokens, excerpt, extra = "") {
  const head = extra
    ? "[Snapcompact: " + originalTokens + " tokens → " + extra + "]"
    : "[Snapcompact: " + originalTokens + " tokens → excerpt]";
  return head + "\n" + excerpt;
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
