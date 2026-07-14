import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["dist/mcp/index.js"],
  cwd: process.cwd(),
  stderr: "ignore"
});
const client = new Client({ name: "mermaid-studio-smoke", version: "0.1.0" });

try {
  await client.connect(transport);
  const tools = await client.listTools();
  const names = tools.tools.map((tool) => tool.name).sort();
  for (const expected of ["mermaid_studio_create_diagram", "mermaid_studio_get_diagram", "mermaid_studio_list_diagrams"]) {
    if (!names.includes(expected)) throw new Error(`Missing MCP tool: ${expected}`);
  }
  const created = await client.callTool({
    name: "mermaid_studio_create_diagram",
    arguments: { title: "MCP protocol smoke", source: "flowchart LR\n  A[Model] --> B[Studio] --> C[Artifact]", response_format: "json" }
  });
  if (created.isError) throw new Error(created.content.map((part) => part.type === "text" ? part.text : "").join(""));
  const listing = await client.callTool({ name: "mermaid_studio_list_diagrams", arguments: { limit: 5, response_format: "json" } });
  if (listing.isError) throw new Error("MCP list tool failed.");
  console.log(`MCP smoke passed; tools=${names.join(", ")}`);
} finally {
  await transport.close();
}
