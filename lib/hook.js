/** Mechanical summarizer: wrap the documented `summarize` hook on an existing engine.
 *  `/fast-compact` marks the agent via `withMechanicalFold`. If replace-default is on,
 *  every summarize path (`/compact`, auto, overflow) uses the local fold.
 *  Does not subclass or replace `ctx.compaction` (that would duplicate auto listeners).
 */

import { foldSummary } from "./fold.js";

const MECHANICAL_AGENTS = new WeakSet();
const WRAPPED_ENGINES = new WeakSet();

let replaceDefault = () => false;

export function setReplaceDefault(fn) {
  replaceDefault = typeof fn === "function" ? fn : () => Boolean(fn);
}

function replaceDefaultEnabled() {
  try {
    return Boolean(replaceDefault());
  } catch {
    return false;
  }
}

export function hookMechanicalSummarizer(engine) {
  if (!engine || typeof engine.summarize !== "function") return;
  if (WRAPPED_ENGINES.has(engine)) return;
  const original = engine.summarize;
  engine.summarize = async function summarize(input, agent, signal) {
    if ((agent && MECHANICAL_AGENTS.has(agent)) || replaceDefaultEnabled()) return foldSummary(input);
    return original.call(this, input, agent, signal);
  };
  WRAPPED_ENGINES.add(engine);
}

export async function withMechanicalFold(engine, agent, fn) {
  hookMechanicalSummarizer(engine);
  if (agent) MECHANICAL_AGENTS.add(agent);
  try {
    return await fn();
  } finally {
    if (agent) MECHANICAL_AGENTS.delete(agent);
  }
}

export function isMechanicalAgent(agent) {
  return Boolean(agent && MECHANICAL_AGENTS.has(agent));
}
