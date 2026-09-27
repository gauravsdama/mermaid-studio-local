import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname } from "node:path";
import { createRuntimeFixture } from "./runtime-fixture.mjs";

const fixture = await createRuntimeFixture();

const systemChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const executablePath = process.env.CHROME_PATH ?? (existsSync(systemChrome) ? systemChrome : undefined);
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(fixture.baseUrl, { waitUntil: "networkidle" });
  await page.locator(".diagram-stage svg").waitFor({ state: "visible" });
  await page.getByText("Write the diagram").waitFor();
  const edit = page.getByRole("button", { name: "Edit layout" });
  if (!(await edit.isEnabled())) throw new Error("Flowchart layout editor is not enabled.");
  await edit.click();
  await page.getByText("Drag nodes and amber connectors.").waitFor();
  await page.locator("[data-studio-edge-layer]").waitFor();
  if (await page.locator("[data-studio-edge-layer]").count() !== 1) throw new Error("Freeform flowchart arrows were not initialized.");
  const node = page.locator("g.node[tabindex='0']").first();
  await node.focus();
  const beforeTransform = await node.getAttribute("transform");
  await page.keyboard.press("ArrowRight");
  const afterTransform = await node.getAttribute("transform");
  if (afterTransform === beforeTransform) throw new Error("Keyboard node movement did not update the diagram.");
  const nodeBox = await node.boundingBox();
  if (!nodeBox) throw new Error("Could not locate the flowchart node for pointer cleanup testing.");
  await page.mouse.move(nodeBox.x + nodeBox.width / 2, nodeBox.y + nodeBox.height / 2);
  await page.mouse.down();
  await node.dispatchEvent("pointercancel", { pointerId: 1 });
  const cancelledTransform = await node.getAttribute("transform");
  await page.mouse.move(nodeBox.x + nodeBox.width + 80, nodeBox.y + nodeBox.height + 80);
  if (await node.getAttribute("transform") !== cancelledTransform) throw new Error("Cancelled pointer drag continued mutating the diagram.");
  await page.mouse.up();
  await page.getByRole("button", { name: "Finish layout" }).click();
  if (await page.locator("[data-studio-handle-layer]").count()) throw new Error("Layout handles remained after finishing layout edit.");
  if (!(await page.locator("[data-studio-edge-layer] path").count())) throw new Error("Adjusted connectors disappeared after finishing layout edit.");
  const svg = page.locator(".diagram-stage svg");
  if (await svg.getAttribute("role") !== "img" || !(await svg.locator("title").textContent()) || !(await svg.locator("desc").textContent())) throw new Error("Rendered SVG is missing its accessible title or summary.");
  await page.getByRole("button", { name: "Save to app folder" }).click();
  await page.getByText("Saved PNG, Mermaid code, and SVG").waitFor({ timeout: 15_000 });
  if (await page.locator(".diagram-stage [data-studio-node], .diagram-stage g.node[role='button']").count()) throw new Error("Layout nodes retained editor-only control semantics after finishing layout edit.");
  const editor = page.getByRole("textbox", { name: "Mermaid code" });
  await editor.fill("sequenceDiagram\n  Alice->>Bob: First\n  Bob-->>Alice: Second");
  const sequence = page.getByLabel("Sequence step");
  await sequence.waitFor();
  await sequence.fill("2");
  await editor.fill("sequenceDiagram\n  Alice->>Bob: Replacement");
  await page.waitForFunction(() => {
    const input = document.querySelector("input[aria-label='Sequence step']");
    return input instanceof HTMLInputElement && input.max === "1" && input.value === "0";
  });
  await editor.fill("flowchart LR\n  Final[Newest render] --> Wins[Visible]");
  await page.locator(".diagram-stage svg").waitFor({ state: "visible" });
  await page.waitForFunction(() => document.querySelector(".diagram-stage")?.textContent?.includes("Newest render"));
  await page.evaluate(() => {
    localStorage.setItem("mermaid-studio:library", JSON.stringify([
      { id: "legacy-valid", title: "Legacy diagram", source: "flowchart LR\nA-->B", theme: "default", updatedAt: "2026-01-01T00:00:00.000Z" },
      { id: "legacy-invalid", title: "Broken", source: 42, theme: "invented", updatedAt: "never" }
    ]));
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.locator(".diagram-stage svg").waitFor({ state: "visible" });
  await page.getByRole("button", { name: "Legacy diagram", exact: true }).waitFor();
  const migrated = await page.evaluate(() => JSON.parse(localStorage.getItem("mermaid-studio:library") ?? "null"));
  if (migrated?.version !== 1 || migrated?.items?.length !== 1 || migrated.items[0].id !== "legacy-valid") throw new Error("Legacy browser state was not validated and migrated to version 1.");
  const screenshotPath = process.env.SCREENSHOT_PATH ?? "/tmp/mermaid-studio-smoke.png";
  await mkdir(dirname(screenshotPath), { recursive: true });
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  if (!(await page.getByRole("button", { name: "Download SVG" }).isVisible())) throw new Error("Export controls were not visible at the mobile viewport.");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const transitionDuration = await page.locator("button").first().evaluate((element) => getComputedStyle(element).transitionDuration);
  const longestTransition = Math.max(...transitionDuration.split(",").map((value) => Number.parseFloat(value) || 0));
  if (longestTransition > 0.001) throw new Error(`Reduced-motion styles were not applied (${transitionDuration}).`);
  console.log(`browser smoke passed; screenshot: ${screenshotPath}`);
} finally {
  await browser.close();
  await fixture.stop();
}
