import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(process.cwd(), "db", "migrations");
const MIGRATIONS_TABLE = "schema_migrations";

function listMigrationFiles() {
  let entries;
  try {
    entries = readdirSync(MIGRATIONS_DIR);
  } catch {
    return [];
  }
  return entries.filter((f) => f.endsWith(".sql")).sort();
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(client) {
  const result = await client.query(`SELECT filename FROM ${MIGRATIONS_TABLE}`);
  return new Set(result.rows.map((row) => row.filename));
}

/**
 * Apply any unapplied migration files in db/migrations/, in lexicographic order.
 * Each migration runs in its own transaction so a failing migration rolls back
 * cleanly. Already-applied migrations (tracked in schema_migrations) are skipped.
 *
 * Migration files must be idempotent in case of partial failure recovery —
 * use CREATE TABLE IF NOT EXISTS, ALTER ... IF NOT EXISTS, and DO-block-wrapped
 * ADD CONSTRAINT (see 0002_audit_log_and_constraints.sql for the pattern).
 */
export async function runMigrations(client) {
  await ensureMigrationsTable(client);
  const applied = await getAppliedMigrations(client);
  const files = listMigrationFiles();
  const pending = files.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    return { applied: [], skipped: files.length };
  }

  for (const filename of pending) {
    const sql = readFileSync(join(MIGRATIONS_DIR, filename), "utf8");
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(`INSERT INTO ${MIGRATIONS_TABLE} (filename) VALUES ($1)`, [filename]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw new Error(`Migration ${filename} failed: ${error.message}`);
    }
  }

  return { applied: pending, skipped: files.length - pending.length };
}
