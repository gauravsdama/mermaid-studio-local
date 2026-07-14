type Point = { x: number; y: number };

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
  const rect = svg.getBoundingClientRect();
  const box = svg.viewBox.baseVal;
  return {
    x: box.x + ((clientX - rect.left) / rect.width) * box.width,
    y: box.y + ((clientY - rect.top) / rect.height) * box.height
  };
}

function center(svg: SVGSVGElement, node: SVGGElement): Point {
  const rect = node.getBoundingClientRect();
  return pointInSvg(svg, rect.left + rect.width / 2, rect.top + rect.height / 2);
}

function drawEdge(svg: SVGSVGElement, edge: Edge): void {
  const from = center(svg, edge.source);
  const to = center(svg, edge.target);
  const control = edge.bend.x === 0 && edge.bend.y === 0 ? { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 } : edge.bend;
  edge.path.setAttribute("d", `M ${from.x} ${from.y} Q ${control.x} ${control.y} ${to.x} ${to.y}`);
  edge.handle.setAttribute("cx", String(control.x));
  edge.handle.setAttribute("cy", String(control.y));
}

function nodeForId(nodes: SVGGElement[], mermaidId: string): SVGGElement | undefined {
  return nodes.find((node) => node.id.includes(`-${mermaidId}-`));
}

export function enableFlowEditor(svg: SVGSVGElement): (() => void) | undefined {
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

  for (const original of originalEdges) {
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
    handle.style.cursor = "grab";
    edgeLayer.append(path);
    handleLayer.append(handle);
    const edge: Edge = { id: original.id, source, target, path, handle, bend: { x: 0, y: 0 } };
    edges.push(edge);
    drawEdge(svg, edge);
    const onPointerDown = (event: PointerEvent) => {
      event.preventDefault();
      handle.setPointerCapture(event.pointerId);
      const onMove = (move: PointerEvent) => {
        edge.bend = pointInSvg(svg, move.clientX, move.clientY);
        drawEdge(svg, edge);
      };
      const onUp = () => {
        handle.removeEventListener("pointermove", onMove);
        handle.removeEventListener("pointerup", onUp);
      };
      handle.addEventListener("pointermove", onMove);
      handle.addEventListener("pointerup", onUp, { once: true });
    };
    handle.addEventListener("pointerdown", onPointerDown);
    cleanup.push(() => handle.removeEventListener("pointerdown", onPointerDown));
  }
  svg.append(edgeLayer, handleLayer);

  for (const node of nodes) {
    const baseTransform = node.getAttribute("transform") ?? "";
    let offset = { x: 0, y: 0 };
    node.style.cursor = "grab";
    const onPointerDown = (event: PointerEvent) => {
      event.preventDefault();
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
      const onUp = () => {
        node.style.cursor = "grab";
        node.removeEventListener("pointermove", onMove);
        node.removeEventListener("pointerup", onUp);
      };
      node.addEventListener("pointermove", onMove);
      node.addEventListener("pointerup", onUp, { once: true });
    };
    node.addEventListener("pointerdown", onPointerDown);
    cleanup.push(() => node.removeEventListener("pointerdown", onPointerDown));
  }

  return () => {
    cleanup.forEach((dispose) => dispose());
    edgeLayer.remove();
    handleLayer.remove();
    originalEdges.forEach((edge) => { edge.style.display = ""; });
    nodes.forEach((node) => { node.style.cursor = ""; });
  };
}
