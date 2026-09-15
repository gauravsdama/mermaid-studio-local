import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { createRuntimeFixture } from "./runtime-fixture.mjs";

const fixture = await createRuntimeFixture();

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
});

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
  await page.getByRole("button", { name: "Finish layout" }).click();
  if (await page.locator("[data-studio-handle-layer]").count()) throw new Error("Layout handles remained after finishing layout edit.");
  if (!(await page.locator("[data-studio-edge-layer] path").count())) throw new Error("Adjusted connectors disappeared after finishing layout edit.");
  const svg = page.locator(".diagram-stage svg");
  if (await svg.getAttribute("role") !== "img" || !(await svg.locator("title").textContent()) || !(await svg.locator("desc").textContent())) throw new Error("Rendered SVG is missing its accessible title or summary.");
  await page.getByRole("button", { name: "Save to app folder" }).click();
  await page.getByText("Saved PNG, Mermaid code, and SVG").waitFor({ timeout: 15_000 });
  await page.getByRole("button", { name: "Edit layout" }).click();
  await page.getByRole("button", { name: "Finish layout" }).click();
  await page.getByRole("button", { name: "Zoom out" }).click();
  await page.getByRole("button", { name: "Zoom out" }).click();
  await page.getByRole("button", { name: "Zoom out" }).click();
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
