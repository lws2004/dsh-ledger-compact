/** Optional Cordis lookup. Never use ctx.llm / ctx.tokenMeter without inject. */
export function getService(ctx, name) {
  if (!ctx || typeof ctx.get !== "function") return undefined;
  return ctx.get(name);
}
