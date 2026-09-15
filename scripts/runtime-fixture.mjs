import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function reservePort() {
  const server = createServer();
  await new Promise((resolve, reject) => server.once("error", reject).listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  await new Promise((resolve) => server.close(resolve));
  if (!port) throw new Error("Could not reserve a loopback test port.");
  return port;
}

export async function createRuntimeFixture() {
  const artifactRoot = await mkdtemp(join(tmpdir(), "mermaid-studio-test-artifacts-"));
  const port = await reservePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ["dist/server/index.js"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port), MERMAID_STUDIO_ARTIFACT_ROOT: artifactRoot },
    stdio: ["ignore", "ignore", "pipe"]
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr += String(chunk); });
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Test server exited early. ${stderr}`);
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) {
        return {
          artifactRoot,
          baseUrl,
          port,
          async stop() {
            if (child.exitCode === null) {
              child.kill("SIGTERM");
              await Promise.race([
                new Promise((resolve) => child.once("exit", resolve)),
                new Promise((resolve) => setTimeout(resolve, 2_000))
              ]);
              if (child.exitCode === null) child.kill("SIGKILL");
            }
            await rm(artifactRoot, { recursive: true, force: true });
          }
        };
      }
    } catch { /* Server is still starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  child.kill("SIGKILL");
  await rm(artifactRoot, { recursive: true, force: true });
  throw new Error(`Test server did not become ready. ${stderr}`);
}
