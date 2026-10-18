// Local development Postgres (no Docker needed). Data lives in ./.pgdata.
// Usage: npm run db:local   (keep it running; DATABASE_URL points at port 5433)
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";

const port = Number(process.env.PG_PORT ?? 5433);
const dir = process.env.PG_DIR ?? "./.pgdata";
const pg = new EmbeddedPostgres({ databaseDir: dir, user: "forma", password: "forma", port, persistent: true, onLog: () => {} });

if (!existsSync(dir)) await pg.initialise();
await pg.start();
for (const db of (process.env.PG_DATABASES ?? "forma").split(",")) {
  try { await pg.createDatabase(db); } catch { /* exists */ }
}
console.log(`Postgres ready on postgresql://forma:forma@localhost:${port}/forma`);
const stop = async () => { await pg.stop(); process.exit(0); };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
