import { MAX_PNG_BYTES, MAX_PNG_DIMENSION, MAX_PNG_PIXELS } from "../shared/contractValues.js";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export function assertPixelBudget(width: number, height: number): void {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) {
    throw new Error("PNG dimensions were invalid.");
  }
  if (width > MAX_PNG_DIMENSION || height > MAX_PNG_DIMENSION || width * height > MAX_PNG_PIXELS) {
    throw new Error(`PNG output is limited to ${MAX_PNG_DIMENSION}px per side and ${MAX_PNG_PIXELS} total pixels.`);
  }
}

export function inspectPng(png: Buffer): { width: number; height: number } {
  if (png.length < 24 || !png.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error("PNG content was not a valid image.");
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  assertPixelBudget(width, height);
  return { width, height };
}

export function assertPngWithinLimits(png: Buffer): void {
  if (png.length > MAX_PNG_BYTES) throw new Error("PNG content exceeded the 22.5 MB decoded limit.");
  inspectPng(png);
}
