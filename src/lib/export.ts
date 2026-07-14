const XMLNS = "http://www.w3.org/2000/svg";

export function cleanSvgForExport(svg: SVGSVGElement): string {
  const copy = svg.cloneNode(true) as SVGSVGElement;
  copy.querySelector("[data-studio-handle-layer]")?.remove();
  copy.removeAttribute("style");
  copy.setAttribute("xmlns", XMLNS);
  copy.setAttribute("width", String(Math.ceil(svg.viewBox.baseVal.width || svg.getBoundingClientRect().width)));
  copy.setAttribute("height", String(Math.ceil(svg.viewBox.baseVal.height || svg.getBoundingClientRect().height)));
  return new XMLSerializer().serializeToString(copy);
}

function flattenForeignObjects(svgText: string): string {
  const document = new DOMParser().parseFromString(svgText, "image/svg+xml");
  for (const foreignObject of document.querySelectorAll("foreignObject")) {
    const text = foreignObject.textContent?.replace(/\s+/g, " ").trim();
    if (!text) {
      foreignObject.remove();
      continue;
    }
    const x = Number.parseFloat(foreignObject.getAttribute("x") ?? "0");
    const y = Number.parseFloat(foreignObject.getAttribute("y") ?? "0");
    const width = Number.parseFloat(foreignObject.getAttribute("width") ?? "0");
    const height = Number.parseFloat(foreignObject.getAttribute("height") ?? "0");
    const replacement = document.createElementNS(XMLNS, "text");
    replacement.setAttribute("x", String(x + width / 2));
    replacement.setAttribute("y", String(y + height / 2));
    replacement.setAttribute("text-anchor", "middle");
    replacement.setAttribute("dominant-baseline", "middle");
    replacement.setAttribute("font-family", "Arial, sans-serif");
    replacement.setAttribute("font-size", "16");
    replacement.setAttribute("fill", "currentColor");
    replacement.textContent = text;
    foreignObject.replaceWith(replacement);
  }
  return new XMLSerializer().serializeToString(document.documentElement);
}

export async function svgToPngDataUrl(svgText: string, scale = 4): Promise<string> {
  const image = new Image();
  const blob = new Blob([flattenForeignObjects(svgText)], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("The SVG could not be prepared for PNG export."));
      image.src = url;
    });
    const width = Math.max(1, Math.ceil((image.naturalWidth || 1200) * scale));
    const height = Math.max(1, Math.ceil((image.naturalHeight || 800) * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser does not support canvas PNG export.");
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function downloadText(filename: string, contents: string, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type: mimeType }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadDataUrl(filename: string, dataUrl: string): void {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = filename;
  anchor.click();
}

export function filenameFor(title: string, extension: string): string {
  const slug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "diagram";
  return `${slug}.${extension}`;
}
