/** Mechanical summarizer: wrap the documented `summarize` hook on an existing engine.
 *  Only agents inside `withMechanicalFold` take the local fold; `/compact` stays LLM.
 *  Does not subclass or replace `ctx.compaction` (that would duplicate auto listeners).
 */

import { foldSummary } from "./fold.js";

const MECHANICAL_AGENTS = new WeakSet();
const WRAPPED_ENGINES = new WeakSet();

export function hookMechanicalSummarizer(engine) {
  if (!engine || typeof engine.summarize !== "function") return;
  if (WRAPPED_ENGINES.has(engine)) return;
  const original = engine.summarize;
  engine.summarize = async function summarize(input, agent, signal) {
    if (agent && MECHANICAL_AGENTS.has(agent)) return foldSummary(input);
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
