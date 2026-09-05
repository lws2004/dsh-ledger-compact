/** Locate this agent's compaction engine.
 *
 * On web, `@deepseek-ai/dsh-compaction-basic` is remounted inside the preset
 * `compaction` isolate. Host `ctx.get("compaction")` and even
 * `agent.ctx.get("compaction")` miss it: the standing preset mount is joined
 * by scope parent, not as a child of the agent fiber. `agentPresets.serviceFor`
 * is the supported host-side read of that isolated instance.
 */

const ACTIVE = 2;

function serviceOf(value) {
  return value && typeof value.compactNow === "function" ? value : undefined;
}

function tryGet(ctx, name) {
  if (!ctx || typeof ctx.get !== "function") return undefined;
  try {
    return ctx.get(name);
  } catch {
    return undefined;
  }
}

function tryRead(read) {
  try {
    return read();
  } catch {
    return undefined;
  }
}

function isActiveFiber(fiber) {
  if (!fiber || fiber.state === undefined) return true;
  return fiber.state === ACTIVE;
}

function collectEngines(store) {
  const found = [];
  if (!store) return found;
  const seen = new Set();
  for (const key of Object.getOwnPropertySymbols(store)) {
    const entry = store[key];
    if (entry?.name !== "compaction") continue;
    if (!isActiveFiber(entry.fiber)) continue;
    const engine = serviceOf(entry.value);
    if (!engine || seen.has(engine)) continue;
    seen.add(engine);
    found.push(engine);
  }
  return found;
}

function reflectStore(ctx) {
  return tryRead(() => ctx?.reflect?.store) || tryRead(() => ctx?.root?.reflect?.store);
}

export function collectCompactionEngines(ctx, agent) {
  const seen = new Set();
  const found = [];
  const add = (value) => {
    const engine = serviceOf(value);
    if (!engine || seen.has(engine)) return;
    seen.add(engine);
    found.push(engine);
  };
  add(tryGet(ctx, "compaction"));
  add(tryGet(agent?.ctx, "compaction"));
  const presets = tryGet(ctx, "agentPresets") || tryGet(agent?.ctx, "agentPresets");
  if (presets && typeof presets.serviceFor === "function" && agent) {
    add(tryRead(() => presets.serviceFor(agent, "compaction")));
  }
  for (const engine of collectEngines(reflectStore(agent?.ctx))) add(engine);
  for (const engine of collectEngines(reflectStore(ctx))) add(engine);
  return found;
}

export function resolveCompactionEngine(ctx, agent) {
  const host = serviceOf(tryGet(ctx, "compaction"));
  if (host) return host;
  const agentCtx = agent?.ctx;
  const scoped = serviceOf(tryGet(agentCtx, "compaction"));
  if (scoped) return scoped;
  const presets = tryGet(ctx, "agentPresets") || tryGet(agentCtx, "agentPresets");
  if (presets && typeof presets.serviceFor === "function" && agent) {
    const isolated = serviceOf(tryRead(() => presets.serviceFor(agent, "compaction")));
    if (isolated) return isolated;
  }
  const engines = collectEngines(reflectStore(agentCtx) || reflectStore(ctx));
  return engines.length === 1 ? engines[0] : undefined;
}
