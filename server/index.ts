import cors from "cors";
import express from "express";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { renderCapacity, renderMermaidArtifacts } from "./render.js";
import { getArtifact, listArtifacts, saveArtifact } from "./store.js";
import { APP_ROOT } from "./paths.js";

const diagramInput = z.object({
  title: z.string().trim().min(1, "A diagram title is required.").max(120),
  source: z.string().trim().min(1, "Mermaid code is required.").max(200_000),
  theme: z.enum(["default", "dark", "forest", "neutral", "base"]),
  pngDataUrl: z.string().startsWith("data:image/png;base64,").max(30_000_000),
  svg: z.string().max(5_000_000).optional()
}).strict();

const renderInput = z.object({
  title: z.string().trim().min(1).max(120),
  source: z.string().trim().min(1).max(200_000),
  theme: z.enum(["default", "dark", "forest", "neutral", "base"]).default("default"),
  scale: z.number().int().min(1).max(4).default(4)
}).strict();

const revisionInput = renderInput.omit({ title: true });

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

app.get("/health", (_request, response) => response.json({ ok: true, service: "mermaid-studio-api", renderCapacity }));

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
  const parsed = diagramInput.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid diagram request." });
  try {
    const png = Buffer.from(parsed.data.pngDataUrl.split(",", 2)[1], "base64");
    if (!png.length) return response.status(400).json({ error: "PNG content was empty. Render the diagram first, then save it." });
    if (png.length > 22_500_000 || !png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
      return response.status(400).json({ error: "PNG content was not a valid image or exceeded the 22.5 MB decoded limit." });
    }
    const artifact = await saveArtifact({ ...parsed.data, png, renderer: "browser" });
    return response.status(201).json({ artifact });
  } catch {
    return response.status(500).json({ error: "Could not write the diagram files into artifacts/diagrams." });
  }
});

app.post("/api/diagrams/render", async (request, response) => {
  const parsed = renderInput.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid render request." });
  try {
    const rendered = await renderMermaidArtifacts(parsed.data.source, parsed.data.theme, parsed.data.scale);
    const artifact = await saveArtifact({ ...parsed.data, ...rendered, renderer: "cli" });
    return response.status(201).json({ artifact });
  } catch (cause) {
    return response.status(422).json({ error: cause instanceof Error ? cause.message : "The Mermaid code could not be rendered." });
  }
});

app.post("/api/diagrams/:id/revisions", async (request, response) => {
  const previous = await getArtifact(request.params.id);
  if (!previous) return response.status(404).json({ error: "Diagram artifact not found. Use mermaid_studio_list_diagrams to discover available IDs." });
  const parsed = revisionInput.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid revision request." });
  try {
    const rendered = await renderMermaidArtifacts(parsed.data.source, parsed.data.theme, parsed.data.scale);
    const artifact = await saveArtifact({ title: previous.title, ...parsed.data, ...rendered, renderer: "cli", revisionOf: previous.id });
    return response.status(201).json({ artifact });
  } catch (cause) {
    return response.status(422).json({ error: cause instanceof Error ? cause.message : "The Mermaid code could not be rendered." });
  }
});

const clientDirectory = join(APP_ROOT, "dist");
const clientIndex = join(clientDirectory, "index.html");
if (existsSync(clientIndex)) {
  app.use(express.static(clientDirectory));
  app.get("/{*splat}", (_request, response) => response.sendFile(clientIndex));
}

const port = Number(process.env.PORT ?? 8787);
app.listen(port, "127.0.0.1", () => console.error(`Mermaid Studio API listening on http://127.0.0.1:${port}`));
