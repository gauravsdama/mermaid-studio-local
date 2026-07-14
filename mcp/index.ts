#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { callGateway } from "./services/gateway.js";

const responseFormat = z.enum(["markdown", "json"]).default("markdown").describe("Use markdown for people or json for programmatic processing.");
const theme = z.enum(["default", "dark", "forest", "neutral", "base"]).default("default").describe("Mermaid theme used by the headless transparent PNG renderer.");

interface Artifact { id: string; title: string; createdAt: string; pngPath: string; sourcePath: string; svgPath?: string; renderer: "browser" | "cli"; theme: string }
interface ListResponse { total: number; items: Artifact[]; hasMore: boolean; nextOffset?: number }

function result(data: object, format: "markdown" | "json", markdown: string) {
  return { content: [{ type: "text" as const, text: format === "json" ? JSON.stringify(data, null, 2) : markdown },], structuredContent: data as Record<string, unknown> };
}

const server = new McpServer({ name: "mermaid-studio-mcp-server", version: "0.1.0" });

server.registerTool("mermaid_studio_create_diagram", {
  title: "Create Mermaid diagram artifact",
  description: "Renders Mermaid source through the local Mermaid Studio API gateway and saves a transparent PNG plus its .mmd source in the app's artifacts/diagrams folder. Use it when the user provides a title and Mermaid code and wants a saved diagram. Returns artifact paths and ID.",
  inputSchema: {
    title: z.string().min(1).max(120).describe("Human-readable diagram title, used in the file name."),
    source: z.string().min(1).max(200_000).describe("Complete Mermaid diagram source."),
    theme,
    scale: z.number().int().min(1).max(4).default(4).describe("PNG scale factor. 4 is high resolution."),
    response_format: responseFormat
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
}, async ({ title, source, theme: diagramTheme, scale, response_format }) => {
  try {
    const data = await callGateway<{ artifact: Artifact }>("/api/diagrams/render", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, source, theme: diagramTheme, scale }) });
    return result(data, response_format, `# Created ${data.artifact.title}\n\n- PNG: \`${data.artifact.pngPath}\`\n- Mermaid source: \`${data.artifact.sourcePath}\`\n- ID: \`${data.artifact.id}\``);
  } catch (cause) {
    return { isError: true, content: [{ type: "text" as const, text: `Error: ${cause instanceof Error ? cause.message : "Could not create the diagram."}` }] };
  }
});

server.registerTool("mermaid_studio_list_diagrams", {
  title: "List Mermaid diagram artifacts",
  description: "Lists diagram artifacts saved by Mermaid Studio. Use the returned ID with mermaid_studio_get_diagram. Supports bounded pagination.",
  inputSchema: { limit: z.number().int().min(1).max(50).default(20), offset: z.number().int().min(0).default(0), response_format: responseFormat },
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
}, async ({ limit, offset, response_format }) => {
  try {
    const data = await callGateway<ListResponse>(`/api/diagrams?limit=${limit}&offset=${offset}`);
    const markdown = data.items.length ? `# Mermaid Studio artifacts\n\n${data.items.map((item) => `- **${item.title}** — \`${item.id}\`\n  - PNG: \`${item.pngPath}\``).join("\n")}` : "No saved Mermaid Studio artifacts yet.";
    return result(data, response_format, markdown);
  } catch (cause) {
    return { isError: true, content: [{ type: "text" as const, text: `Error: ${cause instanceof Error ? cause.message : "Could not list diagrams."}` }] };
  }
});

server.registerTool("mermaid_studio_get_diagram", {
  title: "Get Mermaid diagram artifact",
  description: "Gets one saved Mermaid Studio diagram artifact by its ID, including the exact PNG and Mermaid source paths.",
  inputSchema: { id: z.string().regex(/^[a-zA-Z0-9-]+$/, "Use an ID returned by mermaid_studio_list_diagrams."), response_format: responseFormat },
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
}, async ({ id, response_format }) => {
  try {
    const data = await callGateway<{ artifact: Artifact }>(`/api/diagrams/${id}`);
    return result(data, response_format, `# ${data.artifact.title}\n\n- PNG: \`${data.artifact.pngPath}\`\n- Mermaid source: \`${data.artifact.sourcePath}\`\n- Renderer: ${data.artifact.renderer}`);
  } catch (cause) {
    return { isError: true, content: [{ type: "text" as const, text: `Error: ${cause instanceof Error ? cause.message : "Could not get the diagram."}` }] };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Mermaid Studio MCP server connected via stdio");
