import assert from "node:assert/strict";
import test from "node:test";
import { parseGatewayBaseUrl } from "../mcp/services/gatewayUrl.js";
import { filenameFor } from "../src/lib/export.js";
import { arrowKeyDelta, edgeControlPoint, projectClientPoint } from "../src/lib/flowGeometry.js";

test("filenames are stable, confined slugs", () => {
  assert.equal(filenameFor("  Release / Plan  ", "svg"), "release-plan.svg");
  assert.equal(filenameFor("../../", "png"), "diagram.png");
  assert.equal(filenameFor("Café & API", "mmd"), "caf-api.mmd");
});

test("flow geometry maps points, centers straight edges, and scales keyboard motion", () => {
  assert.deepEqual(projectClientPoint(150, 100, { left: 50, top: 50, width: 200, height: 100 }, { x: 10, y: 20, width: 400, height: 200 }), { x: 210, y: 120 });
  assert.deepEqual(edgeControlPoint({ x: 10, y: 20 }, { x: 30, y: 60 }, { x: 0, y: 0 }), { x: 20, y: 40 });
  assert.deepEqual(edgeControlPoint({ x: 10, y: 20 }, { x: 30, y: 60 }, { x: 14, y: 15 }), { x: 14, y: 15 });
  assert.deepEqual(arrowKeyDelta("ArrowLeft", false), { x: -2, y: 0 });
  assert.deepEqual(arrowKeyDelta("ArrowDown", true), { x: 0, y: 10 });
  assert.equal(arrowKeyDelta("Enter", false), undefined);
});

test("gateway URLs accept only plain HTTP loopback origins", () => {
  assert.equal(parseGatewayBaseUrl("http://127.0.0.1:8787").origin, "http://127.0.0.1:8787");
  assert.equal(parseGatewayBaseUrl("http://localhost").origin, "http://localhost");
  assert.equal(parseGatewayBaseUrl("http://[::1]:8787").origin, "http://[::1]:8787");
  for (const value of ["https://127.0.0.1", "http://example.com", "http://localhost/api", "http://user@localhost", "http://localhost?debug=1", "not a url"]) {
    assert.throws(() => parseGatewayBaseUrl(value), /HTTP loopback origin/);
  }
});
