import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { chromium } from "playwright";

const root = resolve("dist-demo");
const basePath = "/mermaid-studio-local/";
const contentTypes = { ".css": "text/css", ".html": "text/html", ".js": "text/javascript", ".svg": "image/svg+xml" };
const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url ?? basePath, "http://127.0.0.1").pathname;
    const relative = pathname.startsWith(basePath) ? pathname.slice(basePath.length) : "";
    const candidate = normalize(join(root, relative || "index.html"));
    if (!candidate.startsWith(`${root}/`)) throw new Error("Invalid path");
    const body = await readFile(candidate);
    response.writeHead(200, { "content-type": contentTypes[extname(candidate)] ?? "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404).end("Not found");
  }
});
await new Promise((resolveListen, reject) => server.once("error", reject).listen(0, "127.0.0.1", resolveListen));
const address = server.address();
const port = typeof address === "object" && address ? address.port : 0;
if (!port) throw new Error("Could not start static demo fixture.");

const systemChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const executablePath = process.env.CHROME_PATH ?? (existsSync(systemChrome) ? systemChrome : undefined);
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const backendRequests = [];
  page.on("request", (request) => { if (new URL(request.url()).pathname.startsWith("/api/")) backendRequests.push(request.url()); });
  await page.goto(`http://127.0.0.1:${port}${basePath}`, { waitUntil: "networkidle" });
  await page.locator(".diagram-stage svg").waitFor();
  const prompts = [
    ["Map a checkout request", "Checkout service flow"],
    ["Trace an incident handoff", "Incident response sequence"],
    ["Model release data", "Release data model"],
    ["Plan a launch timeline", "Launch timeline"],
    ["Show order states", "Order state machine"]
  ];
  if (await page.locator(".demo-list button").count() !== prompts.length) throw new Error("Static demo did not expose exactly five prompts.");
  if (await page.getByRole("button", { name: "Save to app folder" }).count()) throw new Error("Static demo exposed the unavailable backend save action.");
  for (const [label, expectedTitle] of prompts) {
    await page.getByRole("button", { name: label }).click();
    await page.getByLabel("Diagram title").waitFor();
    await page.waitForFunction((title) => document.querySelector("#diagram-title")?.value === title, expectedTitle);
    await page.locator(".diagram-stage svg").waitFor({ state: "visible" });
  }
  if (backendRequests.length) throw new Error(`Static demo attempted backend requests: ${backendRequests.join(", ")}`);
  console.log("static demo smoke passed; five simulated prompts rendered without a backend");
} finally {
  await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}
