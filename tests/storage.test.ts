import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { deleteFromLibrary, getHistory, getLibrary, rememberDiagram, saveToLibrary } from "../src/lib/storage.js";

const HISTORY_KEY = "mermaid-studio:history";
const LIBRARY_KEY = "mermaid-studio:library";

class MemoryStorage {
  private readonly values = new Map<string, string>();
  failWrites = false;

  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void {
    if (this.failWrites) throw new DOMException("Quota exceeded", "QuotaExceededError");
    this.values.set(key, value);
  }
  removeItem(key: string): void { this.values.delete(key); }
  clear(): void { this.values.clear(); }
}

const storage = new MemoryStorage();
Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });

function saved(index: number) {
  return {
    id: `diagram-${index}`,
    title: `Diagram ${index}`,
    source: `flowchart LR\nA${index}-->B${index}`,
    theme: "default",
    updatedAt: "2026-09-27T12:00:00.000Z"
  };
}

beforeEach(() => {
  storage.failWrites = false;
  storage.clear();
});

test("legacy arrays migrate, malformed entries are dropped, and limits are enforced", () => {
  const legacy = [...Array.from({ length: 27 }, (_, index) => saved(index)), { ...saved(28), source: 42 }];
  storage.setItem(LIBRARY_KEY, JSON.stringify(legacy));
  const library = getLibrary();
  assert.equal(library.length, 25);
  const migrated = JSON.parse(storage.getItem(LIBRARY_KEY) ?? "null");
  assert.equal(migrated.version, 1);
  assert.equal(migrated.items.length, 25);
});

test("corrupt and unknown-version collections fail closed", () => {
  storage.setItem(HISTORY_KEY, "not-json");
  assert.deepEqual(getHistory(), []);
  storage.setItem(HISTORY_KEY, JSON.stringify({ version: 99, items: [saved(1)] }));
  assert.deepEqual(getHistory(), []);
});

test("history deduplicates source and library updates by title", () => {
  rememberDiagram("First", "flowchart LR\nA-->B", "default");
  const history = rememberDiagram("Renamed", "flowchart LR\nA-->B", "dark");
  assert.equal(history.length, 1);
  assert.equal(history[0].title, "Renamed");

  saveToLibrary("One", "flowchart LR\nA-->B", "default");
  const library = saveToLibrary("One", "flowchart LR\nA-->C", "forest");
  assert.equal(library.length, 1);
  assert.equal(library[0].source, "flowchart LR\nA-->C");
  assert.deepEqual(deleteFromLibrary(library[0].id), []);
});

test("quota failures are explicit exceptions instead of false success", () => {
  storage.failWrites = true;
  assert.throws(() => saveToLibrary("Full", "flowchart LR\nA-->B", "default"), { name: "QuotaExceededError" });
  assert.throws(() => rememberDiagram("Full", "flowchart LR\nA-->B", "default"), { name: "QuotaExceededError" });
});
