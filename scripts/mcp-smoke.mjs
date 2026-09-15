import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";

const artifactRoot = await mkdtemp(join(tmpdir(), "mermaid-studio-mcp-artifacts-"));
const probe = createServer();
await new Promise((resolvePromise, reject) => probe.once("error", reject).listen(0, "127.0.0.1", resolvePromise));
const address = probe.address();
const port = typeof address === "object" && address ? address.port : 0;
await new Promise((resolvePromise) => probe.close(resolvePromise));
if (!port) throw new Error("Could not reserve a loopback MCP test port.");

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [resolve(process.cwd(), "dist/mcp/index.js")],
  cwd: process.env.MCP_SERVER_CWD ?? process.cwd(),
  env: {
    ...process.env,
    MCP_API_BASE_URL: `http://127.0.0.1:${port}`,
    PORT: String(port),
    MERMAID_STUDIO_ARTIFACT_ROOT: artifactRoot
  },
  stderr: "ignore"
});
const client = new Client({ name: "mermaid-studio-smoke", version: "0.1.0" });

try {
  await client.connect(transport);
  const tools = await client.listTools();
  const names = tools.tools.map((tool) => tool.name).sort();
  for (const expected of ["mermaid_studio_create_diagram", "mermaid_studio_get_diagram", "mermaid_studio_list_diagrams", "mermaid_studio_update_diagram"]) {
    if (!names.includes(expected)) throw new Error(`Missing MCP tool: ${expected}`);
  }
  const created = await client.callTool({
    name: "mermaid_studio_create_diagram",
    arguments: { title: "MCP protocol smoke", source: "flowchart LR\n  A[Model] --> B[Studio] --> C[Artifact]", response_format: "json" }
  });
  if (created.isError) throw new Error(created.content.map((part) => part.type === "text" ? part.text : "").join(""));
  const createdData = created.structuredContent;
  const artifact = createdData?.artifact;
  if (!artifact?.id || !artifact.svgPath) throw new Error("Create did not return a saved PNG, SVG, and source artifact.");
  if (!created.content.some((part) => part.type === "image" && part.mimeType === "image/png")) throw new Error("Create did not return an inline PNG preview.");
  const fetched = await client.callTool({ name: "mermaid_studio_get_diagram", arguments: { id: artifact.id, response_format: "json" } });
  if (fetched.isError || !fetched.content.some((part) => part.type === "image")) throw new Error("Get did not return the saved artifact preview.");
  const updated = await client.callTool({
    name: "mermaid_studio_update_diagram",
    arguments: { id: artifact.id, source: "flowchart LR\n  A[Edited model] --> B[Updated Studio]", response_format: "json" }
  });
  if (updated.isError || !updated.content.some((part) => part.type === "image")) throw new Error("Update did not create an inline-previewed revision.");
  const listing = await client.callTool({ name: "mermaid_studio_list_diagrams", arguments: { limit: 5, response_format: "json" } });
  if (listing.isError) throw new Error("MCP list tool failed.");
  console.log(`MCP smoke passed; tools=${names.join(", ")}`);
} finally {
  await transport.close();
  await rm(artifactRoot, { recursive: true, force: true });
}
