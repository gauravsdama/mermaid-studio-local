import assert from "node:assert/strict";
import test from "node:test";
import { RenderQueue } from "../server/renderQueue.js";

test("render queue bounds admission and hands released slots to waiters", async () => {
  const queue = new RenderQueue(1, 1);
  const releaseFirst = await queue.acquire();
  const waiting = queue.acquire();
  await assert.rejects(queue.acquire(), /already rendering/);
  assert.deepEqual(queue.status(), { active: 1, waiting: 1 });
  releaseFirst();
  const releaseSecond = await waiting;
  assert.deepEqual(queue.status(), { active: 1, waiting: 0 });
  releaseSecond();
  assert.deepEqual(queue.status(), { active: 0, waiting: 0 });
});

test("aborted waiters leave the queue and capacity is reusable", async () => {
  const queue = new RenderQueue(1, 1);
  const release = await queue.acquire();
  const controller = new AbortController();
  const waiting = queue.acquire(controller.signal);
  controller.abort(new Error("cancelled fixture"));
  await assert.rejects(waiting, /cancelled fixture/);
  assert.deepEqual(queue.status(), { active: 1, waiting: 0 });
  release();
  const releaseAgain = await queue.acquire();
  releaseAgain();
  assert.deepEqual(queue.status(), { active: 0, waiting: 0 });
});
