import { PACKAGE, SERVICE, NS, settingsSchema, DEFAULTS } from "./config.js";
import { HARD_PERCENT, PROACTIVE_PERCENT, percentOf, compactableTokens, iconFill, estTokensUtf8 } from "./tokens.js";
import { collectText, isPlaceholder } from "./excerpt.js";
import { shapeCurrentTurnIngress } from "./ingress.js";
import { resolveVisionRoute } from "./vision.js";
import { TYPERT } from "./typert.host.js";
import { getService } from "./ctx.js";
import { hookMechanicalSummarizer, withMechanicalFold } from "./hook.js";
import { resolveCompactionEngine } from "./resolve.js";
import { formatFoldNotice } from "./fold.js";

const name = PACKAGE;
const inject = ["commands", "settings", "typert"];
const WINDOW_BY_TARGET = new Map();

function cloneConfig(value) {
  return settingsSchema(value);
}

function routedTarget(agent) {
  const config = agent?.session?.requestHeader?.()?.config;
  if (config?.provider && config?.model) return { provider: config.provider, model: config.model };
  if (agent?.options?.provider && agent?.options?.model) {
    return { provider: agent.options.provider, model: agent.options.model };
  }
  return { provider: "", model: "" };
}

function contextWindowOf(info) {
  const n = info?.context?.contextWindow;
  return Number.isInteger(n) && n > 0 ? n : 0;
}

function cacheWindow(provider, model, window) {
  if (provider && model && window > 0) WINDOW_BY_TARGET.set(provider + "/" + model, window);
}

function windowFor(agent) {
  const target = routedTarget(agent);
  if (!target.provider || !target.model) return 0;
  return WINDOW_BY_TARGET.get(target.provider + "/" + target.model) || 0;
}

async function resolveWindow(ctx, provider, model, signal) {
  if (!provider || !model) return 0;
  const cached = WINDOW_BY_TARGET.get(provider + "/" + model) || 0;
  const llm = getService(ctx, "llm");
  if (!llm?.resolveModelInfo) return cached;
  try {
    const info = await llm.resolveModelInfo(provider, model, signal);
    const window = contextWindowOf(info);
    cacheWindow(provider, model, window);
    return window || cached;
  } catch {
    return cached;
  }
}

async function visionRouteFor(ctx, agent, config, signal) {
  const target = routedTarget(agent);
  let inputModalities;
  const llm = getService(ctx, "llm");
  if (target.provider && target.model && llm?.resolveModelInfo) {
    try {
      const info = await llm.resolveModelInfo(target.provider, target.model, signal);
      inputModalities = info?.inputModalities;
      cacheWindow(target.provider, target.model, contextWindowOf(info));
    } catch {
      inputModalities = undefined;
    }
  }
  return resolveVisionRoute({
    mainProvider: target.provider,
    mainModel: target.model,
    inputModalities,
    snapImages: config.snapImages
  });
}

function pressureOf(session, ctx, window) {
  if (!session) {
    return { used: 0, window: window || 0, percent: 0, compactable: 0, rawTok: 0, fill: 0 };
  }
  const measurement = measureSession(ctx, session);
  const used = measurement?.totalTokens ?? 0;
  const compactable = compactableTokens(measurement);
  const items = inventory(session);
  const rawTok = items.filter((it) => !it.shaped).reduce((n, it) => n + it.tokens, 0);
  const win = window || 0;
  return {
    used,
    window: win,
    percent: percentOf(used, win),
    compactable,
    rawTok,
    fill: iconFill(used, win, compactable)
  };
}

function measureSession(ctx, session) {
  try {
    return getService(ctx, "tokenMeter")?.measure?.(session) ?? null;
  } catch {
    return null;
  }
}

function inventory(session, top = 8) {
  const items = [];
  const nodes = [...(session?.surface?.nodes ?? [])];
  for (let i = 0; i < nodes.length; i++) {
    const event = session.events[nodes[i]];
    if (event?.type !== "tool/result") continue;
    const text = collectText(event.data?.message?.content);
    const tokens = estTokensUtf8(text);
    if (tokens < 80) continue;
    items.push({
      tokens,
      age: nodes.length - 1 - i,
      shaped: isPlaceholder(text)
    });
  }
  items.sort((a, b) => b.tokens - a.tokens);
  return items.slice(0, top);
}

function formatStatus(session, ctx, route, config, pressure) {
  const p = pressure || pressureOf(session, ctx, 0);
  const vision = route.ingressVision ? "image" : "excerpt";
  const next = p.window && p.percent >= HARD_PERCENT ? "fold?" : "idle";
  const hint = p.window && p.percent >= PROACTIVE_PERCENT ? " → /fast-compact (confirm in UI)" : "";
  const windowLabel = p.window ? p.used + "/" + p.window + " (" + p.percent + "%)" : "~" + p.used + " tok";
  const lines = [
    "fast-compact: " + windowLabel + " next=" + next
      + " ingress=" + (config.enabled ? "on" : "off")
      + " snap=" + (route.ingressVision ? "on" : (config.snapImages ? "need-image-modality" : "off"))
      + " raw≈" + p.rawTok
      + " fold≈" + p.compactable + hint
  ];
  lines.push("  fold mechanical (no model); bolt requires a second click");
  const items = inventory(session);
  if (items.length === 0) lines.push("  无大块");
  else for (const it of items) lines.push("  " + it.tokens + "tok age=" + it.age + (it.shaped ? " shaped" : " raw"));
  return { text: lines.join("\n"), vision, ...p };
}

function isManualCompactionError(error) {
  return Boolean(error && error.name === "ManualCompactionError" && typeof error.code === "string");
}

function expectedFailure(error) {
  switch (error.code) {
    case "busy":
      return { kind: "error", text: "Fast compact is unavailable because compaction is already running, or the agent is not idle." };
    case "cancelled":
      return { kind: "error", text: "Fast compact cancelled." };
    case "changed":
      return { kind: "error", text: "The history selected for fast compact changed before it could be replaced. The conversation is unchanged." };
    case "summary":
      return { kind: "error", text: "Fast compact could not produce a smaller ledger. The conversation is unchanged." };
    case "commit":
      return { kind: "error", text: "Fast compact did not finish cleanly; inspect the current session before retrying." };
    case "persistence":
      return { kind: "error", text: "Fast compact finished, but the session could not be saved." };
    default:
      return { kind: "error", text: "Fast compact failed: " + error.message };
  }
}

function parseCommand(rawInput) {
  const text = String(rawInput ?? "").trim();
  if (!text) return { op: "fold" };
  const parts = text.split(/\s+/);
  if (parts[0] === "status") return { op: "status" };
  return { op: "error", text: "Usage: /fast-compact | /fast-compact status" };
}

async function executeFastCompact(ctx, invocation, getConfig) {
  const parsed = parseCommand(invocation.rawInput);
  if (parsed.op === "error") return { kind: "error", text: parsed.text };
  const config = getConfig();
  if (parsed.op === "status") {
    const route = await visionRouteFor(ctx, invocation.agent, config, invocation.signal);
    const window = await resolveWindow(ctx, route.mainProvider, route.mainModel, invocation.signal);
    const pressure = pressureOf(invocation.agent.session, ctx, window);
    const status = formatStatus(invocation.agent.session, ctx, route, config, pressure);
    return { kind: "success", text: status.text };
  }
  const compaction = resolveCompactionEngine(ctx, invocation.agent);
  if (!compaction) {
    return { kind: "error", text: "Fast compact is unavailable: no compaction engine is active for this agent." };
  }
  try {
    const result = await withMechanicalFold(compaction, invocation.agent, () =>
      compaction.compactNow(invocation.agent, invocation.signal, invocation.commandId)
    );
    if (result === null) return { kind: "success", text: "暂无可折页的历史。" };
    return {
      kind: "success",
      text: formatFoldNotice(result),
      sourceEventSeq: result.summarySeq
    };
  } catch (error) {
    if (invocation.signal.aborted) return { kind: "error", text: "Fast compact cancelled." };
    if (isManualCompactionError(error)) return expectedFailure(error);
    throw error;
  }
}

function apply(ctx) {
  const scope = ctx.settings.register(NS, settingsSchema, { base: DEFAULTS });
  let writeTail = Promise.resolve();
  const getConfig = () => cloneConfig(scope.get());
  const saveConfig = (next) => {
    const run = writeTail.catch(() => undefined).then(() => scope.replace(cloneConfig(next)));
    writeTail = run.then(() => undefined, () => undefined);
    return run;
  };

  const service = {
    getState() {
      return getConfig();
    },
    saveConfig(config) {
      return saveConfig(config).then(() => getConfig());
    },
    async getStatus(sessionId) {
      const config = getConfig();
      const session = getService(ctx, "sessions")?.get?.(sessionId);
      if (!session) {
        const route = resolveVisionRoute({ snapImages: config.snapImages });
        return { ...config, text: formatStatus(null, ctx, route, config).text, missingSession: true };
      }
      const header = session.requestHeader?.()?.config ?? {};
      const agentLike = { session, options: header };
      const live = await visionRouteFor(ctx, agentLike, config);
      const window = await resolveWindow(ctx, live.mainProvider, live.mainModel);
      const status = formatStatus(session, ctx, live, config, pressureOf(session, ctx, window));
      return { ...config, ...status, ...live };
    },
    async getPressure(sessionId) {
      const session = getService(ctx, "sessions")?.get?.(sessionId);
      if (!session) return pressureOf(null, ctx, 0);
      const header = session.requestHeader?.()?.config ?? {};
      const window = await resolveWindow(ctx, header.provider, header.model);
      return pressureOf(session, ctx, window);
    }
  };
  service.typertRemote = { service, serviceKey: SERVICE, namespace: SERVICE };
  ctx.provide(SERVICE, service);
  ctx.typert.register(TYPERT);

  const hostCompaction = ctx.get?.("compaction");
  if (hostCompaction) hookMechanicalSummarizer(hostCompaction);

  ctx.effect(() => ctx.on("agent/pre-step", async (payload, next) => {
    const config = getConfig();
    if (config.enabled && payload?.agent?.session) {
      try {
        const route = await visionRouteFor(ctx, payload.agent, config, payload.signal);
        await shapeCurrentTurnIngress(payload.agent.session, ctx, {
          turn: payload.turn,
          step: payload.step,
          vision: route.ingressVision,
          model: route.mainModel,
          minSnapTokens: config.minSnapTokens,
          savingsRatio: config.savingsRatio
        });
      } catch (error) {
        ctx.logger?.warn?.("dsh-ledger-compact: ingress shaping failed: " + (error instanceof Error ? error.message : String(error)));
      }
    }
    return next();
  }, { prepend: true }), "dsh-ledger-compact: ingress");

  const active = new Set();
  const handler = (invocation) => {
    const operation = executeFastCompact(ctx, invocation, getConfig);
    active.add(operation);
    const retire = () => { active.delete(operation); };
    operation.then(retire, retire);
    return operation;
  };
  ctx.effect(() => ctx.commands.register({
    name: "fast-compact",
    description: "Local mechanical fold (no model). Destructive: prefer the input-bar confirm. /fast-compact status",
    input: { hint: "status" },
    handler
  }), "dsh-ledger-compact: command");
  ctx.effect(() => () => Promise.allSettled(active), "dsh-ledger-compact: drain");
  ctx.logger?.info?.("dsh-ledger-compact: mechanical /fast-compact + ingress shaping");
}

export { apply, inject, name, parseCommand, hookMechanicalSummarizer, withMechanicalFold, resolveCompactionEngine };
export default { apply, inject, name };
