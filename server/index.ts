import cors from "cors";
import express from "express";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { renderCapacity, renderMermaidArtifacts } from "./render.js";
import { getArtifact, listArtifacts, saveArtifact } from "./store.js";
import { APP_ROOT } from "./paths.js";
import { assertPngWithinLimits } from "./png.js";
import { renderDiagramRequestSchema, revisionDiagramRequestSchema, saveArtifactRequestSchema } from "../shared/contracts.js";
import { GATEWAY_API_VERSION, GATEWAY_IDENTITY } from "../shared/contractValues.js";

const app = express();
app.disable("x-powered-by");
app.use((request, response, next) => {
  const hostname = request.hostname.toLowerCase();
  if (hostname !== "127.0.0.1" && hostname !== "localhost" && hostname !== "::1") {
    return response.status(403).json({ error: "Mermaid Studio accepts loopback requests only." });
  }
  return next();
});
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    try {
      const url = new URL(origin);
      const allowed = url.protocol === "http:" && ["127.0.0.1", "localhost", "::1"].includes(url.hostname);
      return callback(allowed ? null : new Error("Origin is not allowed."), allowed);
    } catch {
      return callback(new Error("Origin is not allowed."), false);
    }
  }
}));
app.use((error: Error, _request: express.Request, response: express.Response, next: express.NextFunction) => {
  if (error.message === "Origin is not allowed.") {
    return response.status(403).json({ error: "Mermaid Studio accepts browser requests from loopback origins only." });
  }
  return next(error);
});
app.use(express.json({ limit: "30mb" }));

app.get("/health", (_request, response) => response.json({
  ok: true,
  service: "mermaid-studio-api",
  gatewayIdentity: GATEWAY_IDENTITY,
  apiVersion: GATEWAY_API_VERSION,
  renderCapacity
}));

app.get("/api/diagrams", async (request, response) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(request.query.limit) || 20));
    const offset = Math.max(0, Number(request.query.offset) || 0);
    response.json(await listArtifacts(limit, offset));
  } catch {
    response.status(500).json({ error: "Could not read the diagram artifact index." });
  }
});

app.get("/api/diagrams/:id", async (request, response) => {
  try {
    const artifact = await getArtifact(request.params.id);
    if (!artifact) return response.status(404).json({ error: "Diagram artifact not found. Use mermaid_studio_list_diagrams to discover available IDs." });
    return response.json({ artifact });
  } catch {
    return response.status(500).json({ error: "Could not read that diagram artifact." });
  }
});

app.post("/api/diagrams", async (request, response) => {
  const parsed = saveArtifactRequestSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid diagram request." });
  try {
    const png = Buffer.from(parsed.data.pngDataUrl.split(",", 2)[1], "base64");
    if (!png.length) return response.status(400).json({ error: "PNG content was empty. Render the diagram first, then save it." });
    try { assertPngWithinLimits(png); } catch (cause) {
      return response.status(400).json({ error: cause instanceof Error ? cause.message : "PNG content was invalid." });
    }
    const artifact = await saveArtifact({ ...parsed.data, png, renderer: "browser" });
    return response.status(201).json({ artifact });
  } catch {
    return response.status(500).json({ error: "Could not write the diagram files into artifacts/diagrams." });
  }
});

app.post("/api/diagrams/render", async (request, response) => {
  const parsed = renderDiagramRequestSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid render request." });
  const controller = new AbortController();
  const cancel = () => controller.abort();
  request.once("aborted", cancel);
  response.once("close", cancel);
  try {
    const rendered = await renderMermaidArtifacts(parsed.data.source, parsed.data.theme, parsed.data.scale, controller.signal);
    const artifact = await saveArtifact({ ...parsed.data, ...rendered, renderer: "cli" });
    return response.status(201).json({ artifact });
  } catch (cause) {
    return response.status(422).json({ error: cause instanceof Error ? cause.message : "The Mermaid code could not be rendered." });
  } finally {
    request.removeListener("aborted", cancel);
    response.removeListener("close", cancel);
  }
});

app.post("/api/diagrams/:id/revisions", async (request, response) => {
  const parsed = revisionDiagramRequestSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid revision request." });
  const controller = new AbortController();
  const cancel = () => controller.abort();
  request.once("aborted", cancel);
  response.once("close", cancel);
  try {
    const previous = await getArtifact(request.params.id);
    if (!previous) return response.status(404).json({ error: "Diagram artifact not found. Use mermaid_studio_list_diagrams to discover available IDs." });
    const rendered = await renderMermaidArtifacts(parsed.data.source, parsed.data.theme, parsed.data.scale, controller.signal);
    const artifact = await saveArtifact({ title: previous.title, ...parsed.data, ...rendered, renderer: "cli", revisionOf: previous.id });
    return response.status(201).json({ artifact });
  } catch (cause) {
    return response.status(422).json({ error: cause instanceof Error ? cause.message : "The Mermaid code could not be rendered." });
  } finally {
    request.removeListener("aborted", cancel);
    response.removeListener("close", cancel);
  }
});

const clientDirectory = join(APP_ROOT, "dist");
const clientIndex = join(clientDirectory, "index.html");
if (existsSync(clientIndex)) {
  app.use(express.static(clientDirectory));
  app.get("/{*splat}", (_request, response) => response.sendFile(clientIndex));
}

app.use((error: unknown, _request: express.Request, response: express.Response, next: express.NextFunction) => {
  if (error instanceof SyntaxError || (typeof error === "object" && error && "type" in error && (error as { type?: string }).type === "entity.too.large")) {
    return response.status(400).json({ error: "The request body was invalid or too large." });
  }
  return next(error);
});

const port = Number(process.env.PORT ?? 8787);
app.listen(port, "127.0.0.1", () => console.error(`Mermaid Studio API listening on http://127.0.0.1:${port}`));
