import { availableParallelism } from "node:os";
import { renderMermaid } from "@mermaid-js/mermaid-cli";
import puppeteer, { type Browser } from "puppeteer";
import { APP_ROOT } from "./paths.js";
import { assertPixelBudget, assertPngWithinLimits } from "./png.js";
import type { DiagramTheme } from "../shared/contracts.js";
import { RenderQueue } from "./renderQueue.js";

const renderConcurrency = Math.min(3, Math.max(1, Math.floor(availableParallelism() / 4)));
const maxQueuedRenders = renderConcurrency * 4;
const configuredTimeout = Number(process.env.MERMAID_STUDIO_RENDER_TIMEOUT_MS ?? 60_000);
const renderTimeoutMs = Number.isFinite(configuredTimeout) ? Math.min(300_000, Math.max(1, Math.floor(configuredTimeout))) : 60_000;
const renderQueue = new RenderQueue(renderConcurrency, maxQueuedRenders);

function abortError(signal: AbortSignal): Error {
  return signal.reason instanceof Error ? signal.reason : new Error("Rendering was cancelled.");
}

function abortable<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(abortError(signal));
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(abortError(signal));
    signal.addEventListener("abort", onAbort, { once: true });
    operation.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

function svgDimensions(svg: string): { width: number; height: number } {
  const match = svg.match(/\bviewBox=["']\s*[-+\d.eE]+\s+[-+\d.eE]+\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s*["']/i);
  if (!match) throw new Error("Headless rendering did not produce measurable SVG dimensions.");
  return { width: Math.ceil(Number(match[1])), height: Math.ceil(Number(match[2])) };
}

export async function renderMermaidArtifacts(source: string, theme: DiagramTheme, scale: number, requestSignal?: AbortSignal): Promise<{ png: Buffer; svg: string }> {
  const controller = new AbortController();
  const onRequestAbort = () => controller.abort(new Error("The client disconnected before rendering completed."));
  requestSignal?.addEventListener("abort", onRequestAbort, { once: true });
  if (requestSignal?.aborted) onRequestAbort();
  const timeout = setTimeout(() => controller.abort(new Error(`Headless rendering timed out after ${renderTimeoutMs}ms.`)), renderTimeoutMs);
  let release: (() => void) | undefined;
  let browser: Browser | undefined;
  try {
    release = await renderQueue.acquire(controller.signal);
    const launch = puppeteer.launch({ headless: true });
    try {
      browser = await abortable(launch, controller.signal);
    } catch (cause) {
      void launch.then((lateBrowser) => lateBrowser.close()).catch(() => undefined);
      throw cause;
    }
    const common = { backgroundColor: "transparent", mermaidConfig: { theme } };
    const svgResult = await abortable(renderMermaid(browser, source, "svg", common), controller.signal);
    const svg = new TextDecoder().decode(svgResult.data);
    const dimensions = svgDimensions(svg);
    assertPixelBudget(Math.ceil(dimensions.width * scale), Math.ceil(dimensions.height * scale));
    const pngResult = await abortable(renderMermaid(browser, source, "png", {
      ...common,
      viewport: { width: 800, height: 600, deviceScaleFactor: scale }
    }), controller.signal);
    const png = Buffer.from(pngResult.data);
    assertPngWithinLimits(png);
    return { png, svg };
  } catch (cause) {
    const rawMessage = cause instanceof Error ? cause.message : "Unknown Mermaid CLI failure";
    let message = rawMessage.replaceAll(APP_ROOT, "<project>");
    message = message.slice(0, 2_000);
    throw new Error(`Headless rendering failed. Ensure Mermaid CLI's browser dependency is installed, then retry. ${message}`);
  } finally {
    clearTimeout(timeout);
    requestSignal?.removeEventListener("abort", onRequestAbort);
    await browser?.close().catch(() => undefined);
    release?.();
  }
}

export const renderCapacity = { concurrent: renderConcurrency, queued: maxQueuedRenders } as const;
