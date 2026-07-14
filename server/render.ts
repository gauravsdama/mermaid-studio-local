import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function renderMermaidPng(source: string, theme: string, scale: number): Promise<Buffer> {
  const temp = await mkdtemp(join(tmpdir(), "mermaid-studio-"));
  const input = join(temp, "diagram.mmd");
  const output = join(temp, "diagram.png");
  const command = process.platform === "win32" ? join(process.cwd(), "node_modules", ".bin", "mmdc.cmd") : join(process.cwd(), "node_modules", ".bin", "mmdc");
  try {
    await writeFile(input, source, "utf8");
    await execFileAsync(command, ["-i", input, "-o", output, "-t", theme, "-b", "transparent", "-s", String(scale)], { timeout: 60_000, maxBuffer: 1024 * 1024 });
    return await readFile(output);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Unknown Mermaid CLI failure";
    throw new Error(`Headless rendering failed. Ensure Mermaid CLI's browser dependency is installed, then retry. ${message}`);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}
