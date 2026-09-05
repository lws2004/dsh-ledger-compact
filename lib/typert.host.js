const PACKAGE = "dsh-ledger-compact";
const SERVICE = "ledgerCompact";
const json = { mode: "src-json" };
const specs = [
  ["getState", []],
  ["saveConfig", ["config"]],
  ["getStatus", ["sessionId"]],
  ["getPressure", ["sessionId"]]
];
const invocations = specs.map(([method, parameters]) => ({
  id: PACKAGE + "#" + SERVICE + "/" + method,
  service: SERVICE,
  namespace: SERVICE,
  method,
  invocation: { kind: "direct" },
  parameters: parameters.map((name) => ({
    name,
    wire: name,
    source: "json",
    codec: json
  })),
  result: json
}));
const members = specs.map(([method, parameters]) => ({
  kind: "method",
  name: method,
  signature: "@Remote('" + method + "') " + method + "(" + parameters.join(", ") + "): Promise<JsonValue>"
}));
export const TYPERT = {
  package: PACKAGE,
  face: "host",
  schemas: [],
  invocations,
  model: {
    services: [{
      description: "OMP-style ingress shaping and fast compact.",
      summary: "Local ledger compact service.",
      tags: [],
      jsDoc: "OMP-style ingress shaping and fast compact.",
      key: SERVICE,
      exportName: "LedgerCompactService",
      members,
      types: []
    }],
    events: [],
    objects: []
  }
};
export default TYPERT;
