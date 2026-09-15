import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { availableParallelism } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { APP_ROOT } from "./paths.js";

const execFileAsync = promisify(execFile);
const renderConcurrency = Math.min(3, Math.max(1, Math.floor(availableParallelism() / 4)));
const maxQueuedRenders = renderConcurrency * 4;
const configuredTimeout = Number(process.env.MERMAID_STUDIO_RENDER_TIMEOUT_MS ?? 60_000);
const renderTimeoutMs = Number.isFinite(configuredTimeout) ? Math.max(1, Math.floor(configuredTimeout)) : 60_000;
let activeRenders = 0;
const waiting: Array<() => void> = [];

async function acquireRenderSlot(): Promise<() => void> {
  if (activeRenders < renderConcurrency) {
    activeRenders += 1;
    return releaseRenderSlot;
  }
  if (waiting.length >= maxQueuedRenders) {
    throw new Error("This Mac is already rendering several diagrams. Wait for one to finish, then retry.");
  }
  await new Promise<void>((resolve) => waiting.push(resolve));
  return releaseRenderSlot;
}

function releaseRenderSlot(): void {
  const next = waiting.shift();
  if (next) next();
  else activeRenders = Math.max(0, activeRenders - 1);
}

export async function renderMermaidArtifacts(source: string, theme: string, scale: number): Promise<{ png: Buffer; svg: string }> {
  const release = await acquireRenderSlot();
  let temp: string | undefined;
  try {
    temp = await mkdtemp(join(tmpdir(), "mermaid-studio-"));
    const input = join(temp, "diagram.mmd");
    const output = join(temp, "diagram.png");
    const svgOutput = join(temp, "diagram.svg");
    const config = join(temp, "mermaid-config.json");
    const command = process.platform === "win32" ? join(APP_ROOT, "node_modules", ".bin", "mmdc.cmd") : join(APP_ROOT, "node_modules", ".bin", "mmdc");
    await Promise.all([writeFile(input, source, "utf8"), writeFile(config, JSON.stringify({ theme }), "utf8")]);
    const themeArguments = theme === "base" ? ["-c", config] : ["-t", theme];
    await Promise.all([
      execFileAsync(command, ["-i", input, "-o", output, ...themeArguments, "-b", "transparent", "-s", String(scale)], { timeout: renderTimeoutMs, maxBuffer: 1024 * 1024 }),
      execFileAsync(command, ["-i", input, "-o", svgOutput, ...themeArguments, "-b", "transparent"], { timeout: renderTimeoutMs, maxBuffer: 1024 * 1024 })
    ]);
    const [png, svg] = await Promise.all([readFile(output), readFile(svgOutput, "utf8")]);
    return { png, svg };
  } catch (cause) {
    const rawMessage = cause instanceof Error ? cause.message : "Unknown Mermaid CLI failure";
    let message = rawMessage.replaceAll(APP_ROOT, "<project>");
    if (temp) message = message.replaceAll(temp, "<temporary directory>");
    message = message.slice(0, 2_000);
    throw new Error(`Headless rendering failed. Ensure Mermaid CLI's browser dependency is installed, then retry. ${message}`);
  } finally {
    if (temp) await rm(temp, { recursive: true, force: true });
    release();
  }
}

export const renderCapacity = { concurrent: renderConcurrency, queued: maxQueuedRenders } as const;
