import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { request } from "node:http";
import { createRuntimeFixture } from "./runtime-fixture.mjs";

const fixture = await createRuntimeFixture();

function rawStatus(headers) {
  return new Promise((resolve, reject) => {
    const outgoing = request({ hostname: "127.0.0.1", port: fixture.port, path: "/health", headers }, (response) => {
      response.resume();
      response.once("end", () => resolve(response.statusCode));
    });
    outgoing.once("error", reject);
    outgoing.end();
  });
}

async function json(path, init) {
  const response = await fetch(`${fixture.baseUrl}${path}`, init);
  const body = await response.json();
  return { response, body };
}

try {
  const health = await json("/health");
  if (!health.response.ok || health.body.service !== "mermaid-studio-api" || health.body.renderCapacity.concurrent < 1) throw new Error("Health response did not describe the local render capacity.");

  const hostileHost = await rawStatus({ host: "example.com" });
  if (hostileHost !== 403) throw new Error(`Host guard returned ${hostileHost}, expected 403.`);
  const hostileOrigin = await rawStatus({ host: `127.0.0.1:${fixture.port}`, origin: "https://example.com" });
  if (hostileOrigin !== 403) throw new Error(`Origin guard returned ${hostileOrigin}, expected 403.`);

  const malformed = await json("/api/diagrams/render", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "Bad syntax", source: "flowchart LR\n A -->", theme: "default", scale: 1 }) });
  if (malformed.response.status !== 422) throw new Error(`Malformed Mermaid returned ${malformed.response.status}, expected 422.`);
  const oversized = await json("/api/diagrams/render", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "Too large", source: "x".repeat(200_001), theme: "default", scale: 1 }) });
  if (oversized.response.status !== 400) throw new Error(`Oversized Mermaid returned ${oversized.response.status}, expected 400.`);
  const invalidPng = await json("/api/diagrams", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "Not a PNG", source: "flowchart LR\nA-->B", theme: "default", pngDataUrl: "data:image/png;base64,bm90LXBuZw==" }) });
  if (invalidPng.response.status !== 400) throw new Error(`Invalid PNG returned ${invalidPng.response.status}, expected 400.`);

  const diagrams = [
    ["Flowchart labels", "flowchart LR\n  A[First line<br/>Second line] --> B[Finish]"],
    ["Sequence", "sequenceDiagram\n  Alice->>Bob: Hello\n  Bob-->>Alice: Ready"],
    ["State", "stateDiagram-v2\n  [*] --> Draft\n  Draft --> Done\n  Done --> [*]"]
  ];
  for (const [title, source] of diagrams) {
    const result = await json("/api/diagrams/render", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, source, theme: "default", scale: 2 }) });
    if (result.response.status !== 201) throw new Error(`${title} render failed: ${JSON.stringify(result.body)}`);
    const artifact = result.body.artifact;
    const png = await readFile(join(process.cwd(), artifact.pngPath));
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    const colorType = png[25];
    if (width < 2 || height < 2 || ![4, 6].includes(colorType)) throw new Error(`${title} PNG did not retain useful dimensions and alpha support.`);
    const svg = await readFile(join(process.cwd(), artifact.svgPath), "utf8");
    if (!svg.includes("<svg") || !svg.includes("transparent") && !svg.includes("background-color: transparent")) throw new Error(`${title} SVG was missing expected SVG or transparent output.`);
  }

  const listing = await json("/api/diagrams?limit=2&offset=0");
  if (listing.body.items.length !== 2 || listing.body.total !== 3 || listing.body.nextOffset !== 2) throw new Error("Artifact pagination returned the wrong page metadata.");

  const maliciousId = "zzzz-malicious-record";
  await writeFile(join(fixture.artifactRoot, `${maliciousId}.json`), JSON.stringify({
    id: maliciousId,
    title: "Escaped path",
    createdAt: new Date().toISOString(),
    pngPath: "/etc/passwd",
    sourcePath: `artifacts/diagrams/${maliciousId}.mmd`,
    renderer: "cli",
    theme: "default"
  }));
  const malicious = await json(`/api/diagrams/${maliciousId}`);
  if (malicious.response.status !== 500) throw new Error(`Malformed metadata returned ${malicious.response.status}, expected rejection.`);
  console.log("server smoke passed; guards, schema, pagination, malformed input, and three export types verified");
} finally {
  await fixture.stop();
}
