import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

const artifactRoot = await mkdtemp(join(tmpdir(), "mermaid-studio-store-unit-"));
process.env.MERMAID_STUDIO_ARTIFACT_ROOT = artifactRoot;
const { getArtifact, listArtifacts, parseStoredArtifactRecord, saveArtifact } = await import("../server/store.js");

after(async () => {
  await rm(artifactRoot, { recursive: true, force: true });
});

function record(id: string, overrides: Record<string, unknown> = {}) {
  const prefix = relative(process.cwd(), join(artifactRoot, id));
  return {
    id,
    title: "Stored fixture",
    createdAt: "2026-09-27T12:00:00.000Z",
    pngPath: `${prefix}.png`,
    sourcePath: `${prefix}.mmd`,
    svgPath: `${prefix}.svg`,
    renderer: "cli",
    theme: "default",
    ...overrides
  };
}

test("stored records enforce ID-bound paths inside the artifact root", () => {
  const valid = record("valid-record");
  assert.deepEqual(parseStoredArtifactRecord(JSON.stringify(valid)), valid);
  assert.throws(() => parseStoredArtifactRecord(JSON.stringify(record("escaped-record", { pngPath: "/etc/passwd" }))), /path is invalid/);
  assert.throws(() => parseStoredArtifactRecord(JSON.stringify(record("mismatch-record", { pngPath: relative(process.cwd(), join(artifactRoot, "other.png")) }))), /path is invalid/);
});

test("artifact writes leave no staging files and malformed metadata does not poison pagination", async () => {
  for (const title of ["One", "Two", "Three"]) {
    await saveArtifact({
      title,
      source: "flowchart LR\nA-->B",
      theme: "default",
      png: Buffer.from("fixture"),
      svg: "<svg></svg>",
      renderer: "cli"
    });
  }
  await writeFile(join(artifactRoot, "zzzz-malformed.json"), "{not-json", "utf8");

  const first = await listArtifacts(2, 0);
  assert.equal(first.total, 4);
  assert.equal(first.items.length, 2);
  assert.equal(first.hasMore, true);
  assert.equal(first.nextOffset, 3);
  const second = await listArtifacts(2, first.nextOffset!);
  assert.equal(second.items.length, 1);
  assert.equal(second.hasMore, false);
  assert.equal((await readdir(artifactRoot)).some((name) => name.endsWith(".tmp")), false);
});

test("artifact lookup rejects path-like IDs without touching arbitrary files", async () => {
  assert.equal(await getArtifact("../../etc/passwd"), undefined);
});
