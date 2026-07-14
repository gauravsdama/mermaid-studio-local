import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
});

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto("http://127.0.0.1:8787", { waitUntil: "networkidle" });
  await page.locator(".diagram-stage svg").waitFor({ state: "visible" });
  await page.getByText("Write the diagram").waitFor();
  const edit = page.getByRole("button", { name: "Edit layout" });
  if (!(await edit.isEnabled())) throw new Error("Flowchart layout editor is not enabled.");
  await edit.click();
  await page.getByText("Freeform mode is open.").waitFor();
  await page.locator("[data-studio-edge-layer]").waitFor();
  if (await page.locator("[data-studio-edge-layer]").count() !== 1) throw new Error("Freeform flowchart arrows were not initialized.");
  await page.getByRole("button", { name: "Save to app folder" }).click();
  await page.getByText("Saved PNG, Mermaid code, and SVG").waitFor({ timeout: 15_000 });
  await page.screenshot({ path: "/tmp/mermaid-studio-smoke.png", fullPage: true });
  console.log("browser smoke passed; screenshot: /tmp/mermaid-studio-smoke.png");
} finally {
  await browser.close();
}
