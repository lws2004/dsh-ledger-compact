import test from "node:test";
import assert from "node:assert/strict";
import { estTokensUtf8, clampUtf8, compactableTokens, iconFill, FILL_SOFT_TOKENS } from "./tokens.js";
import { resolveVisionRoute } from "./vision.js";
import { isPlaceholder, snapExcerpt, collectText } from "./excerpt.js";
import { shapeIngress, shapeCurrentTurnIngress, resetReplaceOpShape, usesLegacyReplaceKeys } from "./ingress.js";
import { buildFold, foldSummary, inspectMessages, carriedFromFold, formatFoldNotice, formatTokenCount, collectSummaryText, parseFoldNotice, FOLD_CARD_MARKER } from "./fold.js";
import { parseCommand } from "./index.js";
import { hookMechanicalSummarizer, hookStats, withMechanicalFold, isMechanicalAgent, setReplaceDefault } from "./hook.js";
import { resolveCompactionEngine, collectCompactionEngines } from "./resolve.js";
import { raster, resolveShape, lookup8 } from "./snapfont.js";
import { encodePngGray } from "./png.js";
import { settingsSchema } from "./config.js";
import { sessionEvent } from "./ctx.js";

function user(text) {
  return { role: "user", content: [{ type: "text", text }], source: { kind: "user" } };
}
function assistant(blocks) {
  return { role: "assistant", content: blocks, source: { kind: "model", provider: "x", model: "y" } };
}
function toolCall(id, name, args) {
  return { type: "tool-call", id, name, arguments: JSON.stringify(args) };
}
function toolResult(id, text, isError) {
  return {
    role: "user",
    source: { kind: "tool", callId: id },
    content: [{ type: "tool-result", toolCallId: id, isError: isError === true, content: [{ type: "text", text }] }]
  };
}

test("estTokensUtf8 counts ascii cheaper than wide glyphs", () => {
  assert.ok(estTokensUtf8("abcd") <= 1);
  assert.ok(estTokensUtf8("你好世界") >= 4);
});

test("compactableTokens drops the newest node", () => {
  assert.equal(compactableTokens({ nodes: [] }), 0);
  assert.equal(compactableTokens({ nodes: [{ tokens: 90 }] }), 0);
  assert.equal(compactableTokens({ nodes: [{ tokens: 40 }, { heuristicTokens: 10 }, { tokens: 999 }] }), 50);
});

test("iconFill prefers context pressure then foldable mass", () => {
  assert.equal(iconFill(0, 0, 0), 0);
  assert.equal(iconFill(40, 100, 9999), 0.4);
  assert.equal(iconFill(0, 0, FILL_SOFT_TOKENS), 1);
  assert.ok(iconFill(0, 0, FILL_SOFT_TOKENS / 2) > 0.49);
  assert.ok(iconFill(0, 0, FILL_SOFT_TOKENS / 2) < 0.51);
});

test("clampUtf8 does not split a multibyte char", () => {
  const s = clampUtf8("你好", 2);
  assert.equal(Buffer.from(s, "utf8").length <= 2, true);
});

test("ingress vision requires snapImages and explicit image modality", () => {
  assert.equal(resolveVisionRoute({
    mainModel: "grok-4.6",
    snapImages: true
  }).ingressVision, false);
  assert.equal(resolveVisionRoute({
    mainModel: "claude-sonnet-4",
    inputModalities: ["text"],
    snapImages: true
  }).ingressVision, false);
  assert.equal(resolveVisionRoute({
    mainModel: "custom-model",
    inputModalities: ["text", "image"],
    snapImages: false
  }).ingressVision, false);
  assert.equal(resolveVisionRoute({
    mainModel: "custom-model",
    inputModalities: ["text", "image"],
    snapImages: true
  }).ingressVision, true);
});

test("settings keep an explicit enabled key and only honour legacy ingress without one", () => {
  // A stored `enabled` always wins, so the UI switch can turn ingress back on.
  assert.equal(settingsSchema({ enabled: true, ingress: false }).enabled, true);
  // The retired sidecar key still decides for documents that never wrote `enabled`.
  assert.equal(settingsSchema({ ingress: false }).enabled, false);
  assert.equal(settingsSchema({ enabled: false, ingress: true }).enabled, false);
  const collapsed = settingsSchema({ enabled: true, visionModel: "gpt-4o" });
  assert.equal(collapsed.snapImages, false);
  assert.equal(collapsed.confirmFold, true);
  assert.equal(collapsed.replaceDefault, false);
  assert.equal("visionModel" in collapsed, false);
  assert.equal(settingsSchema({ snapImages: true }).snapImages, true);
  assert.equal(settingsSchema({ confirmFold: false }).confirmFold, false);
  assert.equal(settingsSchema({ replaceDefault: true }).replaceDefault, true);
  assert.equal(settingsSchema({ minSnapTokens: 10 }).minSnapTokens, 200);
  const json = settingsSchema.toJSON();
  assert.equal(json.type, "object");
  assert.equal(json.dict.enabled.type, "boolean");
  assert.equal(json.dict.confirmFold.meta.default, true);
  assert.equal(json.dict.replaceDefault.meta.default, false);
});

test("snapExcerpt keeps head and tail and names the re-read contract", () => {
  const lines = Array.from({ length: 40 }, (_, i) => "L" + i);
  const out = snapExcerpt(lines.join("\n"));
  assert.ok(out.includes("L0"));
  assert.ok(out.includes("L39"));
  assert.equal(out.includes("L20"), false);
  assert.ok(out.includes("re-read with offset/limit"));
});

test("shapeIngress leaves small blobs and placeholders alone", () => {
  assert.equal(shapeIngress("short").changed, false);
  assert.equal(shapeIngress("[Snapcompact: 9 tokens → excerpt]\nalready").changed, false);
  assert.equal(shapeIngress("x".repeat(20000), { toolName: "skill" }).changed, false);
});

test("shapeIngress excerpts large text without vision and never attaches an image", () => {
  const text = Array.from({ length: 200 }, (_, i) => "line-" + i + " " + "abcd".repeat(40)).join("\n");
  const shaped = shapeIngress(text, { vision: false, minSnapTokens: 100 });
  assert.equal(shaped.changed, true);
  assert.equal(shaped.snapped, false);
  assert.equal(shaped.excerpted, true);
  assert.ok(shaped.tokensSaved > 0);
  assert.equal(shaped.image, undefined);
  assert.ok(shaped.text.startsWith("[Snapcompact:"));
});

test("shapeIngress with vision still falls back when the image is not cheaper", () => {
  const text = Array.from({ length: 80 }, (_, i) => "n" + i).join("\n");
  const shaped = shapeIngress(text, { vision: true, model: "claude-sonnet-4", minSnapTokens: 10, savingsRatio: 0.01 });
  assert.equal(shaped.snapped, false);
});

test("shapeCurrentTurnIngress does not rewrite without a token meter", async () => {
  const session = { surface: { nodes: [1] }, events: { 1: { type: "tool/result" } }, append() { throw new Error("must not append"); } };
  const report = await shapeCurrentTurnIngress(session, { get() { return undefined; } }, { turn: 1, step: 2 });
  assert.equal(report.shaped, 0);
});

test("fold card keeps files/intents and drops prior checkpoints", () => {
  const ledger = buildFold([
    user("This is an automatically generated checkpoint\n\n<compacted-summary>\nOld atlas\n</compacted-summary>"),
    user("Keep going with the plugin"),
    assistant([
      { type: "text", text: "I will inspect the repo." },
      toolCall("c1", "read", { file_path: "lib/index.js" }),
      toolCall("c2", "bash", { command: "ls -la" })
    ]),
    toolResult("c1", "     1| export function apply() {}"),
    toolResult("c2", "file-a\nfile-b\n[exit code: 0]")
  ]);
  assert.ok(ledger.includes("[Snapcompact]"));
  assert.ok(ledger.includes("Keep going with the plugin"));
  assert.equal(ledger.includes("Old atlas"), false);
  assert.ok(ledger.includes("lib/index.js"));
  assert.ok(ledger.includes("ls -la"));
  assert.equal(ledger.includes("export function apply()"), false);
});

test("inspectMessages records grep/glob paths and failed commands", () => {
  const snapshot = inspectMessages([
    user("fix it"),
    assistant([
      toolCall("c3", "edit", { file_path: "lib/index.js" }),
      toolCall("c4", "grep", { path: "lib", pattern: "apply" }),
      toolCall("c5", "glob", { pattern: "lib/*.js" })
    ]),
    toolResult("c3", "SyntaxError: unexpected token\n[exit code: 1]", true),
    toolResult("c4", "lib/index.js:1"),
    toolResult("c5", "lib/index.js\nlib/fold.js")
  ]);
  assert.equal(snapshot.edits.includes("lib/index.js"), true);
  assert.equal(snapshot.reads.includes("lib"), true);
  assert.equal(snapshot.reads.includes("lib/*.js"), true);
  assert.equal(snapshot.errors.length, 1);
  assert.deepEqual(snapshot.tools.map((item) => item.name).sort(), ["edit", "glob", "grep"]);
});

test("formatFoldNotice embeds a structured card instead of the raw excerpt", () => {
  assert.equal(formatTokenCount(68055), "68,055");
  assert.equal(collectSummaryText([{ type: "text", text: "alpha" }, { type: "image" }]), "alpha");
  const text = formatFoldNotice({
    shadowedSeqs: [1, 2, 3],
    shadowedTokenCount: 68055,
    summary: [{ type: "text", text: "[Snapcompact] Fold ~68055 tok.\nFILES\n- [edit] lib/index.js\nINTENTS\n- keep going\nTOOLS\n- read 4\nEXCERPT\n[user] dumped" }]
  });
  assert.equal(text.startsWith("已折页 3 条历史（约 68,055 tokens）"), true);
  assert.ok(text.includes(FOLD_CARD_MARKER));
  assert.equal(text.includes("\nEXCERPT\n"), false);
  const parsed = parseFoldNotice(text);
  assert.deepEqual(parsed.card.edits, ["lib/index.js"]);
  assert.deepEqual(parsed.card.intents, ["keep going"]);
  assert.deepEqual(parsed.card.tools, [{ name: "read", n: 4 }]);
  assert.deepEqual(parsed.card.excerpt, ["[user] dumped"]);
  assert.equal(parsed.card.items, 3);
  assert.equal(parsed.card.tokens, 68055);
});

test("foldSummary is unmarked local output", () => {
  const result = foldSummary({ messages: [user("Ship it")] });
  assert.equal(result.provider, "dsh-ledger-compact");
  assert.equal(result.llmStreamCall, undefined);
  assert.ok(result.summary[0].text.includes("Ship it"));
});

test("parseCommand accepts status and rejects vision sidecar routing", () => {
  assert.deepEqual(parseCommand(""), { op: "fold" });
  assert.deepEqual(parseCommand("status"), { op: "status" });
  assert.equal(parseCommand("vision off").op, "error");
  assert.equal(parseCommand("vision openai gpt-4o").op, "error");
});

test("mechanical hook only intercepts the marked agent", async () => {
  let originalCalled = 0;
  const engine = {
    summarize: async () => {
      originalCalled += 1;
      return { summary: [{ type: "text", text: "llm" }], provider: "llm", model: "big" };
    }
  };
  const marked = { id: "fold" };
  const other = { id: "compact" };
  hookMechanicalSummarizer(engine);
  const llm = await engine.summarize({ messages: [user("Keep LLM")] }, other);
  assert.equal(llm.provider, "llm");
  const local = await withMechanicalFold(engine, marked, () => engine.summarize({ messages: [user("Ship the plugin")] }, marked));
  assert.equal(originalCalled, 1);
  assert.equal(local.provider, "dsh-ledger-compact");
  assert.equal(local.model, "local-ledger");
  assert.ok(local.summary[0].text.includes("Ship the plugin"));
  assert.equal(isMechanicalAgent(marked), false);
  const after = await engine.summarize({ messages: [user("Keep LLM")] }, marked);
  assert.equal(after.provider, "llm");
  assert.equal(originalCalled, 2);
});

test("replaceDefault intercepts unmarked agents and stays live", async () => {
  let originalCalled = 0;
  let replace = false;
  setReplaceDefault(() => replace);
  try {
    const engine = {
      summarize: async () => {
        originalCalled += 1;
        return { summary: [{ type: "text", text: "llm" }], provider: "llm", model: "big" };
      }
    };
    const agent = { id: "auto" };
    hookMechanicalSummarizer(engine);
    const before = await engine.summarize({ messages: [user("Keep LLM")] }, agent);
    assert.equal(before.provider, "llm");
    replace = true;
    const local = await engine.summarize({ messages: [user("Ship the plugin")] }, agent);
    assert.equal(originalCalled, 1);
    assert.equal(local.provider, "dsh-ledger-compact");
    replace = false;
    const after = await engine.summarize({ messages: [user("Keep LLM")] }, agent);
    assert.equal(after.provider, "llm");
    assert.equal(originalCalled, 2);
  } finally {
    setReplaceDefault(() => false);
  }
});

test("snapfont loads 8x13 and rasters ascii", () => {
  assert.ok(lookup8(65));
  const frame = raster("ABC", resolveShape("gpt-4o"), 4);
  assert.ok(frame);
  assert.ok(frame.w > 0 && frame.h > 0);
  const png = encodePngGray(frame.pixels, frame.w, frame.h);
  assert.equal(png[0], 137);
  assert.ok(png.length > 32);
});

test("collectText walks nested tool-result blocks", () => {
  assert.equal(collectText([{ type: "tool-result", content: [{ type: "text", text: "hi" }] }]), "hi");
});

test("resolveCompactionEngine uses agentPresets.serviceFor for isolated engines", () => {
  const engineA = { compactNow() {} };
  const engineB = { compactNow() {} };
  const store = {};
  store[Symbol("a")] = { name: "compaction", value: engineA, fiber: { state: 2 } };
  store[Symbol("b")] = { name: "compaction", value: engineB, fiber: { state: 2 } };
  const agent = { ctx: { get() { return undefined; }, reflect: { store } } };
  const ctx = {
    get(name) {
      if (name === "agentPresets") {
        return { serviceFor(target, service) {
          assert.equal(target, agent);
          assert.equal(service, "compaction");
          return engineB;
        } };
      }
      return undefined;
    },
    reflect: { store }
  };
  assert.equal(resolveCompactionEngine(ctx, agent), engineB);
});

test("resolveCompactionEngine uses the only active isolated engine", () => {
  const engine = { compactNow() {} };
  const store = {};
  store[Symbol("c")] = { name: "compaction", value: engine, fiber: { state: 2 } };
  const ctx = { get() { return undefined; }, reflect: { store } };
  assert.equal(resolveCompactionEngine(ctx, { ctx: { get() { return undefined; } } }), engine);
});

test("collectCompactionEngines returns every active engine", () => {
  const engineA = { compactNow() {} };
  const engineB = { compactNow() {} };
  const store = {};
  store[Symbol("a")] = { name: "compaction", value: engineA, fiber: { state: 2 } };
  store[Symbol("b")] = { name: "compaction", value: engineB, fiber: { state: 2 } };
  const ctx = { get() { return undefined; }, reflect: { store } };
  const found = collectCompactionEngines(ctx);
  assert.equal(found.length, 2);
  assert.ok(found.includes(engineA));
  assert.ok(found.includes(engineB));
});

test("resolveCompactionEngine does not guess among multiple isolated engines", () => {
  const store = {};
  store[Symbol("a")] = { name: "compaction", value: { compactNow() {} }, fiber: { state: 2 } };
  store[Symbol("b")] = { name: "compaction", value: { compactNow() {} }, fiber: { state: 2 } };
  const ctx = { get() { return undefined; }, reflect: { store } };
  assert.equal(resolveCompactionEngine(ctx, { ctx: { get() { return undefined; } } }), undefined);
});

test("isPlaceholder covers snapcompact and prune markers", () => {
  assert.equal(isPlaceholder("[Snapcompact: 3000 tokens → excerpt]"), true);
  assert.equal(isPlaceholder("[... tool result middle pruned ...]"), true);
  assert.equal(isPlaceholder("real tool output"), false);
});

/** Minimal stand-in for the DSH 0.1.5 Session surface API. */
function fakeSession(events, options = {}) {
  const log = events.map((event) => ({ ...event }));
  const nodes = events.map((event) => event.seq);
  const surface = { nodes };
  return {
    surface,
    log,
    eventAt(seq) {
      return log.find((event) => event.seq === seq);
    },
    append(type, data, opts) {
      const op = opts?.surfaceOp;
      if (op !== undefined && op !== "append") {
        const modern = op && typeof op === "object" && "startSeq" in op && "endSeq" in op;
        const legacy = op && typeof op === "object" && "start" in op && "end" in op;
        const accepted = options.legacyKeys ? legacy : modern;
        if (!accepted || op.op !== "replace") {
          throw new Error('session event "' + type + '" carries an invalid replace surfaceOp');
        }
      }
      const event = { type, seq: log.length, data, ...(opts ?? {}) };
      log.push(event);
      if (op === "append") nodes.push(event.seq);
      else if (op && typeof op === "object") {
        const start = op.startSeq ?? op.start;
        const end = op.endSeq ?? op.end;
        nodes.splice(nodes.indexOf(start), nodes.indexOf(end) - nodes.indexOf(start) + 1, event.seq);
      }
      return event;
    }
  };
}

function textOfEvent(event) {
  return collectText(event?.data?.message?.content);
}

const BIG_TEXT = Array.from({ length: 200 }, (_, i) => "line-" + i + " " + "abcd".repeat(40)).join("\n");

test("sessionEvent prefers eventAt and falls back to the legacy events array", () => {
  const event = { seq: 7, type: "tool/result" };
  assert.equal(sessionEvent({ eventAt: (seq) => (seq === 7 ? event : undefined) }, 7)?.seq, 7);
  assert.equal(sessionEvent({ events: [0, 1, 2, 3, 4, 5, 6, event] }, 7)?.seq, 7);
  assert.equal(sessionEvent({ events: { 7: event } }, 7)?.seq, 7);
  assert.equal(sessionEvent(null, 7), undefined);
  assert.equal(sessionEvent({ events: undefined }, 7), undefined);
});

test("ingress rewrites only the immediately preceding step and uses the 0.1.5 surface op", async () => {
  resetReplaceOpShape();
  const session = fakeSession([
    { seq: 0, type: "user/message", data: { turn: 1, step: 1, message: user("go") } },
    { seq: 1, type: "tool/result", data: { turn: 1, step: 1, message: toolResult("c1", BIG_TEXT) } },
    { seq: 2, type: "tool/result", data: { turn: 1, step: 2, message: toolResult("c2", BIG_TEXT) } },
    { seq: 3, type: "tool/result", data: { turn: 1, step: 3, message: toolResult("c3", BIG_TEXT) } }
  ]);
  const ctx = { get: (name) => (name === "tokenMeter" ? { estimateMessage: () => 4242 } : undefined) };
  const report = await shapeCurrentTurnIngress(session, ctx, { turn: 1, step: 4, vision: false, minSnapTokens: 100 });
  assert.equal(report.failed, 0);
  assert.equal(report.shaped, 1, "exactly the step-3 result is unsent");
  const prune = session.log.find((event) => event.type === "compaction/prune");
  assert.equal(prune.data.shadowedTokenCount, 4242);
  assert.deepEqual(prune.data.shadowedSeqs, [3]);
  const replacement = session.log.find((event) => event.type === "tool/result" && event.surfaceOp?.op === "replace");
  assert.deepEqual(replacement.surfaceOp, { op: "replace", startSeq: 3, endSeq: 3 });
  assert.deepEqual(replacement.sourceEventSeqs, [3]);
  assert.ok(textOfEvent(replacement).startsWith("[Snapcompact"));
  // Already-sent earlier steps stay byte-identical: their prefix is provider-cached.
  assert.equal(textOfEvent(session.eventAt(1)), BIG_TEXT);
  assert.equal(textOfEvent(session.eventAt(2)), BIG_TEXT);
  assert.deepEqual(session.surface.nodes, [0, 1, 2, replacement.seq]);
});

test("ingress retries the pre-0.1.5 replace keys once and remembers the shape", async () => {
  resetReplaceOpShape();
  const session = fakeSession([
    { seq: 0, type: "tool/result", data: { turn: 1, step: 1, message: toolResult("c1", BIG_TEXT) } }
  ], { legacyKeys: true });
  const ctx = { get: (name) => (name === "tokenMeter" ? { estimateMessage: () => 7 } : undefined) };
  const report = await shapeCurrentTurnIngress(session, ctx, { turn: 1, step: 2, vision: false, minSnapTokens: 100 });
  assert.equal(report.failed, 0);
  assert.equal(report.shaped, 1);
  assert.equal(usesLegacyReplaceKeys(), true);
  const replacement = session.log.find((event) => event.type === "tool/result" && event.surfaceOp?.op === "replace");
  assert.deepEqual(replacement.surfaceOp, { op: "replace", start: 0, end: 0 });
  resetReplaceOpShape();
});

test("ingress reports a rejected append instead of throwing", async () => {
  resetReplaceOpShape();
  const session = fakeSession([
    { seq: 0, type: "tool/result", data: { turn: 1, step: 1, message: toolResult("c1", BIG_TEXT) } }
  ]);
  session.append = () => {
    throw new Error("surface replace: node is gone");
  };
  const ctx = { get: (name) => (name === "tokenMeter" ? { estimateMessage: () => 7 } : undefined) };
  const report = await shapeCurrentTurnIngress(session, ctx, { turn: 1, step: 2, vision: false, minSnapTokens: 100 });
  assert.equal(report.shaped, 0);
  assert.equal(report.failed, 1);
  assert.match(report.error, /node is gone/);
});

test("a later fold carries files, intents and errors forward instead of dropping them", () => {
  const priorCard = user([
    "[Snapcompact] Fold ~50000 tok. Exact file bytes are not stored — re-read with offset/limit if a detail matters.",
    "FILES",
    "- [edit] lib/ancient-module.js",
    "- [read] lib/old-config.js",
    "INTENTS",
    "- 修复 SSH 插件的显示",
    "ERRORS",
    "- bash: boom",
    "EXCERPT",
    "[user] 看ssh拓展"
  ].join("\n"));
  const out = buildFold([
    priorCard,
    user("现在做快压插件的审查"),
    assistant([toolCall("c1", "read", { file_path: "lib/ingress.js" })]),
    toolResult("c1", "     1| export function shapeIngress() {}")
  ]);
  assert.ok(out.includes("Carried forward from earlier folds"));
  assert.ok(out.includes("lib/ancient-module.js"), "carried file survives");
  assert.ok(out.includes("修复 SSH 插件的显示"), "carried intent survives");
  assert.ok(out.includes("bash: boom"), "carried error survives");
  assert.ok(out.includes("lib/ingress.js"), "new file still recorded");
  assert.ok(out.includes("现在做快压插件的审查"), "new intent still recorded");
  const carried = carriedFromFold(priorCard.content[0].text);
  assert.deepEqual(carried.files.map((item) => item.path), ["lib/ancient-module.js", "lib/old-config.js"]);
  assert.deepEqual(carried.intents, ["修复 SSH 插件的显示"]);
});

test("hook diagnostics name engines without summarize", () => {
  class WeirdEngine {
    compactNow() {}
  }
  const before = hookStats();
  hookMechanicalSummarizer(new WeirdEngine());
  const after = hookStats();
  assert.ok(after.unsupportedEngines.includes("WeirdEngine"));
  assert.equal(after.unsupported, before.unsupported + 1);
});

async function loadRealSession() {
  const candidates = [process.env.DSH_SESSION_MODULE, "@deepseek-ai/dsh-session", "dsh-session"].filter(Boolean);
  for (const spec of candidates) {
    try {
      return await import(spec);
    } catch {
      // try the next candidate
    }
  }
  return null;
}

test("a real dsh-session accepts the ingress rewrite end to end", async (t) => {
  const mod = await loadRealSession();
  const Session = mod?.Session;
  if (typeof Session !== "function") {
    t.skip("dsh-session is not resolvable here; set DSH_SESSION_MODULE to run this test");
    return;
  }
  resetReplaceOpShape();
  const session = Session.create("ingress-integration");
  session.append("user/message", { role: "user", id: "m1", source: { kind: "user" }, content: [{ type: "text", text: "go" }] }, { surfaceOp: "append" });
  session.append("tool/result", {
    turn: 1,
    step: 1,
    message: { role: "user", id: "m2", source: { kind: "tool", callId: "c1" }, content: [{ type: "tool-result", toolCallId: "c1", content: [{ type: "text", text: BIG_TEXT }] }] }
  }, { surfaceOp: "append" });
  const ctx = { get: (name) => (name === "tokenMeter" ? { estimateMessage: () => 4242 } : undefined) };
  const report = await shapeCurrentTurnIngress(session, ctx, { turn: 1, step: 2, vision: false, minSnapTokens: 100 });
  assert.equal(report.failed, 0, report.error);
  assert.equal(report.shaped, 1);
  const node = session.surface.nodes.at(-1);
  assert.ok(textOfEvent(session.eventAt(node)).startsWith("[Snapcompact"));
});
