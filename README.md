# Forma — fitness & wellness app

Import your training → set goals → get a personalized plan → train in the app → track progression → log nutrition (incl. AI food scanning) → weekly AI review → adapt.

## Quick start

```bash
npm install
PG_DATABASES=forma,forma_test npm run db:local   # local Postgres on :5433 (no Docker), keep running
npm run db:migrate   # apply prisma/migrations
npm run db:seed      # 141 exercises, 20 programs, 125 foods
npm run dev          # http://localhost:3000
npm test             # 55 unit + integration tests (wipes and reuses the forma_test database)
```

## Deploying to Vercel

1. Create a Postgres database (Neon, Vercel Postgres or Supabase) and copy its connection string.
2. In Vercel → Settings → Environment Variables add `DATABASE_URL` (pooled runtime URL — on Supabase the transaction pooler, port 6543, with `?pgbouncer=true&connection_limit=1`), `DIRECT_URL` (used for migrations — on Supabase the session pooler, port 5432), `APP_SECRET` (a long random string: `openssl rand -hex 32`) and optionally `ANTHROPIC_API_KEY`.
3. Redeploy. The `vercel-build` script runs `prisma migrate deploy`, seeds the exercise/program/food library on the first deploy only, then `next build`.

Progress photos are stored privately in Postgres (`StoredFile`), so no extra storage service is needed. Uploads are downscaled in the browser to stay under Vercel's 4.5 MB request limit.

Copy `.env.example` to `.env`. Everything works without external services; optional keys unlock more:

| Variable | Effect |
| --- | --- |
| `ANTHROPIC_API_KEY` | Enables AI routine import, AI plan generation, food photo & label scanning, the AI nutrition assistant and the AI weekly coach (model: `claude-opus-5-5`, override with `AI_MODEL`). |
| `FOOD_VISION_DEV_SAMPLE=1` | **Development only, no AI key.** The scanner returns a fixed sample that is labelled "development sample — not an analysis of your photo", so the correction/logging flow can be exercised. Ignored in production. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Enables "Continue with Google" (OAuth code flow, callback `/api/auth/google/callback`). |
| `APP_SECRET` | Keyed hashing for session/reset tokens and analytics ids. **Required in production.** |

## Stack

Next.js 15 (App Router, Server Components + Server Actions) · TypeScript · Tailwind CSS v4 · Prisma 6 + PostgreSQL · Zod v4 · Anthropic TypeScript SDK · Vitest.

## Architecture

```
prisma/schema.prisma          40+ normalized tables (users, plans, sessions, sets, PRs, foods, scans, reports, AI logs…)
prisma/seed/                  exercise library, program templates, food database, curated videos.json
src/lib/domain/               enums (single source of truth) + Zod schemas for every AI/API boundary
src/lib/engines/              pure, tested logic: nutrition math, progression, PR detection,
                              replacement ranking, rules-based plan generator, workout text parser
src/lib/server/               db, auth/sessions, rate limiting, storage, analytics, action error wrapper
src/lib/server/services/      data access — every function takes userId and scopes every query by it
src/lib/ai/                   versioned prompts + runStructured() + 4 separate services:
                              workoutPlanner · foodVision · nutritionAssistant · coach
src/components/ui/            design system (buttons, cards, sheets, steppers, rings, charts, states…)
src/app/                      routes: (auth), onboarding, (app)/{home,workout,nutrition,progress,profile}
```

**AI safety & cost.** All model output is parsed with a Zod schema, then checked against hard domain rules (e.g. plans may only use exercises that exist, fit the user's equipment and aren't excluded; per-muscle weekly volume caps). Invalid output is retried once with the validation errors, then fails safely to a deterministic engine (routine parser, plan generator, curated meal ideas, rules coach) — or, for the food scanner, to an honest "add manually" error. Structured imports that the parser fully understands skip the AI call entirely. Only request metadata is logged (`AIRequest`), never prompts, images or personal data. Server-side refusal fallbacks are enabled (`fallbacks: "default"`).

**Security.** httpOnly session cookies (keyed-hash tokens in DB), bcrypt passwords, single-use expiring verification/reset tokens, rate limits on auth/AI/uploads, server-side ownership checks on every query (see `tests/integration.test.ts` → data isolation), magic-byte image validation, private photo storage in the database, served only to the owner with `no-store`, CSP and security headers, no account enumeration on password reset. Server actions never accept a `userId` from the client.

**Offline.** The workout player writes completed sets to a device queue first (idempotent `clientId` per set) and syncs when the connection returns, so a dropped connection never loses a set.

## Admin-ready data

Exercises, alternatives, videos, programs and foods are all database rows seeded from `prisma/seed/*`. To curate demonstration videos, add verified entries to `prisma/seed/videos.json` (`{ "barbell-bench-press": { "youtubeId": "…", "title": "…", "channel": "…" } }`) and re-run `npm run db:seed`. Until an exercise has a curated video, "Watch Demonstration" opens a YouTube search instead of embedding an unverified video.

## Jobs

`npm run jobs:daily` creates "Your workout is ready" notifications for users with a workout today. Schedule it with cron.

## Known gaps / next steps

- Apple sign-in needs an Apple Developer key (signed client-secret JWT) — the button is shown disabled.
- Email delivery: `src/lib/server/mailer.ts` logs links to the console in development; plug in a provider for production.
- Push notifications: notifications are in-app; delivery channels plug into `services/notifications.ts`.
- Rate limiting and the exercise-library cache are in-memory (single instance); swap for Redis when scaling out.
- Payments/subscriptions are modelled (`Subscription`) but billing isn't wired.
- Global search across exercises/foods/programs exists per section; a unified search is not built yet.
- No service worker: the workout queue survives connection drops while the page is open, not a full offline reload.
