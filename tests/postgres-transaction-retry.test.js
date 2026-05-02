import assert from "node:assert/strict";

process.env.DATABASE_URL = "postgres://hairforce.test/hairforce";

const { withPostgresTransaction } = await import("../lib/postgres.js");

const callLog = [];

function createQueryLogger(prefix, handler) {
  return async (text, params = []) => {
    callLog.push(`${prefix}:${String(text).trim()}`);
    return handler(text, params);
  };
}

const txClientOne = {
  query: createQueryLogger("tx1", async (text) => {
    if (text === "BEGIN" || text === "ROLLBACK") {
      return { rows: [], rowCount: 0 };
    }

    if (text === "SELECT broken_column") {
      const error = new Error('column "sms_opt_in" does not exist');
      error.code = "42703";
      throw error;
    }

    throw new Error(`Unexpected first-transaction query: ${text}`);
  }),
  release() {
    callLog.push("tx1:release");
  }
};

const initClient = {
  query: createQueryLogger("init", async () => ({ rows: [], rowCount: 0 })),
  release() {
    callLog.push("init:release");
  }
};

const txClientTwo = {
  query: createQueryLogger("tx2", async (text) => {
    if (text === "BEGIN" || text === "COMMIT") {
      return { rows: [], rowCount: 0 };
    }

    if (text === "SELECT broken_column") {
      return { rows: [{ ok: true }], rowCount: 1 };
    }

    throw new Error(`Unexpected retry-transaction query: ${text}`);
  }),
  release() {
    callLog.push("tx2:release");
  }
};

const queuedClients = [txClientOne, initClient, txClientTwo];

globalThis.hairforcePostgresCache.pool = {
  async connect() {
    const nextClient = queuedClients.shift();
    assert.ok(nextClient, "expected another fake postgres client");
    return nextClient;
  }
};
globalThis.hairforcePostgresCache.initPromise = Promise.resolve(
  globalThis.hairforcePostgresCache.pool
);

const result = await withPostgresTransaction(async (db) => {
  const response = await db.query("SELECT broken_column");
  return response.rows[0];
});

assert.deepEqual(result, { ok: true });
assert.equal(queuedClients.length, 0);
assert.equal(callLog.includes("tx1:ROLLBACK"), true);
assert.equal(callLog.includes("tx2:COMMIT"), true);
assert.equal(callLog.some((entry) => entry.startsWith("init:BEGIN")), true);

console.log("postgres transaction schema retry checks passed");
