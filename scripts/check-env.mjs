// Fails the deploy early with a readable message if required settings are missing.
const required = {
  DATABASE_URL: "Supabase Transaction pooler string (port 6543, ending in ?pgbouncer=true&connection_limit=1)",
  DIRECT_URL: "Supabase Session pooler string (port 5432, nothing after /postgres)",
  APP_SECRET: "a long random string, e.g. the output of `openssl rand -hex 32`",
};
const missing = Object.entries(required).filter(([k]) => !process.env[k]);
if (missing.length) {
  console.error("\n✖ Missing environment variables. Add them in Vercel → Settings → Environment Variables, then redeploy:\n");
  for (const [k, hint] of missing) console.error(`  • ${k}: ${hint}`);
  console.error("");
  process.exit(1);
}
const db = process.env.DATABASE_URL;
if (db.includes(":6543") && !db.includes("pgbouncer=true")) console.warn("⚠ DATABASE_URL uses the transaction pooler but is missing ?pgbouncer=true — add it to avoid 'prepared statement' errors.");
if (process.env.DIRECT_URL.includes(":6543")) console.warn("⚠ DIRECT_URL points at the transaction pooler (6543); migrations need the session pooler (5432).");
console.log("✓ Environment variables present");
