export type AttendanceOperation = {
  idempotencyKey: string;
  operation: "CHECKIN" | "CHECKOUT";
  occurredAt: string;
};
export type QueuedAttendance = AttendanceOperation & {
  status: "pending" | "rejected";
  attempts: number;
  nextAttemptAt: number;
  error?: string;
};
export interface QueueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

/** A single serialized writer prevents reconnect, enqueue, and acknowledgement from losing records. */
export function createAttendanceQueue(storage: QueueStorage, makeId: () => string, now = Date.now) {
  let tail: Promise<unknown> = Promise.resolve();
  const flushing = new Map<string, Promise<{ pending: number; rejected: number; synced: number; newlyRejected: number }>>();
  const key = (userId: string) => {
    if (!userId) throw new Error("Attendance requires a signed-in account");
    return `qawi.attendance.v2:${userId}`;
  };
  const serial = <T>(work: () => Promise<T>): Promise<T> => {
    const next = tail.then(work, work);
    tail = next.catch(() => {});
    return next;
  };
  const read = async (userId: string): Promise<QueuedAttendance[]> => {
    const raw = await storage.getItem(key(userId));
    if (!raw) return [];
    const records: unknown = JSON.parse(raw);
    if (!Array.isArray(records) || records.some((item) => !item || typeof item.idempotencyKey !== "string"
      || !["CHECKIN", "CHECKOUT"].includes(item.operation) || !Number.isFinite(Date.parse(item.occurredAt))
      || !["pending", "rejected"].includes(item.status) || !Number.isFinite(item.attempts) || !Number.isFinite(item.nextAttemptAt))) {
      throw new Error("Saved attendance is unreadable. It was preserved; contact support.");
    }
    return records as QueuedAttendance[];
  };
  const write = (userId: string, records: QueuedAttendance[]) => storage.setItem(key(userId), JSON.stringify(records));
  return {
    list: (userId: string) => serial(() => read(userId)),
    enqueue: (userId: string, operation: AttendanceOperation["operation"], occurredAt = new Date(now()).toISOString()) => serial(async () => {
      const records = await read(userId);
      // Exact duplicate events keep the original ID. Distinct timestamps are never silently collapsed.
      const existing = records.find((item) => item.status === "pending" && item.operation === operation
        && item.occurredAt === occurredAt);
      if (existing) return existing;
      if (records.length >= 250) throw new Error("Attendance queue is full. Sync or review saved records first.");
      const item: QueuedAttendance = { idempotencyKey: makeId(), operation, occurredAt,
        status: "pending", attempts: 0, nextAttemptAt: 0 };
      await write(userId, [...records, item]);
      return item;
    }),
    discardRejected: (userId: string) => serial(async () => {
      const records = await read(userId);
      await write(userId, records.filter((item) => item.status !== "rejected"));
    }),
    flush(userId: string, send: (item: AttendanceOperation) => Promise<unknown>, isCurrentUser: () => Promise<boolean>) {
      const active = flushing.get(userId);
      if (active) return active;
      const work = serial(async () => {
        let records = await read(userId);
        let synced = 0;
        let newlyRejected = 0;
        const ordered = records.filter((item) => item.status === "pending")
          .sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt));
        for (const item of ordered) {
          if (item.nextAttemptAt > now() || !await isCurrentUser()) break;
          try {
            await send({ idempotencyKey: item.idempotencyKey, operation: item.operation, occurredAt: item.occurredAt });
            records = records.filter((record) => record.idempotencyKey !== item.idempotencyKey);
            await write(userId, records);
            synced++;
          } catch (error) {
            const status = (error as { status?: number }).status;
            if (status === 401) break; // Wait for authentication; never discard a valid queued operation.
            item.attempts++;
            if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
              item.status = "rejected";
              item.error = `HTTP ${status}`;
              newlyRejected++;
            } else {
              item.nextAttemptAt = now() + Math.min(3600000, 1000 * 2 ** Math.min(item.attempts, 12));
            }
            await write(userId, records);
            if (item.status === "pending") break; // Preserve check-in/checkout order during transient failures.
          }
        }
        return { pending: records.filter((item) => item.status === "pending").length,
          rejected: records.filter((item) => item.status === "rejected").length, synced, newlyRejected };
      }).finally(() => flushing.delete(userId));
      flushing.set(userId, work);
      return work;
    },
  };
}
