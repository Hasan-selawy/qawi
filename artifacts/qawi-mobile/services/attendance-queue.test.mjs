import { test } from "node:test";
import assert from "node:assert/strict";
import { createAttendanceQueue } from "./attendance-queue.ts";

function fixture() {
  const data = new Map();
  let time = Date.parse("2026-11-24T12:00:00Z");
  let sequence = 0;
  const storage = { async getItem(key) { return data.get(key) ?? null; }, async setItem(key, value) { data.set(key, value); } };
  return { data, storage, advance: (ms) => { time += ms; },
    queue: createAttendanceQueue(storage, () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`, () => time) };
}

test("duplicate saved events keep one stable ID and original timestamp", async () => {
  const { queue, advance } = fixture();
  const first = await queue.enqueue("a", "CHECKIN");
  advance(30000);
  assert.deepEqual(await queue.enqueue("a", "CHECKIN", first.occurredAt), first);
  assert.equal((await queue.list("a")).length, 1);
});

test("reconnects share one flush and preserve timestamps", async () => {
  const { queue } = fixture();
  const saved = await queue.enqueue("a", "CHECKIN");
  let calls = 0;
  const send = async (item) => { calls++; assert.equal(item.occurredAt, saved.occurredAt); };
  await Promise.all([queue.flush("a", send, async () => true), queue.flush("a", send, async () => true)]);
  assert.equal(calls, 1);
  assert.equal((await queue.list("a")).length, 0);
});

test("network failure retries the same key after backoff, before checkout", async () => {
  const { queue, advance } = fixture();
  const first = await queue.enqueue("a", "CHECKIN");
  advance(10000);
  await queue.enqueue("a", "CHECKOUT");
  const tried = [];
  await queue.flush("a", async (item) => { tried.push(item.idempotencyKey); throw new TypeError("offline"); }, async () => true);
  assert.deepEqual(tried, [first.idempotencyKey]);
  const pending = await queue.list("a");
  assert.equal(pending.length, 2);
  advance(10000);
  await queue.flush("a", async (item) => { tried.push(item.idempotencyKey); }, async () => true);
  assert.equal(tried[1], first.idempotencyKey);
  assert.equal((await queue.list("a")).length, 0);
});

test("permanent failures become reviewable and are not retried forever", async () => {
  const { queue } = fixture();
  await queue.enqueue("a", "CHECKIN");
  const send = async () => { throw { status: 403 }; };
  const result = await queue.flush("a", send, async () => true);
  assert.equal(result.newlyRejected, 1);
  assert.equal(result.pending, 0);
  assert.equal((await queue.list("a"))[0].status, "rejected");
  await queue.flush("a", async () => assert.fail("must not retry"), async () => true);
  await queue.discardRejected("a");
  assert.equal((await queue.list("a")).length, 0);
});

test("401 pauses until login and 429 remains retryable", async () => {
  const { queue } = fixture();
  await queue.enqueue("a", "CHECKIN");
  await queue.flush("a", async () => { throw { status: 401 }; }, async () => true);
  assert.equal((await queue.list("a"))[0].status, "pending");
  await queue.flush("a", async () => { throw { status: 429 }; }, async () => true);
  assert.equal((await queue.list("a"))[0].status, "pending");
});

test("account switch never sends another member's queue", async () => {
  const { queue } = fixture();
  await queue.enqueue("a", "CHECKIN");
  await queue.flush("a", async () => assert.fail("wrong account"), async () => false);
  assert.equal((await queue.list("a")).length, 1);
  assert.equal((await queue.list("b")).length, 0);
});

test("enqueue during sync cannot be overwritten by an acknowledgement", async () => {
  const { queue, advance } = fixture();
  await queue.enqueue("a", "CHECKIN");
  let finish;
  const flushed = queue.flush("a", () => new Promise((resolve) => { finish = resolve; }), async () => true);
  await new Promise((resolve) => setImmediate(resolve));
  advance(10000);
  const queued = queue.enqueue("a", "CHECKOUT");
  finish();
  await Promise.all([flushed, queued]);
  assert.equal((await queue.list("a"))[0].operation, "CHECKOUT");
});

test("unreadable saved data is preserved rather than overwritten", async () => {
  const { queue, data } = fixture();
  data.set("qawi.attendance.v2:a", "broken");
  await assert.rejects(queue.enqueue("a", "CHECKIN"));
  assert.equal(data.get("qawi.attendance.v2:a"), "broken");
});
