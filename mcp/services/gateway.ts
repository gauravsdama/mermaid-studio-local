import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { APP_ROOT } from "../../server/paths.js";
import { gatewayHealthSchema } from "../../shared/contracts.js";
import { parseGatewayBaseUrl } from "./gatewayUrl.js";

const configuredBaseUrl = parseGatewayBaseUrl(process.env.MCP_API_BASE_URL ?? "http://127.0.0.1:8787");
const API_BASE_URL = configuredBaseUrl.origin;
let localGateway: ChildProcess | undefined;

async function gatewayIsReady(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2_000);
  try {
    const response = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal, redirect: "manual" });
    if (!response.ok) return false;
    const body = await response.json();
    if (!gatewayHealthSchema.safeParse(body).success) {
      throw new Error(`A different service is listening at ${API_BASE_URL}; refusing to send Mermaid source to it.`);
    }
    return true;
  } catch (cause) {
    if (cause instanceof Error && cause.message.includes("different service")) throw cause;
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForGateway(): Promise<void> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (await gatewayIsReady()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("The Mermaid Studio gateway did not start. Run npm run build and check that port 8787 is available.");
}

async function ensureGateway(): Promise<void> {
  if (await gatewayIsReady()) return;

  if (!localGateway || localGateway.exitCode !== null) {
    const entry = join(APP_ROOT, "dist", "server", "index.js");
    if (!existsSync(entry)) throw new Error("Mermaid Studio is not built. Run npm run build once before using the MCP server.");
    localGateway = spawn(process.execPath, [entry], {
      cwd: APP_ROOT,
      env: { ...process.env, PORT: configuredBaseUrl.port || "80" },
      stdio: "ignore"
    });
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
