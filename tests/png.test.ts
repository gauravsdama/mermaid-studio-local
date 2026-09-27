import assert from "node:assert/strict";
import test from "node:test";
import { assertPixelBudget, assertPngWithinLimits, inspectPng } from "../server/png.js";
import { MAX_PNG_BYTES, MAX_PNG_DIMENSION, MAX_PNG_PIXELS } from "../shared/contractValues.js";

function pngHeader(width: number, height: number, bytes = 24): Buffer {
  const png = Buffer.alloc(bytes);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png);
  png.writeUInt32BE(width, 16);
  png.writeUInt32BE(height, 20);
  return png;
}

test("PNG inspection accepts the signature and reads dimensions", () => {
  assert.deepEqual(inspectPng(pngHeader(320, 240)), { width: 320, height: 240 });
});

test("PNG validation rejects malformed headers and unsafe dimensions", () => {
  assert.throws(() => inspectPng(Buffer.from("not a png")), /valid image/);
  assert.throws(() => inspectPng(pngHeader(MAX_PNG_DIMENSION + 1, 1)), /limited/);
  assert.throws(() => assertPixelBudget(MAX_PNG_PIXELS, 2), /limited/);
  assert.throws(() => assertPixelBudget(0, 100), /invalid/);
});

test("PNG byte limits are enforced before accepting a header", () => {
  assert.throws(() => assertPngWithinLimits(pngHeader(1, 1, MAX_PNG_BYTES + 1)), /22.5 MB/);
});
