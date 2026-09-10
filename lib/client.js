window.__ModuleLoader__.load({
  id: "dsh-ledger-compact",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    const React = require("react");
    const h = React.createElement;
    const PACKAGE = "dsh-ledger-compact";
    const SERVICE = "ledgerCompact";
    const BOLT = "M13 2 4 14h7l-1 8 10-12h-7l1-8z";
    const POLL_MS = 4000;
    const POLL_MAX_MS = 30000;
    const ARM_MS = 4000;
    const CSS = [
      ".dsh-ledger-wrap{position:relative;align-items:center;display:inline-flex}",
      ".dsh-ledger-bolt{position:relative;width:28px;height:28px;min-width:28px;padding:0;border:none;border-radius:8px;background:transparent;color:var(--bolt-color,var(--dsw-alias-label-tertiary));display:inline-grid;place-items:center;cursor:pointer;--bolt-glow:0px}",
      ".dsh-ledger-bolt svg{width:18px;height:18px;overflow:visible;filter:drop-shadow(0 0 var(--bolt-glow) currentColor);transition:filter .25s ease,color .25s ease}",
      ".dsh-ledger-bolt:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}",
      ".dsh-ledger-bolt:hover:not(:disabled) svg{transform:translateY(-1px) scale(1.08)}",
      ".dsh-ledger-bolt:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}",
      ".dsh-ledger-bolt:disabled{opacity:.55;cursor:default}",
      ".dsh-ledger-bolt[data-level='cool']{--bolt-color:var(--dsw-alias-label-secondary);--bolt-glow:2px}",
      ".dsh-ledger-bolt[data-level='warm']{--bolt-color:#38bdf8;--bolt-glow:4px}",
      ".dsh-ledger-bolt[data-level='ready']{--bolt-color:#c084fc;--bolt-glow:6px}",
      ".dsh-ledger-bolt[data-level='hot']{--bolt-color:#ffb020;--bolt-glow:8px}",
      ".dsh-ledger-bolt[data-level='warm'] svg{animation:dsh-ledger-pulse 2.2s ease-in-out infinite}",
      ".dsh-ledger-bolt[data-level='ready'] svg{animation:dsh-ledger-pulse 1.6s ease-in-out infinite}",
      ".dsh-ledger-bolt[data-level='hot'] svg{animation:dsh-ledger-pulse .9s ease-in-out infinite}",
      ".dsh-ledger-bolt[data-busy='1'] svg{animation:dsh-ledger-busy .55s ease-in-out infinite}",
      ".dsh-ledger-bolt[data-flash='ok']{--bolt-color:#ffe27a;--bolt-glow:12px}",
      ".dsh-ledger-bolt[data-flash='err']{--bolt-color:var(--dsw-alias-state-error-primary);--bolt-glow:8px}",
      ".dsh-ledger-bolt[data-flash='err'] svg{animation:dsh-ledger-shake .45s ease}",
      ".dsh-ledger-bolt[data-poll='failed']{--bolt-color:var(--dsw-alias-state-error-primary);--bolt-glow:3px}",
      ".dsh-ledger-bolt[data-level='hot']:before,.dsh-ledger-bolt[data-level='hot']:after{content:'';position:absolute;width:3px;height:3px;border-radius:50%;background:currentColor;pointer-events:none;animation:dsh-ledger-spark 1.1s ease-in-out infinite}",
      ".dsh-ledger-bolt[data-level='hot']:before{top:3px;right:5px;animation-delay:.18s}",
      ".dsh-ledger-bolt[data-level='hot']:after{bottom:4px;left:6px}",
      ".dsh-ledger-bolt[data-armed='1']{--bolt-color:#f59e0b;--bolt-glow:10px;box-shadow:inset 0 0 0 1px currentColor}",
      ".dsh-ledger-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}",
      "@keyframes dsh-ledger-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}",
      "@keyframes dsh-ledger-busy{0%,100%{transform:rotate(-10deg) scale(.96)}50%{transform:rotate(10deg) scale(1.12)}}",
      "@keyframes dsh-ledger-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-2px)}75%{transform:translateX(2px)}}",
      "@keyframes dsh-ledger-spark{0%,100%{opacity:0;transform:scale(.35)}40%{opacity:1;transform:scale(1)}}",
      "@media (prefers-reduced-motion:reduce){.dsh-ledger-bolt svg,.dsh-ledger-bolt:before,.dsh-ledger-bolt:after{animation:none!important}}",
      ".dsh-ledger-root{box-sizing:border-box;color:var(--dsw-alias-label-primary);font-size:13px;line-height:1.45;max-width:640px}",
      ".dsh-ledger-title{align-items:center;gap:8px;display:flex}",
      ".dsh-ledger-title-icon{width:16px;height:16px;color:var(--dsw-alias-label-secondary);flex:none;display:inline-grid;place-items:center}",
      ".dsh-ledger-title-icon svg{width:16px;height:16px}",
      ".dsh-ledger-root h2{margin:0;font-size:20px;line-height:28px}",
      ".dsh-ledger-muted{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;margin-top:4px}",
      ".dsh-ledger-form{margin-top:8px}",
      ".dsh-ledger-row{flex-direction:column;gap:6px;padding:12px 0;display:flex}",
      ".dsh-ledger-row+.dsh-ledger-row{border-top:.5px solid var(--dsw-alias-border-l2)}",
      ".dsh-ledger-row-head{align-items:center;gap:8px;display:flex}",
      ".dsh-ledger-row-label{min-width:0;color:var(--dsw-alias-label-primary);flex:1;font-size:13px;font-weight:500;line-height:1.5}",
      ".dsh-ledger-hint{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:1.5}",
      ".dsh-ledger-check{margin:0;accent-color:var(--dsw-alias-brand-primary)}",
      ".dsh-ledger-input{box-sizing:border-box;width:160px;max-width:100%;height:34px;border:.5px solid var(--dsw-alias-border-l4);border-radius:8px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;padding:0 12px}",
      ".dsh-ledger-input:focus-visible{border-color:var(--dsw-alias-brand-primary);outline:none}",
      ".dsh-ledger-input:disabled{color:var(--dsw-alias-label-tertiary);cursor:default}",
      ".dsh-ledger-note{margin-top:10px;color:var(--dsw-alias-label-tertiary);font-size:12px;white-space:pre-wrap}",
      ".dsh-ledger-note[data-error]{color:var(--dsw-alias-state-error-primary)}",
      ".dsh-ledger-card{padding:2px 0;min-width:0;flex-direction:column;display:flex}",
      ".dsh-ledger-card-head{box-sizing:border-box;position:relative;overflow:hidden;width:100%;height:calc(24px + var(--dsh-content-font-delta,0px));min-width:0;color:inherit;font:inherit;text-align:left;background:transparent;border:none;border-radius:6px;align-items:center;padding:0;display:flex}",
      ".dsh-ledger-card-head:not(:disabled){cursor:pointer}",
      ".dsh-ledger-card-head:not(:disabled):hover{background:var(--dsw-alias-interactive-bg-hover)}",
      ".dsh-ledger-card[data-state='running'] .dsh-ledger-card-head:after{content:'';inset-block:0;background:linear-gradient(90deg,transparent 0%,color-mix(in srgb,var(--dsw-alias-bg-base) 60%,transparent) 55%,transparent 100%);pointer-events:none;width:300px;animation:2.6s ease-out infinite dsh-ledger-row-sweep;position:absolute;left:0}",
      "@keyframes dsh-ledger-row-sweep{0%{left:-300px}90%,to{left:100%}}",
      ".dsh-ledger-card-lead{width:calc(16px + var(--dsh-content-font-delta,0px));height:calc(16px + var(--dsh-content-font-delta,0px));color:var(--dsw-alias-label-secondary);flex:none;place-items:center;margin-right:6px;display:inline-grid}",
      ".dsh-ledger-card[data-state='error'] .dsh-ledger-card-lead{color:var(--dsw-alias-state-error-primary)}",
      ".dsh-ledger-card-lead svg{width:calc(14px + var(--dsh-content-font-delta,0px));height:calc(14px + var(--dsh-content-font-delta,0px))}",
      ".dsh-ledger-card-icon,.dsh-ledger-card-disc{grid-area:1/1;justify-content:center;align-items:center;display:inline-flex}",
      ".dsh-ledger-card-disc,.dsh-ledger-card-head:not(:disabled):hover .dsh-ledger-card-icon,.dsh-ledger-card-head:not(:disabled):focus-visible .dsh-ledger-card-icon{opacity:0}",
      ".dsh-ledger-card-head:not(:disabled):hover .dsh-ledger-card-disc,.dsh-ledger-card-head:not(:disabled):focus-visible .dsh-ledger-card-disc{opacity:1}",
      ".dsh-ledger-card-title{font-size:var(--dsh-content-font-size-secondary,13px);line-height:calc(24px + var(--dsh-content-font-delta,0px));color:var(--dsw-alias-label-primary-dimmed,var(--dsw-alias-label-primary));flex:none}",
      ".dsh-ledger-card-sep{background:var(--dsw-alias-label-caption);border-radius:1px;flex:none;width:2px;height:2px;margin:0 8px}",
      ".dsh-ledger-card-sum{min-width:0;color:var(--dsw-alias-label-tertiary);font-size:var(--dsh-content-font-size-secondary,13px);line-height:calc(24px + var(--dsh-content-font-delta,0px));text-overflow:ellipsis;white-space:nowrap;flex:auto;overflow:hidden}",
      ".dsh-ledger-card-sum[data-error]{color:var(--dsw-alias-state-error-primary)}",
      ".dsh-ledger-card-body{padding:6px 0 8px calc(22px + var(--dsh-content-font-delta,0px));display:grid;gap:8px;min-width:0}",
      ".dsh-ledger-mix{display:block;width:100%;height:4px;border-radius:2px;overflow:hidden}",
      ".dsh-ledger-mix rect{fill:currentColor}",
      ".dsh-ledger-mix-intent{color:color-mix(in srgb,var(--dsw-alias-label-secondary) 70%,transparent)}",
      ".dsh-ledger-mix-edit{color:color-mix(in srgb,var(--dsw-alias-label-primary) 55%,transparent)}",
      ".dsh-ledger-mix-read{color:color-mix(in srgb,var(--dsw-alias-label-tertiary) 80%,transparent)}",
      ".dsh-ledger-mix-cmd{color:color-mix(in srgb,var(--dsw-alias-label-caption) 90%,transparent)}",
      ".dsh-ledger-mix-err{color:var(--dsw-alias-state-error-primary)}",
      ".dsh-ledger-mix-tool{color:color-mix(in srgb,var(--dsw-alias-label-secondary) 45%,transparent)}",
      ".dsh-ledger-meta{color:var(--dsw-alias-label-caption);font-size:12px;line-height:18px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".dsh-ledger-rail{position:relative;display:grid;min-width:0}",
      ".dsh-ledger-rail:before{content:'';position:absolute;left:3px;top:11px;bottom:11px;width:1px;background:color-mix(in srgb,var(--dsw-alias-label-caption) 38%,transparent);pointer-events:none}",
      ".dsh-ledger-tick{display:grid;grid-template-columns:7px minmax(0,1fr);column-gap:10px;align-items:start;min-width:0}",
      ".dsh-ledger-dot{width:7px;height:calc(20px + var(--dsh-content-font-delta-secondary,0px));color:var(--dsw-alias-label-caption);place-items:center;position:relative;z-index:1;display:grid}",
      ".dsh-ledger-tick[data-kind='err'] .dsh-ledger-dot{color:var(--dsw-alias-state-error-primary)}",
      ".dsh-ledger-tick-body{min-width:0;color:var(--dsw-alias-label-secondary);font-size:var(--dsh-content-font-size-secondary,13px);line-height:calc(20px + var(--dsh-content-font-delta-secondary,0px));overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".dsh-ledger-tick[data-kind='files'] .dsh-ledger-tick-body,.dsh-ledger-tick[data-kind='tools'] .dsh-ledger-tick-body{white-space:normal}",
      ".dsh-ledger-tick[data-kind='err'] .dsh-ledger-tick-body{color:var(--dsw-alias-state-error-primary)}",
      ".dsh-ledger-tick[data-kind='excerpt'] .dsh-ledger-tick-body{color:var(--dsw-alias-label-caption)}",
      ".dsh-ledger-tick[data-kind='note'] .dsh-ledger-tick-body{color:var(--dsw-alias-label-caption);white-space:normal}",
      ".dsh-ledger-files{flex-wrap:wrap;gap:0 10px;align-items:baseline;display:flex}",
      ".dsh-ledger-file{align-items:baseline;gap:4px;min-width:0;display:inline-flex}",
      ".dsh-ledger-file-path{color:var(--dsw-alias-label-secondary)}",
      ".dsh-ledger-file-kind{color:var(--dsw-alias-label-caption);flex:none}",
      ".dsh-ledger-tick-cmd{min-width:0;align-items:baseline;gap:8px;display:flex}",
      ".dsh-ledger-cmd-text{min-width:0;color:var(--dsw-alias-label-secondary);font:400 12px/calc(20px + var(--dsh-content-font-delta-secondary,0px)) var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,monospace);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:auto}",
      ".dsh-ledger-cmd-exit{color:var(--dsw-alias-label-caption);flex:none}",
      ".dsh-ledger-cmd-exit[data-bad='1']{color:var(--dsw-alias-state-error-primary)}",
      ".dsh-ledger-more{color:var(--dsw-alias-label-caption);flex:none}",
      ".dsh-ledger-pre{margin:0;max-height:141px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere}",
      "@media (prefers-reduced-motion:reduce){.dsh-ledger-card[data-state='running'] .dsh-ledger-card-head:after{animation:none}}"
    ].join("");
    const pass = Object.freeze({ parse(value) { return value; } });
    function codec(symbol) {
      return { mode: "strict", typeSymbol: PACKAGE + "#" + symbol, schema: pass };
    }
    function descriptor(method, parameters) {
      return {
        id: PACKAGE + "#" + SERVICE + "/" + method,
        service: SERVICE,
        namespace: SERVICE,
        method,
        invocation: { kind: "direct" },
        parameters: parameters.map((name) => ({
          name,
          wire: name,
          source: "json",
          codec: codec(SERVICE + "/" + method + ":" + name)
        })),
        result: codec(SERVICE + "/" + method + ":result")
      };
    }
    const TYPERT_REMOTE = {
      package: PACKAGE,
      descriptors: [
        descriptor("getState", []),
        descriptor("saveConfig", ["config"]),
        descriptor("getStatus", ["sessionId"]),
        descriptor("getPressure", ["sessionId"])
      ]
    };
    function formatTok(n) {
      const v = Number(n) || 0;
      if (v >= 1000) return (v / 1000).toFixed(v >= 10000 ? 0 : 1) + "k";
      return String(Math.round(v));
    }
    function levelOf(fill) {
      if (fill >= 0.85) return "hot";
      if (fill >= 0.55) return "ready";
      if (fill >= 0.35) return "warm";
      if (fill >= 0.08) return "cool";
      return "idle";
    }
    function LightningIcon(props) {
      const fill = Math.min(1, Math.max(0, Number(props.fill) || 0));
      const uid = String(props.uid || "x").replace(/[^a-zA-Z0-9_-]/g, "") || "x";
      const clipId = "dsh-ledger-bolt-" + uid;
      return h("svg", { viewBox: "0 0 24 24", width: 18, height: 18, "aria-hidden": true },
        h("defs", null,
          h("clipPath", { id: clipId }, h("path", { d: BOLT }))
        ),
        h("path", {
          d: BOLT,
          fill: "none",
          stroke: "currentColor",
          strokeWidth: 1.6,
          strokeLinejoin: "round",
          strokeLinecap: "round",
          opacity: 0.42
        }),
        h("g", { clipPath: "url(#" + clipId + ")" },
          h("rect", {
            x: 0,
            y: 24 * (1 - fill),
            width: 24,
            height: 24 * fill + 0.01,
            fill: "currentColor"
          })
        )
      );
    }
    function unwrapRemote(result) {
      return Promise.resolve(result).then((value) => {
        if (value && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, "ok")) {
          if (value.ok === false) {
            const err = value.error;
            throw err instanceof Error ? err : new Error(err && err.message ? err.message : "remote failed");
          }
          return value.value;
        }
        return value;
      });
    }
    function useSettingsScope(settings) {
      return React.useSyncExternalStore(
        (listener) => settings.subscribe(listener),
        () => settings.getSnapshot(),
        () => settings.getSnapshot()
      );
    }
    function FastCompactChip(props) {
      const { runFastCompact: run, getPressure, sessionId, settings } = props;
      const confirmFold = useSettingsScope(settings).value?.confirmFold !== false;
      const [busy, setBusy] = React.useState(false);
      const [armed, setArmed] = React.useState(false);
      const [flash, setFlash] = React.useState(null);
      const [announce, setAnnounce] = React.useState("");
      const [pressure, setPressure] = React.useState({ fill: 0, percent: 0, used: 0, window: 0, compactable: 0 });
      const [pollFailed, setPollFailed] = React.useState("");
      const alive = React.useRef(true);
      const getPressureRef = React.useRef(getPressure);
      getPressureRef.current = getPressure;
      const rawId = typeof React.useId === "function" ? React.useId() : String(sessionId || "x");
      React.useEffect(() => {
        alive.current = true;
        return () => { alive.current = false; };
      }, []);
      React.useEffect(() => {
        setFlash(null);
        setAnnounce("");
        setArmed(false);
        setPollFailed("");
        setPressure({ fill: 0, percent: 0, used: 0, window: 0, compactable: 0 });
      }, [sessionId]);
      React.useEffect(() => {
        if (!sessionId || typeof getPressureRef.current !== "function") return;
        let timer;
        let cancelled = false;
        let delay = POLL_MS;
        const tick = () => {
          if (cancelled) return;
          // A hidden tab keeps the session alive but needs no pressure sampling.
          if (typeof document !== "undefined" && document.hidden) {
            timer = setTimeout(tick, POLL_MS);
            return;
          }
          Promise.resolve(getPressureRef.current()).then((value) => {
            delay = POLL_MS;
            if (cancelled || !alive.current || !value || typeof value !== "object") return;
            setPollFailed("");
            setPressure({
              fill: Number(value.fill) || 0,
              percent: Number(value.percent) || 0,
              used: Number(value.used) || 0,
              window: Number(value.window) || 0,
              compactable: Number(value.compactable) || 0
            });
          }, (error) => {
            // A broken host (for example a DSH API rename) must not look like an idle session.
            delay = Math.min(delay * 2, POLL_MAX_MS);
            if (cancelled || !alive.current) return;
            setPollFailed(error && error.message ? error.message : "pressure unavailable");
          }).then(() => {
            if (cancelled) return;
            timer = setTimeout(tick, busy ? POLL_MAX_MS : delay);
          });
        };
        tick();
        return () => { cancelled = true; if (timer) clearTimeout(timer); };
      }, [sessionId, busy]);
      React.useEffect(() => {
        if (!flash) return;
        const timer = setTimeout(() => { if (alive.current) setFlash(null); }, 1600);
        return () => clearTimeout(timer);
      }, [flash]);
      React.useEffect(() => {
        if (!armed) return;
        const timer = setTimeout(() => {
          if (!alive.current) return;
          setArmed(false);
          setAnnounce("");
        }, ARM_MS);
        return () => clearTimeout(timer);
      }, [armed]);
      const fold = () => {
        setBusy(true);
        setArmed(false);
        setFlash(null);
        setAnnounce("");
        Promise.resolve(run()).then((outcome) => {
          if (!alive.current) return;
          setBusy(false);
          const ok = !(outcome && outcome.ok === false);
          const text = outcome && outcome.text ? outcome.text : (ok ? "已折页" : "快速压缩失败");
          setFlash(ok ? "ok" : "err");
          setAnnounce(text);
        }, (error) => {
          if (!alive.current) return;
          setBusy(false);
          const text = error && error.message ? error.message : "快速压缩失败";
          setFlash("err");
          setAnnounce(text);
        });
      };
      const onClick = () => {
        if (!run || busy) return;
        if (confirmFold && !armed) {
          setArmed(true);
          setAnnounce("再点一次确认折页。这会把旧历史换成短卡，不可恢复。");
          return;
        }
        fold();
      };
      const fill = busy ? Math.max(pressure.fill, 0.55) : pressure.fill;
      const level = levelOf(fill);
      const titleParts = [confirmFold
        ? "上下文压力。折页需再点一次确认（本地机械短卡，不调模型）"
        : "上下文压力。点击即折页（本地机械短卡，不调模型）"];
      if (pollFailed) titleParts.unshift("压力表不可用：" + pollFailed);
      if (busy) titleParts.unshift("正在折页…");
      else if (armed) titleParts.unshift("再点一次确认折页（会丢掉旧细节）");
      else if (flash === "err" && announce) titleParts.unshift(announce);
      else if (flash === "ok" && announce) titleParts.unshift(announce);
      if (pressure.window) titleParts.push("上下文 " + pressure.percent + "%");
      else if (pressure.used) titleParts.push("约 " + formatTok(pressure.used) + " tok");
      if (pressure.compactable) titleParts.push("可折 ~" + formatTok(pressure.compactable));
      const label = busy ? "正在折页" : armed ? "确认折页" : "上下文压力";
      return h("span", { className: "dsh-ledger-wrap" },
        h("button", {
          type: "button",
          className: "dsh-ledger-bolt",
          disabled: busy || !run,
          title: titleParts.join(" · "),
          "aria-label": label + " " + Math.round(fill * 100) + "%",
          "data-level": level,
          "data-busy": busy ? "1" : "0",
          "data-armed": armed ? "1" : "0",
          "data-flash": flash || undefined,
          "data-poll": pollFailed ? "failed" : undefined,
          onMouseDown: (event) => { event.preventDefault(); },
          onClick
        }, h(LightningIcon, { fill, uid: rawId })),
        h("span", { className: "dsh-ledger-sr", role: "status" }, announce)
      );
    }
    const FOLD_CARD_MARKER = "<!--dsh-ledger-fold:1-->";
    function take(list, max) {
      const items = Array.isArray(list) ? list : [];
      return { shown: items.slice(0, max), extra: Math.max(0, items.length - max) };
    }
    function shortPath(path) {
      const value = String(path || "");
      const parts = value.split(/[/\\]/).filter(Boolean);
      return parts[parts.length - 1] || value;
    }
    function clampLine(text, max) {
      const value = String(text || "").replace(/\s+/g, " ").trim();
      if (value.length <= max) return value;
      return value.slice(0, Math.max(1, max - 1)) + "…";
    }
    const INTENT_NOISE = /^(Current runtime context|SSH is available|Hosts:|Bindings:|Current workspace|This workspace is unbound|Current DSH file policy|Approval prompts are disabled|The available skill catalog|<system-reminder>|Use ssh_bind|Humans only add hosts|When the user refers)/i;
    function intentLine(text) {
      for (const line of String(text || "").split(/\n/)) {
        const value = line.trim();
        if (!value || INTENT_NOISE.test(value)) continue;
        return clampLine(value, 88);
      }
      return "";
    }
    function commandLead(line) {
      const cmd = splitCommand(line);
      return { text: clampLine(cmd.text.split(/\n/)[0], 56), exit: cmd.exit };
    }
    function errorLead(text) {
      return clampLine(String(text || "").split(/\n/)[0], 64);
    }
    function parseFoldNotice(text) {
      const raw = String(text || "");
      const at = raw.indexOf(FOLD_CARD_MARKER);
      const before = (at === -1 ? raw : raw.slice(0, at)).replace(/\s+$/, "");
      const headline = before.split("\n")[0] ? before.split("\n")[0].trim() : "";
      const rest = at === -1 ? before.split("\n").slice(1).join("\n").trim() : "";
      if (at !== -1) {
        try {
          const card = JSON.parse(raw.slice(at + FOLD_CARD_MARKER.length).trim());
          if (card && card.v === 1) return { headline, card, rest: "" };
        } catch (_) {}
      }
      return { headline, card: null, rest };
    }
    function splitCommand(line) {
      const value = String(line || "");
      const match = value.match(/^(.*?)(?:\s+->\s+(-?\d+))\s*$/);
      if (!match) return { text: value, exit: "" };
      return { text: match[1], exit: match[2] };
    }
    function cardHasDetails(card) {
      if (!card) return false;
      return (card.edits && card.edits.length)
        || (card.reads && card.reads.length)
        || (card.intents && card.intents.length)
        || (card.commands && card.commands.length)
        || (card.errors && card.errors.length)
        || (card.tools && card.tools.length)
        || (card.excerpt && card.excerpt.length)
        || card.items
        || card.tokens;
    }
    function FoldBoltIcon() {
      return h("svg", { viewBox: "0 0 24 24", width: 14, height: 14, "aria-hidden": true },
        h("path", {
          d: BOLT,
          fill: "currentColor",
          stroke: "currentColor",
          strokeWidth: 1.2,
          strokeLinejoin: "round"
        })
      );
    }
    function FoldChevron({ open }) {
      return h("svg", { viewBox: "0 0 14 14", width: 14, height: 14, "aria-hidden": true },
        h("path", {
          d: open ? "M3.5 5.2 7 8.8 10.5 5.2" : "M5.2 3.5 8.8 7 5.2 10.5",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: 1.4,
          strokeLinecap: "round",
          strokeLinejoin: "round"
        })
      );
    }
    function RailDot() {
      return h("svg", { viewBox: "0 0 8 8", width: 7, height: 7, "aria-hidden": true },
        h("circle", { cx: 4, cy: 4, r: 2.25, fill: "currentColor" })
      );
    }
    function Tick({ kind, title, children }) {
      return h("div", { className: "dsh-ledger-tick", "data-kind": kind, title: title || undefined },
        h("span", { className: "dsh-ledger-dot", "aria-hidden": true }, h(RailDot)),
        h("div", { className: "dsh-ledger-tick-body" }, children)
      );
    }
    function foldSummaryLine(card, headline, running, failed) {
      if (running) return "正在折页…";
      if (failed) return headline || "折页失败";
      if (card) {
        const parts = [];
        if (card.items) parts.push(card.items + " 条");
        if (card.tokens) parts.push(formatTok(card.tokens) + " tok");
        if (card.edits && card.edits.length) parts.push(card.edits.length + " 改");
        if (card.reads && card.reads.length) parts.push(card.reads.length + " 读");
        if (parts.length) return parts.join(" · ");
      }
      return headline || "已完成";
    }
    function MixBar({ parts }) {
      const items = (parts || []).filter((part) => part && part.n > 0);
      const total = items.reduce((sum, part) => sum + part.n, 0);
      if (!total) return null;
      const width = 100;
      let x = 0;
      const rects = items.map((part, index) => {
        const w = index === items.length - 1 ? width - x : (part.n / total) * width;
        const node = h("g", { key: part.key, className: "dsh-ledger-mix-" + part.key },
          h("rect", { x: x, y: 0, width: Math.max(0, w), height: 4 })
        );
        x += w;
        return node;
      });
      return h("svg", {
        className: "dsh-ledger-mix",
        viewBox: "0 0 100 4",
        preserveAspectRatio: "none",
        "aria-hidden": true
      }, rects);
    }
    function excerptLine(text) {
      const raw = String(text || "");
      const match = raw.match(/^\[(user|assistant|tool)\]\s*(.*)$/);
      if (!match) return { kind: "excerpt", text: clampLine(raw, 88) };
      return {
        kind: match[1] === "tool" ? "excerpt" : (match[1] === "user" ? "intent" : "excerpt"),
        text: clampLine(match[2], 88)
      };
    }
    function FoldCardBody({ card, rest }) {
      if (!card && rest) return h("pre", { className: "dsh-ledger-pre" }, rest);
      if (!card) return null;
      const intents = [];
      for (const text of card.intents || []) {
        const line = intentLine(text);
        if (line) intents.push(line);
      }
      const intentShown = take(intents, 3);
      const files = [
        ...(card.edits || []).map((path) => ({ path, kind: "改" })),
        ...(card.reads || []).map((path) => ({ path, kind: "读" }))
      ];
      const fileShown = files.slice(0, 8);
      const fileExtra = Math.max(0, files.length - fileShown.length);
      const tools = take(card.tools, 8);
      const commands = take(card.commands, 5);
      const errors = take(card.errors, 3);
      const intentSet = new Set(intentShown.shown);
      const excerpts = [];
      for (const line of card.excerpt || []) {
        const item = excerptLine(line);
        if (!item.text || intentSet.has(item.text)) continue;
        excerpts.push(item);
        if (excerpts.length >= 6) break;
      }
      const mix = [
        { key: "intent", n: (card.intents || []).length },
        { key: "edit", n: (card.edits || []).length },
        { key: "read", n: (card.reads || []).length },
        { key: "cmd", n: (card.commands || []).length },
        { key: "err", n: (card.errors || []).length },
        { key: "tool", n: (card.tools || []).reduce((sum, item) => sum + (Number(item && item.n) || 0), 0) }
      ];
      if (!mix.some((part) => part.n > 0) && (card.items || card.tokens)) mix[0].n = 1;
      const meta = [];
      if (card.items) meta.push(card.items + " 条");
      if (card.tokens) meta.push(formatTok(card.tokens) + " tok");
      if ((card.edits || []).length) meta.push(card.edits.length + " 改");
      if ((card.reads || []).length) meta.push(card.reads.length + " 读");
      if ((card.commands || []).length) meta.push(card.commands.length + " 命令");
      if ((card.errors || []).length) meta.push(card.errors.length + " 错");
      if ((card.tools || []).length) {
        const toolN = card.tools.reduce((sum, item) => sum + (Number(item && item.n) || 0), 0);
        if (toolN) meta.push(toolN + " 次工具");
      }
      const ticks = [];
      intentShown.shown.forEach((text, index) => {
        const extra = index === intentShown.shown.length - 1 ? intentShown.extra : 0;
        ticks.push(h(Tick, { kind: "intent", key: "intent-" + index, title: text },
          text,
          extra ? h("span", { className: "dsh-ledger-more" }, " +" + extra) : null
        ));
      });
      if (tools.shown.length) {
        ticks.push(h(Tick, { kind: "tools", key: "tools" },
          h("span", { className: "dsh-ledger-files" },
            tools.shown.map((tool, index) => h("span", {
              className: "dsh-ledger-file",
              key: "tool-" + index + "-" + tool.name
            },
              h("span", { className: "dsh-ledger-file-path" }, tool.name),
              h("span", { className: "dsh-ledger-file-kind" }, String(tool.n))
            )),
            tools.extra ? h("span", { className: "dsh-ledger-more" }, "+" + tools.extra) : null
          )
        ));
      }
      if (fileShown.length) {
        ticks.push(h(Tick, { kind: "files", key: "files" },
          h("span", { className: "dsh-ledger-files" },
            fileShown.map((file, index) => h("span", {
              className: "dsh-ledger-file",
              key: file.kind + "-" + index + "-" + file.path,
              title: file.path
            },
              h("span", { className: "dsh-ledger-file-path" }, shortPath(file.path)),
              h("span", { className: "dsh-ledger-file-kind" }, file.kind)
            )),
            fileExtra ? h("span", { className: "dsh-ledger-more" }, "+" + fileExtra) : null
          )
        ));
      }
      commands.shown.forEach((line, index) => {
        const cmd = commandLead(line);
        const raw = splitCommand(line).text;
        const bad = cmd.exit !== "" && cmd.exit !== "0";
        const extra = index === commands.shown.length - 1 ? commands.extra : 0;
        ticks.push(h(Tick, { kind: bad ? "err" : "cmd", key: "cmd-" + index, title: raw },
          h("span", { className: "dsh-ledger-tick-cmd" },
            h("span", { className: "dsh-ledger-cmd-text" }, cmd.text),
            cmd.exit ? h("span", { className: "dsh-ledger-cmd-exit", "data-bad": bad ? "1" : undefined }, cmd.exit) : null,
            extra ? h("span", { className: "dsh-ledger-more" }, "+" + extra) : null
          )
        ));
      });
      errors.shown.forEach((text, index) => {
        const extra = index === errors.shown.length - 1 ? errors.extra : 0;
        ticks.push(h(Tick, { kind: "err", key: "err-" + index, title: text },
          errorLead(text),
          extra ? h("span", { className: "dsh-ledger-more" }, " +" + extra) : null
        ));
      });
      excerpts.forEach((item, index) => {
        ticks.push(h(Tick, { kind: "excerpt", key: "ex-" + index, title: item.text }, item.text));
      });
      if (!fileShown.length && !commands.shown.length && !errors.shown.length && !tools.shown.length && !excerpts.length) {
        ticks.push(h(Tick, { kind: "note", key: "sparse" }, "这一折没抓到文件或命令。再折一次会带上工具构成和摘录。"));
      }
      if (!ticks.length && rest) return h("pre", { className: "dsh-ledger-pre" }, rest);
      return h(React.Fragment, null,
        h(MixBar, { parts: mix }),
        meta.length ? h("div", { className: "dsh-ledger-meta" }, meta.join(" · ")) : null,
        ticks.length ? h("div", { className: "dsh-ledger-rail" }, ticks) : null
      );
    }
    function FastCompactCommandCard(props) {
      const node = props.node;
      const [expanded, setExpanded] = React.useState(false);
      if (!node) return null;
      const outcome = node.outcome;
      const running = outcome === null;
      const failed = Boolean(outcome && outcome.kind === "error");
      const parsed = parseFoldNotice(outcome && outcome.text);
      const card = running || failed ? null : parsed.card;
      const expandable = !running && (cardHasDetails(card) || parsed.rest !== "");
      const open = expandable && expanded;
      const summary = foldSummaryLine(card, parsed.headline, running, failed);
      return h("div", {
        className: "dsh-ledger-card",
        "data-state": running ? "running" : (failed ? "error" : "ok")
      },
        h("button", {
          type: "button",
          className: "dsh-ledger-card-head",
          disabled: !expandable,
          "aria-expanded": expandable ? open : undefined,
          onClick: () => { if (expandable) setExpanded((value) => !value); }
        },
          h("span", { className: "dsh-ledger-card-lead", "aria-hidden": true },
            h("span", { className: "dsh-ledger-card-icon" }, h(FoldBoltIcon)),
            expandable ? h("span", { className: "dsh-ledger-card-disc" }, h(FoldChevron, { open })) : null
          ),
          h("span", { className: "dsh-ledger-card-title" }, "快速压缩"),
          h("span", { className: "dsh-ledger-card-sep", "aria-hidden": true }),
          h("span", { className: "dsh-ledger-card-sum", "data-error": failed || undefined }, summary)
        ),
        open ? h("div", { className: "dsh-ledger-card-body" }, h(FoldCardBody, { card, rest: parsed.rest })) : null
      );
    }
    function SwitchRow({ label, hint, checked, disabled, onChange }) {
      return h("div", { className: "dsh-ledger-row" },
        h("div", { className: "dsh-ledger-row-head" },
          h("label", { className: "dsh-ledger-row-label" }, label),
          h("input", {
            type: "checkbox",
            className: "dsh-ledger-check",
            checked: checked,
            disabled: disabled,
            onChange: (event) => onChange(event.target.checked)
          })
        ),
        hint ? h("p", { className: "dsh-ledger-hint" }, hint) : null
      );
    }
    function NumberRow({ label, hint, value, disabled, min, max, step, suffix, onCommit }) {
      const [text, setText] = React.useState(String(value));
      React.useEffect(() => { setText(String(value)); }, [value]);
      const commit = () => {
        const n = Number(text);
        if (!Number.isFinite(n)) {
          setText(String(value));
          return;
        }
        onCommit(n);
      };
      return h("div", { className: "dsh-ledger-row" },
        h("div", { className: "dsh-ledger-row-head" },
          h("label", { className: "dsh-ledger-row-label" }, label),
          h("input", {
            type: "number",
            className: "dsh-ledger-input",
            value: text,
            disabled: disabled,
            min: min,
            max: max,
            step: step,
            inputMode: "numeric",
            onChange: (event) => setText(event.target.value),
            onBlur: commit,
            onKeyDown: (event) => { if (event.key === "Enter") event.currentTarget.blur(); }
          }),
          suffix ? h("span", { className: "dsh-ledger-hint" }, suffix) : null
        ),
        hint ? h("p", { className: "dsh-ledger-hint" }, hint) : null
      );
    }
    function SettingsSection(props) {
      const settings = props.settings;
      const snap = useSettingsScope(settings);
      const [note, setNote] = React.useState("");
      const value = snap.value || {};
      const disabled = snap.status !== "ready" || snap.writable === false;
      const write = (field, next) => {
        setNote("");
        Promise.resolve(settings.set(field, next)).then(() => {
          setNote("已保存");
        }, (error) => {
          setNote(error && error.message ? error.message : "保存失败");
        });
      };
      let status = "";
      let statusError = false;
      if (snap.status === "loading") status = "正在读取设置…";
      else if (snap.status === "unavailable") {
        status = "设置命名空间不可用。请确认插件已在 Host 注册。";
        statusError = true;
      } else if (snap.writable === false) status = "当前连接不能写入设置（仅本机会话可改）。";
      else if (note) status = note;
      return h("div", { className: "dsh-ledger-root" },
        h("div", { className: "dsh-ledger-title" },
          h("span", { className: "dsh-ledger-title-icon", "aria-hidden": true }, h(FoldBoltIcon)),
          h("h2", null, "快速压缩")
        ),
        h("p", { className: "dsh-ledger-muted" }, "大工具结果在进模型前定形，已送前缀不改。输入栏闪电是压力表。默认定形不调模型；替换默认压缩后 /compact 也不调。改动即时写入。"),
        h("div", { className: "dsh-ledger-form" },
          h(SwitchRow, {
            label: "入境定形",
            hint: "下一轮请求前裁当前回合尚未发送的大 tool_result。",
            checked: value.enabled !== false,
            disabled: disabled,
            onChange: (checked) => write("enabled", checked)
          }),
          h(SwitchRow, {
            label: "允许密图",
            hint: "仍须主模型 inputModalities 含 image。图必须比原文更省才会贴。",
            checked: value.snapImages === true,
            disabled: disabled,
            onChange: (checked) => write("snapImages", checked)
          }),
          h(SwitchRow, {
            label: "折页二次确认",
            hint: "输入栏闪电需再点一次才折页。关掉则单击立即折页。",
            checked: value.confirmFold !== false,
            disabled: disabled,
            onChange: (checked) => write("confirmFold", checked)
          }),
          h(SwitchRow, {
            label: "替换默认压缩",
            hint: "开启后 /compact 和自动压缩都走本地机械折页，不再调模型。关掉则只有闪电和 /fast-compact 走机械折页。",
            checked: value.replaceDefault === true,
            disabled: disabled,
            onChange: (checked) => write("replaceDefault", checked)
          }),
          h(NumberRow, {
            label: "入境阈值",
            hint: "大约达到这么多 token 才摘录或贴图。范围 200–200000。",
            value: Number(value.minSnapTokens) || 3000,
            disabled: disabled,
            min: 200,
            max: 200000,
            step: 100,
            suffix: "tok",
            onCommit: (n) => write("minSnapTokens", Math.round(n))
          }),
          h(NumberRow, {
            label: "密图节省",
            hint: "摘录 + 估图 token 必须 ≤ 原文的这个比例才会贴 PNG。",
            value: Math.round((Number(value.savingsRatio) || 0.85) * 100),
            disabled: disabled,
            min: 5,
            max: 100,
            step: 1,
            suffix: "%",
            onCommit: (n) => write("savingsRatio", n / 100)
          })
        ),
        status ? h("div", { className: "dsh-ledger-note", "data-error": statusError || undefined }, status) : null
      );
    }
    function watchSettingsNavIcon() {
      const swap = () => {
        const buttons = document.querySelectorAll("[role='dialog'] nav button");
        for (let i = 0; i < buttons.length; i++) {
          const button = buttons[i];
          const label = button.textContent || "";
          if (label.indexOf("快速压缩") === -1) continue;
          if (button.getAttribute("data-dsh-ledger-bolt") === "1") continue;
          const svg = button.querySelector("svg");
          if (!svg) continue;
          button.setAttribute("data-dsh-ledger-bolt", "1");
          while (svg.firstChild) svg.removeChild(svg.firstChild);
          svg.setAttribute("viewBox", "0 0 24 24");
          const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          path.setAttribute("d", BOLT);
          path.setAttribute("fill", "currentColor");
          svg.appendChild(path);
        }
      };
      let scheduled = false;
      const run = () => {
        scheduled = false;
        if (!document.querySelector("[role='dialog']")) return;
        swap();
      };
      const schedule = () => {
        if (scheduled) return;
        scheduled = true;
        (typeof requestAnimationFrame === "function" ? requestAnimationFrame : (fn) => setTimeout(fn, 16))(run);
      };
      const observer = new MutationObserver(schedule);
      observer.observe(document.documentElement, { childList: true, subtree: true });
      schedule();
      return () => observer.disconnect();
    }
    const inject = ["slots", "remote", "remote.commands", "settingsScope"];
    const name = PACKAGE;
    async function apply(ctx) {
      ctx.effect(() => {
        const styleId = PACKAGE + ".css";
        let tag = document.querySelector("style[data-plugin-css=" + JSON.stringify(styleId) + "]");
        if (tag === null) {
          tag = document.createElement("style");
          tag.dataset.plugin = PACKAGE;
          tag.dataset.pluginCss = styleId;
          document.head.appendChild(tag);
        }
        tag.textContent = CSS;
        return () => { tag.remove(); };
      }, "dsh-ledger-compact: css");
      await ctx.remote.$mount(TYPERT_REMOTE);
      ctx.effect(() => watchSettingsNavIcon(), "dsh-ledger-compact: settings nav icon");
      ctx.inject(["slots", "remote.commands", "remote." + SERVICE, "settingsScope"], (scope) => {
        const api = scope.remote[SERVICE];
        const settings = scope.settingsScope.bind({ namespace: PACKAGE });
        scope.slots.inject("conversation.input.left", () => scope.slots.register({
          name: "conversation.input.left",
          id: "ledger-fast-compact",
          order: 20,
          inject: (sessionId) => ({
            sessionId,
            settings,
            getPressure: () => unwrapRemote(api.getPressure(sessionId)),
            runFastCompact: async () => {
              const result = await scope.remote.commands.execute(sessionId, "/fast-compact", []);
              if (!result.ok) {
                return { ok: false, text: result.error.message + " (" + result.error.code + ")" };
              }
              if (result.value === undefined) {
                return { ok: false, text: "unknown command: /fast-compact" };
              }
              const body = result.value.result;
              const text = body && body.text ? body.text : "Fast compact finished.";
              return { ok: !(body && body.kind === "error"), text };
            }
          })
        }, FastCompactChip));
        scope.slots.inject("conversation.chat.commandview", () => scope.slots.register({
          name: "conversation.chat.commandview",
          key: "fast-compact"
        }, FastCompactCommandCard));
        scope.slots.inject("settings.section", () => scope.slots.register({
          name: "settings.section",
          id: "ledger-compact",
          order: 18,
          label: "快速压缩"
        }, () => h(SettingsSection, { settings })));
      });
    }
    const plugin = { name, inject, apply };
    exports.apply = apply;
    exports.inject = inject;
    exports.name = name;
    exports.default = plugin;
    return module.exports;
  }
});
