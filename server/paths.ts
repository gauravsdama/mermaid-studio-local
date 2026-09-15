import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, isAbsolute, join, resolve } from "node:path";

function findProjectRoot(start: string): string {
  let current = start;
  while (true) {
    if (existsSync(join(current, "package.json")) && (existsSync(join(current, "server")) || existsSync(join(current, "dist", "server")))) return current;
    const parent = dirname(current);
    if (parent === current) throw new Error("Could not locate the Mermaid Studio project root.");
    current = parent;
  }
}

/** The project root is stable even when an MCP host supplies a different cwd. */
export const APP_ROOT = findProjectRoot(dirname(fileURLToPath(import.meta.url)));
const configuredArtifactRoot = process.env.MERMAID_STUDIO_ARTIFACT_ROOT;
export const ARTIFACT_ROOT = configuredArtifactRoot
  ? (isAbsolute(configuredArtifactRoot) ? configuredArtifactRoot : resolve(APP_ROOT, configuredArtifactRoot))
  : join(APP_ROOT, "artifacts", "diagrams");
