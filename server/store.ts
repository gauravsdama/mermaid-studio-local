import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, isAbsolute, join, relative, resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { APP_ROOT, ARTIFACT_ROOT } from "./paths.js";

export type ArtifactRenderer = "browser" | "cli";

const artifactId = z.string().regex(/^[a-zA-Z0-9-]+$/).max(220);
const artifactTheme = z.enum(["default", "dark", "forest", "neutral", "base"]);

export const artifactRecordSchema = z.object({
  id: artifactId,
  title: z.string().trim().min(1).max(120),
  createdAt: z.string().datetime(),
  pngPath: z.string().min(1),
  sourcePath: z.string().min(1),
  svgPath: z.string().min(1).optional(),
  renderer: z.enum(["browser", "cli"]),
  theme: artifactTheme,
  revisionOf: artifactId.optional()
}).strict().superRefine((record, context) => {
  const expected: Array<["pngPath" | "sourcePath" | "svgPath", string, string]> = [
    ["pngPath", record.pngPath, ".png"],
    ["sourcePath", record.sourcePath, ".mmd"],
    ...(record.svgPath ? [["svgPath", record.svgPath, ".svg"] as ["svgPath", string, string]] : [])
  ];
  for (const [field, storedPath, extension] of expected) {
    const resolvedPath = resolve(APP_ROOT, storedPath);
    const withinArtifacts = relative(resolve(ARTIFACT_ROOT), resolvedPath);
    const expectedName = `${record.id}${extension}`;
    if (isAbsolute(storedPath) || withinArtifacts === ".." || withinArtifacts.startsWith(`..${sep}`) || isAbsolute(withinArtifacts) || basename(resolvedPath) !== expectedName) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: `Artifact ${extension} path is invalid.`, path: [field] });
    }
  }
});

export type ArtifactRecord = z.infer<typeof artifactRecordSchema>;

function safeSlug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72) || "diagram";
}

function visiblePath(path: string): string {
  return relative(APP_ROOT, path);
}

function parseRecord(text: string): ArtifactRecord {
  return artifactRecordSchema.parse(JSON.parse(text));
}

export async function saveArtifact(input: {
  title: string;
  source: string;
  theme: ArtifactRecord["theme"];
  png: Buffer;
  svg?: string;
  renderer: ArtifactRenderer;
  revisionOf?: string;
}): Promise<ArtifactRecord> {
  await mkdir(ARTIFACT_ROOT, { recursive: true });
  const id = `${new Date().toISOString().replace(/[:.]/g, "-")}-${safeSlug(input.title)}-${randomUUID().slice(0, 8)}`;
  const pngPath = join(ARTIFACT_ROOT, `${id}.png`);
  const sourcePath = join(ARTIFACT_ROOT, `${id}.mmd`);
  const svgPath = input.svg ? join(ARTIFACT_ROOT, `${id}.svg`) : undefined;
  const record: ArtifactRecord = {
    id,
    title: input.title,
    createdAt: new Date().toISOString(),
    pngPath: visiblePath(pngPath),
    sourcePath: visiblePath(sourcePath),
    ...(svgPath ? { svgPath: visiblePath(svgPath) } : {}),
    renderer: input.renderer,
    theme: input.theme,
    ...(input.revisionOf ? { revisionOf: input.revisionOf } : {})
  };
  await Promise.all([
    writeFile(pngPath, input.png),
    writeFile(sourcePath, input.source, "utf8"),
    ...(svgPath ? [writeFile(svgPath, input.svg!, "utf8")] : [])
  ]);
  await writeFile(join(ARTIFACT_ROOT, `${id}.json`), JSON.stringify(record, null, 2), "utf8");
  return record;
}

export async function listArtifacts(limit: number, offset: number): Promise<{ total: number; items: ArtifactRecord[]; hasMore: boolean; nextOffset?: number }> {
  try {
    const names = (await readdir(ARTIFACT_ROOT)).filter((name) => /^[a-zA-Z0-9-]+\.json$/.test(name)).sort().reverse();
    const pageNames = names.slice(offset, offset + limit);
    const items = await Promise.all(pageNames.map(async (name) => parseRecord(await readFile(join(ARTIFACT_ROOT, basename(name)), "utf8"))));
    const hasMore = offset + items.length < names.length;
    return { total: names.length, items, hasMore, ...(hasMore ? { nextOffset: offset + items.length } : {}) };
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === "ENOENT") return { total: 0, items: [], hasMore: false };
    throw cause;
  }
}

export async function getArtifact(id: string): Promise<ArtifactRecord | undefined> {
  if (!/^[a-zA-Z0-9-]+$/.test(id)) return undefined;
  try {
    return parseRecord(await readFile(join(ARTIFACT_ROOT, `${id}.json`), "utf8"));
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw cause;
  }
}
