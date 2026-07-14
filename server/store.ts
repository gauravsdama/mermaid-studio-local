import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { randomUUID } from "node:crypto";

export type ArtifactRenderer = "browser" | "cli";

export interface ArtifactRecord {
  id: string;
  title: string;
  createdAt: string;
  pngPath: string;
  sourcePath: string;
  svgPath?: string;
  renderer: ArtifactRenderer;
  theme: string;
}

const APP_ROOT = process.cwd();
const ARTIFACT_ROOT = join(APP_ROOT, "artifacts", "diagrams");

function safeSlug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72) || "diagram";
}

function visiblePath(path: string): string {
  return relative(APP_ROOT, path);
}

export async function saveArtifact(input: {
  title: string;
  source: string;
  theme: string;
  png: Buffer;
  svg?: string;
  renderer: ArtifactRenderer;
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
    theme: input.theme
  };
  await Promise.all([
    writeFile(pngPath, input.png),
    writeFile(sourcePath, input.source, "utf8"),
    ...(svgPath ? [writeFile(svgPath, input.svg!, "utf8")] : []),
    writeFile(join(ARTIFACT_ROOT, `${id}.json`), JSON.stringify(record, null, 2), "utf8")
  ]);
  return record;
}

export async function listArtifacts(limit: number, offset: number): Promise<{ total: number; items: ArtifactRecord[]; hasMore: boolean; nextOffset?: number }> {
  try {
    const names = (await readdir(ARTIFACT_ROOT)).filter((name) => name.endsWith(".json")).sort().reverse();
    const records = await Promise.all(names.map(async (name) => JSON.parse(await readFile(join(ARTIFACT_ROOT, basename(name)), "utf8")) as ArtifactRecord));
    const items = records.slice(offset, offset + limit);
    const hasMore = offset + items.length < records.length;
    return { total: records.length, items, hasMore, ...(hasMore ? { nextOffset: offset + items.length } : {}) };
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === "ENOENT") return { total: 0, items: [], hasMore: false };
    throw cause;
  }
}

export async function getArtifact(id: string): Promise<ArtifactRecord | undefined> {
  if (!/^[a-zA-Z0-9-]+$/.test(id)) return undefined;
  try {
    return JSON.parse(await readFile(join(ARTIFACT_ROOT, `${id}.json`), "utf8")) as ArtifactRecord;
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw cause;
  }
}
