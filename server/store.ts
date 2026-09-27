import { mkdir, readFile, readdir } from "node:fs/promises";
import { basename, isAbsolute, join, relative, resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";
import { APP_ROOT, ARTIFACT_ROOT } from "./paths.js";
import { artifactRecordSchema, type ArtifactRecord } from "../shared/contracts.js";
import { commitFiles, type TransactionFile } from "./fileTransaction.js";

const storedArtifactRecordSchema = artifactRecordSchema.superRefine((record, context) => {
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
      context.addIssue({ code: "custom", message: `Artifact ${extension} path is invalid.`, path: [field] });
    }
  }
});

export type ArtifactRenderer = ArtifactRecord["renderer"];

function safeSlug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72) || "diagram";
}

function visiblePath(path: string): string {
  return relative(APP_ROOT, path);
}

export function parseStoredArtifactRecord(text: string): ArtifactRecord {
  return storedArtifactRecordSchema.parse(JSON.parse(text));
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
  const recordPath = join(ARTIFACT_ROOT, `${id}.json`);
  const transaction = randomUUID();
  const files: TransactionFile[] = [
    { finalPath: pngPath, temporaryPath: `${pngPath}.${transaction}.tmp`, data: input.png },
    { finalPath: sourcePath, temporaryPath: `${sourcePath}.${transaction}.tmp`, data: input.source },
    ...(svgPath ? [{ finalPath: svgPath, temporaryPath: `${svgPath}.${transaction}.tmp`, data: input.svg! }] : []),
    { finalPath: recordPath, temporaryPath: `${recordPath}.${transaction}.tmp`, data: JSON.stringify(record, null, 2) }
  ];
  await commitFiles(files);
  return record;
}

export async function listArtifacts(limit: number, offset: number): Promise<{ total: number; items: ArtifactRecord[]; hasMore: boolean; nextOffset?: number }> {
  try {
    const names = (await readdir(ARTIFACT_ROOT)).filter((name) => /^[a-zA-Z0-9-]+\.json$/.test(name)).sort().reverse();
    const items: ArtifactRecord[] = [];
    let cursor = Math.min(offset, names.length);
    const scanEnd = Math.min(names.length, cursor + limit * 4);
    while (cursor < scanEnd && items.length < limit) {
      const name = names[cursor];
      cursor += 1;
      try {
        items.push(parseStoredArtifactRecord(await readFile(join(ARTIFACT_ROOT, basename(name)), "utf8")));
      } catch { /* Isolate corrupt metadata instead of failing the whole page. */ }
    }
    const hasMore = cursor < names.length;
    return { total: names.length, items, hasMore, ...(hasMore ? { nextOffset: cursor } : {}) };
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === "ENOENT") return { total: 0, items: [], hasMore: false };
    throw cause;
  }
}

export async function getArtifact(id: string): Promise<ArtifactRecord | undefined> {
  if (!/^[a-zA-Z0-9-]+$/.test(id)) return undefined;
  try {
    return parseStoredArtifactRecord(await readFile(join(ARTIFACT_ROOT, `${id}.json`), "utf8"));
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw cause;
  }
}
