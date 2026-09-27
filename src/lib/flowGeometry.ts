export type Point = { x: number; y: number };

interface RectLike { left: number; top: number; width: number; height: number }
interface ViewBoxLike { x: number; y: number; width: number; height: number }

export function projectClientPoint(clientX: number, clientY: number, rect: RectLike, viewBox: ViewBoxLike): Point {
  return {
    x: viewBox.x + ((clientX - rect.left) / rect.width) * viewBox.width,
    y: viewBox.y + ((clientY - rect.top) / rect.height) * viewBox.height
  };
}

export function edgeControlPoint(from: Point, to: Point, bend: Point): Point {
  return bend.x === 0 && bend.y === 0
    ? { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }
    : bend;
}

export function arrowKeyDelta(key: string, shiftKey: boolean): Point | undefined {
  const movement = shiftKey ? 10 : 2;
  if (key === "ArrowLeft") return { x: -movement, y: 0 };
  if (key === "ArrowRight") return { x: movement, y: 0 };
  if (key === "ArrowUp") return { x: 0, y: -movement };
  if (key === "ArrowDown") return { x: 0, y: movement };
  return undefined;
}
