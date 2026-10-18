import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { join } from "node:path";

// Fresh, throwaway SQLite file for each run (never the dev database).
export default function setup() {
  for (const f of ["test.db", "test.db-journal"]) rmSync(join(__dirname, "..", "prisma", f), { force: true });
  const env = { ...process.env, DATABASE_URL: "file:./test.db" };
  execSync("npx prisma db push --skip-generate", { env, stdio: "ignore" });
  execSync("npx tsx prisma/seed.ts", { env, stdio: "ignore" });
}
