import { arrowKeyDelta, edgeControlPoint, projectClientPoint, type Point } from "./flowGeometry";

interface Edge {
  id: string;
  source: SVGGElement;
  target: SVGGElement;
  path: SVGPathElement;
  handle: SVGCircleElement;
  bend: Point;
}

const SVG_NS = "http://www.w3.org/2000/svg";

function pointInSvg(svg: SVGSVGElement, clientX: number, clientY: number): Point {
  return projectClientPoint(clientX, clientY, svg.getBoundingClientRect(), svg.viewBox.baseVal);
}

function center(svg: SVGSVGElement, node: SVGGElement): Point {
  const rect = node.getBoundingClientRect();
  return pointInSvg(svg, rect.left + rect.width / 2, rect.top + rect.height / 2);
}

function drawEdge(svg: SVGSVGElement, edge: Edge): void {
  const from = center(svg, edge.source);
  const to = center(svg, edge.target);
  const control = edgeControlPoint(from, to, edge.bend);
  edge.path.setAttribute("d", `M ${from.x} ${from.y} Q ${control.x} ${control.y} ${to.x} ${to.y}`);
  edge.handle.setAttribute("cx", String(control.x));
  edge.handle.setAttribute("cy", String(control.y));
}

function nodeForId(nodes: SVGGElement[], mermaidId: string): SVGGElement | undefined {
  return nodes.find((node) => node.id.includes(`-${mermaidId}-`));
}

export function enableFlowEditor(svg: SVGSVGElement): (() => void) | undefined {
  svg.querySelector("[data-studio-edge-layer]")?.remove();
  svg.querySelector("[data-studio-handle-layer]")?.remove();
  const nodes = [...svg.querySelectorAll<SVGGElement>("g.node[id]")];
  const originalEdges = [...svg.querySelectorAll<SVGPathElement>("path.flowchart-link[id]")];
  if (!nodes.length || !originalEdges.length) return undefined;

  const edgeLayer = document.createElementNS(SVG_NS, "g");
  edgeLayer.setAttribute("data-studio-edge-layer", "true");
  edgeLayer.setAttribute("fill", "none");
  edgeLayer.setAttribute("stroke", "currentColor");
  edgeLayer.setAttribute("stroke-width", "1.8");
  const handleLayer = document.createElementNS(SVG_NS, "g");
  handleLayer.setAttribute("data-studio-handle-layer", "true");
  const edges: Edge[] = [];
  const cleanup: Array<() => void> = [];

  for (const [edgeIndex, original] of originalEdges.entries()) {
    const match = (original.getAttribute("data-id") ?? original.id).match(/^L_(.+)_(.+?)_\d+$/);
    if (!match) continue;
    const source = nodeForId(nodes, match[1]);
    const target = nodeForId(nodes, match[2]);
    if (!source || !target) continue;
    original.style.display = "none";
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("data-studio-edge", "true");
    path.setAttribute("marker-end", original.getAttribute("marker-end") ?? "");
    const handle = document.createElementNS(SVG_NS, "circle");
    handle.setAttribute("r", "5");
    handle.setAttribute("fill", "#f5a524");
    handle.setAttribute("stroke", "#10211f");
    handle.setAttribute("stroke-width", "2");
    handle.setAttribute("tabindex", "0");
    handle.setAttribute("role", "slider");
    handle.setAttribute("aria-label", `Adjust connector ${edgeIndex + 1}`);
    handle.setAttribute("aria-valuetext", "Centered");
    handle.style.cursor = "grab";
    edgeLayer.append(path);
    handleLayer.append(handle);
    const edge: Edge = { id: original.id, source, target, path, handle, bend: { x: 0, y: 0 } };
    edges.push(edge);
    drawEdge(svg, edge);
    let stopActiveDrag: (() => void) | undefined;
    const onPointerDown = (event: PointerEvent) => {
      event.preventDefault();
      stopActiveDrag?.();
      handle.setPointerCapture(event.pointerId);
      const onMove = (move: PointerEvent) => {
        edge.bend = pointInSvg(svg, move.clientX, move.clientY);
        drawEdge(svg, edge);
      };
      const onFinish = () => {
        handle.removeEventListener("pointermove", onMove);
        handle.removeEventListener("pointerup", onFinish);
        handle.removeEventListener("pointercancel", onFinish);
        handle.removeEventListener("lostpointercapture", onFinish);
        stopActiveDrag = undefined;
      };
      stopActiveDrag = onFinish;
      handle.addEventListener("pointermove", onMove);
      handle.addEventListener("pointerup", onFinish, { once: true });
      handle.addEventListener("pointercancel", onFinish, { once: true });
      handle.addEventListener("lostpointercapture", onFinish, { once: true });
    };
    handle.addEventListener("pointerdown", onPointerDown);
    const onKeyDown = (event: KeyboardEvent) => {
      const delta = arrowKeyDelta(event.key, event.shiftKey);
      if (!delta) return;
      event.preventDefault();
      const from = center(svg, edge.source);
      const to = center(svg, edge.target);
      const current = edgeControlPoint(from, to, edge.bend);
      edge.bend = { x: current.x + delta.x, y: current.y + delta.y };
      handle.setAttribute("aria-valuetext", `Offset ${Math.round(edge.bend.x)}, ${Math.round(edge.bend.y)}`);
      drawEdge(svg, edge);
    };
    handle.addEventListener("keydown", onKeyDown);
    cleanup.push(() => {
      stopActiveDrag?.();
      handle.removeEventListener("pointerdown", onPointerDown);
      handle.removeEventListener("keydown", onKeyDown);
    });
  }
  svg.append(edgeLayer, handleLayer);

  for (const node of nodes) {
    const baseTransform = node.getAttribute("transform") ?? "";
    let offset = { x: 0, y: 0 };
    const originalCursor = node.style.cursor;
    const originalTabindex = node.getAttribute("tabindex");
    const originalRole = node.getAttribute("role");
    const originalAriaLabel = node.getAttribute("aria-label");
    node.setAttribute("data-studio-node", "true");
    node.style.cursor = "grab";
    node.setAttribute("tabindex", "0");
    node.setAttribute("role", "button");
    const nodeName = node.textContent?.replace(/\s+/g, " ").trim() || "Flowchart node";
    node.setAttribute("aria-label", `Move ${nodeName}`);
    let stopActiveDrag: (() => void) | undefined;
    const onPointerDown = (event: PointerEvent) => {
      event.preventDefault();
      stopActiveDrag?.();
      node.setPointerCapture(event.pointerId);
      const start = pointInSvg(svg, event.clientX, event.clientY);
      const startingOffset = { ...offset };
      node.style.cursor = "grabbing";
      const onMove = (move: PointerEvent) => {
        const current = pointInSvg(svg, move.clientX, move.clientY);
        offset = { x: startingOffset.x + current.x - start.x, y: startingOffset.y + current.y - start.y };
        node.setAttribute("transform", `${baseTransform} translate(${offset.x} ${offset.y})`);
        edges.filter((edge) => edge.source === node || edge.target === node).forEach((edge) => drawEdge(svg, edge));
      };
      const onFinish = () => {
        node.style.cursor = "grab";
        node.removeEventListener("pointermove", onMove);
        node.removeEventListener("pointerup", onFinish);
        node.removeEventListener("pointercancel", onFinish);
        node.removeEventListener("lostpointercapture", onFinish);
        stopActiveDrag = undefined;
      };
      stopActiveDrag = onFinish;
      node.addEventListener("pointermove", onMove);
      node.addEventListener("pointerup", onFinish, { once: true });
      node.addEventListener("pointercancel", onFinish, { once: true });
      node.addEventListener("lostpointercapture", onFinish, { once: true });
    };
    node.addEventListener("pointerdown", onPointerDown);
    const onKeyDown = (event: KeyboardEvent) => {
      const delta = arrowKeyDelta(event.key, event.shiftKey);
      if (!delta) return;
      event.preventDefault();
      offset.x += delta.x;
      offset.y += delta.y;
      node.setAttribute("transform", `${baseTransform} translate(${offset.x} ${offset.y})`);
      node.setAttribute("aria-label", `Move ${nodeName}. Offset ${Math.round(offset.x)}, ${Math.round(offset.y)}`);
      edges.filter((edge) => edge.source === node || edge.target === node).forEach((edge) => drawEdge(svg, edge));
    };
    node.addEventListener("keydown", onKeyDown);
    cleanup.push(() => {
      stopActiveDrag?.();
      node.removeEventListener("pointerdown", onPointerDown);
      node.removeEventListener("keydown", onKeyDown);
      node.style.cursor = originalCursor;
      if (originalTabindex === null) node.removeAttribute("tabindex"); else node.setAttribute("tabindex", originalTabindex);
      if (originalRole === null) node.removeAttribute("role"); else node.setAttribute("role", originalRole);
      if (originalAriaLabel === null) node.removeAttribute("aria-label"); else node.setAttribute("aria-label", originalAriaLabel);
    });
  }

  return () => {
    cleanup.forEach((dispose) => dispose());
    handleLayer.remove();
    nodes.forEach((node) => {
      node.removeAttribute("data-studio-node");
    });
  };
}
