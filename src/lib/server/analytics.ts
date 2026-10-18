import "server-only";
import { createHmac } from "node:crypto";
import { db } from "./db";
import { env } from "./env";

// Privacy-conscious product analytics: no emails, no raw ids, no health values.
export type EventName =
  | "account_created" | "onboarding_completed" | "workout_started" | "workout_completed" | "exercise_completed"
  | "food_scanned" | "food_logged" | "program_started" | "program_completed" | "pr_achieved" | "weekly_report_viewed"
  | "plan_generated" | "plan_imported";

const ALLOWED_PROPS = new Set(["source", "kind", "count", "category", "status", "aiUsed", "confidence"]);

export async function track(userId: string | null, name: EventName, props: Record<string, string | number | boolean> = {}) {
  try {
    if (userId) {
      const prefs = await db.userPreferences.findUnique({ where: { userId }, select: { analyticsOptIn: true } });
      if (prefs && !prefs.analyticsOptIn) return;
    }
    const clean = Object.fromEntries(Object.entries(props).filter(([k]) => ALLOWED_PROPS.has(k)));
    const actorHash = userId ? createHmac("sha256", env.secret).update("analytics:" + userId).digest("hex").slice(0, 24) : null;
    await db.analyticsEvent.create({ data: { name, actorHash, props: clean } });
  } catch {
    // analytics must never break a user flow
  }
}
