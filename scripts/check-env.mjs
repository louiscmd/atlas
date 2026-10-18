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
// Catch common copy/paste mistakes without ever printing the password.
const problems = [];
for (const key of ["DATABASE_URL", "DIRECT_URL"]) {
  const raw = process.env[key];
  if (raw !== raw.trim() || /^["']|["']$/.test(raw)) problems.push(`${key} has surrounding spaces or quotes — paste the bare value.`);
  if (/\[|\]/.test(raw)) problems.push(`${key} still contains [ ] — replace [YOUR-PASSWORD] including the brackets.`);
  let u;
  try { u = new URL(raw.trim()); } catch { problems.push(`${key} isn't a valid URL — re-copy it from Supabase → Connect.`); continue; }
  if (u.hostname.endsWith("pooler.supabase.com") && !/^postgres\.[a-z0-9]+$/.test(decodeURIComponent(u.username))) problems.push(`${key}: the pooler username must be postgres.<project-id> (e.g. postgres.abcdefghijkl), not "${decodeURIComponent(u.username)}".`);
  if (u.hostname.startsWith("db.") && u.hostname.endsWith(".supabase.co")) problems.push(`${key} uses the Direct connection host, which usually can't be reached from Vercel — use the pooler host (…pooler.supabase.com).`);
  if (!u.password) problems.push(`${key} has no password.`);
}
if (problems.length) {
  console.error("\n✖ Database settings need fixing (Vercel → Settings → Environment Variables):\n");
  for (const m of problems) console.error(`  • ${m}`);
  console.error("");
  process.exit(1);
}
console.log("✓ Environment variables present");
