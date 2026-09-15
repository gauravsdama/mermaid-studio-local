import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { APP_ROOT } from "../../server/paths.js";

const API_BASE_URL = process.env.MCP_API_BASE_URL ?? "http://127.0.0.1:8787";
let localGateway: ChildProcess | undefined;

async function waitForGateway(): Promise<void> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (response.ok) return;
    } catch { /* The sidecar may still be starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("The Mermaid Studio gateway did not start. Run npm run build and check that port 8787 is available.");
}

async function ensureGateway(): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (response.ok) return;
  } catch { /* Start a local sidecar below when no gateway is reachable. */ }

  if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(API_BASE_URL)) {
    throw new Error(`Mermaid Studio gateway is unavailable at ${API_BASE_URL}. The MCP server only auto-starts a local gateway.`);
  }
  if (!localGateway || localGateway.exitCode !== null) {
    const entry = join(APP_ROOT, "dist", "server", "index.js");
    if (!existsSync(entry)) throw new Error("Mermaid Studio is not built. Run npm run build once before using the MCP server.");
    localGateway = spawn(process.execPath, [entry], { cwd: APP_ROOT, stdio: "ignore" });
    process.once("exit", () => localGateway?.kill());
  }
  await waitForGateway();
}

export async function callGateway<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 70_000);
  try {
    await ensureGateway();
    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, signal: controller.signal, headers: { accept: "application/json", ...options.headers } });
    const body = await response.json().catch(() => ({})) as T & { error?: string };
    if (!response.ok) throw new Error(body.error ?? `Gateway request failed with HTTP ${response.status}.`);
    return body;
  } catch (cause) {
    if (cause instanceof Error && cause.name === "AbortError") throw new Error("The Mermaid Studio gateway timed out after 70 seconds. Check the API and Mermaid CLI browser installation.");
    throw cause;
  } finally {
    clearTimeout(timeout);
  }
}
