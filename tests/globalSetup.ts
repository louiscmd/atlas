import { execSync } from "node:child_process";

// Integration tests run against a dedicated Postgres database that is wiped on
// every run. Start one locally with: PG_DATABASES=forma,forma_test npm run db:local
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://forma:forma@localhost:5433/forma_test";

export default function setup() {
  if (!/_test\b/.test(TEST_DATABASE_URL)) throw new Error("Refusing to wipe a database whose name doesn't end in _test");
  const env = { ...process.env, DATABASE_URL: TEST_DATABASE_URL, DIRECT_URL: TEST_DATABASE_URL };
  try {
    execSync("npx prisma db execute --stdin --schema prisma/schema.prisma", { env, input: 'DROP SCHEMA IF EXISTS "public" CASCADE; CREATE SCHEMA "public";', stdio: ["pipe", "ignore", "pipe"] });
  } catch {
    throw new Error(`Can't reach the test database at ${TEST_DATABASE_URL}. Run: PG_DATABASES=forma,forma_test npm run db:local`);
  }
  execSync("npx prisma migrate deploy", { env, stdio: "ignore" });
  execSync("npx tsx prisma/seed.ts", { env, stdio: "ignore" });
}
