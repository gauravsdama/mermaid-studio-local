import assert from "node:assert/strict";
import test from "node:test";
import {
  artifactListResponseSchema,
  artifactRecordSchema,
  artifactResponseSchema,
  gatewayHealthSchema,
  renderDiagramRequestSchema,
  revisionDiagramRequestSchema,
  saveArtifactRequestSchema
} from "../shared/contracts.js";
import { GATEWAY_API_VERSION, GATEWAY_IDENTITY, MAX_MERMAID_SOURCE_LENGTH } from "../shared/contractValues.js";

const artifact = {
  id: "2026-09-27T12-00-00-000Z-contract-fixture-ab12cd34",
  title: "Contract fixture",
  createdAt: "2026-09-27T12:00:00.000Z",
  pngPath: "artifacts/diagrams/2026-09-27T12-00-00-000Z-contract-fixture-ab12cd34.png",
  sourcePath: "artifacts/diagrams/2026-09-27T12-00-00-000Z-contract-fixture-ab12cd34.mmd",
  svgPath: "artifacts/diagrams/2026-09-27T12-00-00-000Z-contract-fixture-ab12cd34.svg",
  renderer: "cli",
  theme: "base",
  revisionOf: "2026-09-27T11-00-00-000Z-contract-fixture-12345678"
} as const;

test("browser save requests retain the existing serialized shape", () => {
  const request = {
    title: " Browser fixture ",
    source: " flowchart LR\n  A --> B ",
    theme: "default",
    pngDataUrl: "data:image/png;base64,iVBORw0KGgo=",
    svg: "<svg></svg>"
  };
  assert.deepEqual(saveArtifactRequestSchema.parse(request), { ...request, title: "Browser fixture", source: "flowchart LR\n  A --> B" });
  assert.equal(saveArtifactRequestSchema.safeParse({ ...request, unexpected: true }).success, false);
});

test("server render and revision inputs share defaults and limits", () => {
  assert.deepEqual(renderDiagramRequestSchema.parse({ title: "Diagram", source: "flowchart LR\nA-->B" }), {
    title: "Diagram",
    source: "flowchart LR\nA-->B",
    theme: "default",
    scale: 4
  });
  assert.deepEqual(revisionDiagramRequestSchema.parse({ source: "flowchart LR\nA-->B" }), {
    source: "flowchart LR\nA-->B",
    theme: "default",
    scale: 4
  });
  assert.equal(renderDiagramRequestSchema.safeParse({ title: "Diagram", source: "x".repeat(MAX_MERMAID_SOURCE_LENGTH + 1) }).success, false);
});

test("artifact fixtures parse identically for server and MCP responses", () => {
  assert.deepEqual(artifactRecordSchema.parse(artifact), artifact);
  assert.deepEqual(artifactResponseSchema.parse({ artifact }), { artifact });
  assert.deepEqual(artifactListResponseSchema.parse({ total: 1, items: [artifact], hasMore: false }), {
    total: 1,
    items: [artifact],
    hasMore: false
  });
  assert.equal(artifactRecordSchema.safeParse({ ...artifact, id: "../escape" }).success, false);
  assert.equal(artifactRecordSchema.safeParse({ ...artifact, extra: true }).success, false);
});

test("gateway health requires the shared identity and API version", () => {
  const health = {
    ok: true,
    service: "mermaid-studio-api",
    gatewayIdentity: GATEWAY_IDENTITY,
    apiVersion: GATEWAY_API_VERSION,
    renderCapacity: { concurrent: 1, queued: 4 }
  };
  assert.deepEqual(gatewayHealthSchema.parse(health), health);
  assert.equal(gatewayHealthSchema.safeParse({ ...health, gatewayIdentity: "unrelated-service" }).success, false);
  assert.equal(gatewayHealthSchema.safeParse({ ...health, apiVersion: GATEWAY_API_VERSION + 1 }).success, false);
});
