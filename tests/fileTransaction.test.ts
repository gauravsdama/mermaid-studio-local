import assert from "node:assert/strict";
import test from "node:test";
import { commitFiles, type FileTransactionOperations, type TransactionFile } from "../server/fileTransaction.js";

const files: TransactionFile[] = [
  { temporaryPath: "/store/a.tmp", finalPath: "/store/a.png", data: Buffer.from("png") },
  { temporaryPath: "/store/b.tmp", finalPath: "/store/b.mmd", data: "source" },
  { temporaryPath: "/store/c.tmp", finalPath: "/store/c.json", data: "metadata" }
];

test("file transaction stages all data and promotes metadata last", async () => {
  const actions: string[] = [];
  const operations: FileTransactionOperations = {
    async write(path) { actions.push(`write:${path}`); },
    async promote(temporaryPath, finalPath) { actions.push(`promote:${temporaryPath}:${finalPath}`); },
    async remove(path) { actions.push(`remove:${path}`); }
  };
  await commitFiles(files, operations);
  assert.equal(actions.filter((action) => action.startsWith("write:")).length, 3);
  assert.deepEqual(actions.filter((action) => action.startsWith("promote:")), [
    "promote:/store/a.tmp:/store/a.png",
    "promote:/store/b.tmp:/store/b.mmd",
    "promote:/store/c.tmp:/store/c.json"
  ]);
  assert.equal(actions.some((action) => action.startsWith("remove:")), false);
});

test("file transaction removes staged and already-promoted files after failure", async () => {
  const removed: string[] = [];
  let promotions = 0;
  const operations: FileTransactionOperations = {
    async write() {},
    async promote() {
      promotions += 1;
      if (promotions === 2) throw new Error("forced promotion failure");
    },
    async remove(path) { removed.push(path); }
  };
  await assert.rejects(commitFiles(files, operations), /forced promotion failure/);
  assert.deepEqual(new Set(removed), new Set(["/store/a.tmp", "/store/b.tmp", "/store/c.tmp", "/store/a.png"]));
});
