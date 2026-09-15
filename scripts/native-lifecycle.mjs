import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";

const probe = createServer();
await new Promise((done, reject) => probe.once("error", reject).listen(0, "127.0.0.1", done));
const address = probe.address();
const port = typeof address === "object" && address ? address.port : 0;
await new Promise((done) => probe.close(done));
if (!port) throw new Error("Could not reserve a native lifecycle test port.");

const executable = resolve("native/MermaidStudioViewer/.build/debug/MermaidStudioViewer");
const viewer = spawn(executable, [], {
  cwd: process.cwd(),
  env: { ...process.env, MERMAID_STUDIO_PORT: String(port) },
  stdio: "ignore"
});

try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (viewer.exitCode !== null) throw new Error(`Native viewer exited before its server became ready (${viewer.exitCode}).`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) { ready = true; break; }
    } catch { /* Native host is still starting. */ }
    await new Promise((done) => setTimeout(done, 100));
  }
  if (!ready) throw new Error("Native viewer did not start its development server.");
  viewer.kill("SIGTERM");
  await Promise.race([
    new Promise((done) => viewer.once("exit", done)),
    new Promise((_, reject) => setTimeout(() => reject(new Error("Native viewer did not exit after SIGTERM.")), 4_000))
  ]);
  let listenerRemains = false;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      listenerRemains = response.ok;
    } catch {
      listenerRemains = false;
      break;
    }
    await new Promise((done) => setTimeout(done, 100));
  }
  if (listenerRemains) throw new Error("Native viewer left its child Node server listening after termination.");
  console.log("native lifecycle passed; viewer launch and child-server termination verified");
} finally {
  if (viewer.exitCode === null) viewer.kill("SIGKILL");
}
