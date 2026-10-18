import "server-only";
import { db } from "@/lib/server/db";
import { CoachSummarySchema, type CoachSummary } from "@/lib/domain/schemas";
import { computeWeeklyMetrics, type WeeklyMetrics } from "@/lib/server/services/reports";
import { notify } from "@/lib/server/services/notifications";
import { runStructured, textBlock } from "../client";
import { PROMPTS } from "../prompts";
import { labelOf, GOALS } from "@/lib/domain/enums";

/** Deterministic coach used when AI is unavailable. Only states facts from metrics. */
export function rulesCoach(m: WeeklyMetrics): CoachSummary {
  const well: string[] = [], improve: string[] = [], next: string[] = [];
  const insufficient = m.workoutsCompleted < 1 && m.nutritionDaysLogged < 2;
  if (m.workoutsPlanned && m.workoutsCompleted >= m.workoutsPlanned) well.push(`Completed ${m.workoutsCompleted}/${m.workoutsPlanned} planned workouts.`);
  else if (m.workoutsCompleted) well.push(`Completed ${m.workoutsCompleted} workout${m.workoutsCompleted > 1 ? "s" : ""}.`);
  if (m.prs.length) well.push(`${m.prs.length} new personal record${m.prs.length > 1 ? "s" : ""} (${[...new Set(m.prs.map((p) => p.exercise))].slice(0, 3).join(", ")}).`);
  for (const s of m.strengthUp.slice(0, 2)) well.push(`${s.exercise} estimated 1RM up from ${s.from} to ${s.to} kg.`);
  if (m.proteinTarget && m.nutritionDaysLogged && m.proteinDaysHit >= Math.max(3, m.nutritionDaysLogged - 1)) well.push(`Protein target reached on ${m.proteinDaysHit} of ${m.nutritionDaysLogged} logged days.`);

  if (m.missedSessions.length) improve.push(`Missed: ${m.missedSessions.join(", ")}. Consider moving sessions to days that fit your schedule.`);
  if (m.setsWithRir >= 4 && m.setsBelowTargetRir / m.setsWithRir > 0.4) improve.push(`${m.setsBelowTargetRir} of ${m.setsWithRir} sets were closer to failure than planned.`);
  if (m.proteinTarget && m.avgProtein != null && m.avgProtein < m.proteinTarget * 0.85) improve.push(`Average protein was ${m.avgProtein} g vs a ${m.proteinTarget} g target.`);
  if (m.nutritionDaysLogged > 0 && m.nutritionDaysLogged < 4) improve.push(`Nutrition was logged on ${m.nutritionDaysLogged} day(s) — a few more days gives a clearer picture.`);
  for (const s of m.strengthDown.slice(0, 1)) improve.push(`${s.exercise} performance dipped this week — recovery (sleep, food) may need attention.`);

  if (m.strengthDown.length) next.push(`Keep current loads on ${m.strengthDown[0].exercise} rather than pushing heavier.`);
  if (m.setsWithRir >= 4 && m.setsBelowTargetRir / m.setsWithRir > 0.4) next.push("Stop sets a rep or two earlier to match your RIR targets.");
  if (m.strengthUp.length) next.push(`Follow the in-app suggestions — small load increases on ${m.strengthUp[0].exercise} are earned.`);
  if (!next.length) next.push("Keep the current plan and volume; aim to beat last week's reps on your main lifts.");
  if (insufficient) return { headline: "Not enough data for a full review yet", wentWell: well, toImprove: [], nextWeek: ["Log your workouts and at least 3–4 days of meals next week for a meaningful review."], insufficientData: true };
  const headline = m.workoutsPlanned && m.workoutsCompleted >= m.workoutsPlanned ? "A consistent week — nice work" : m.workoutsCompleted ? "Solid progress this week" : "A lighter week";
  return { headline, wentWell: well.slice(0, 4), toImprove: improve.slice(0, 4), nextWeek: next.slice(0, 4), insufficientData: false };
}

export async function generateWeeklyReport(userId: string, tz: string, weekStart: string) {
  const metrics = await computeWeeklyMetrics(userId, tz, weekStart);
  const goals = await db.userGoals.findUnique({ where: { userId } });
  let coach = rulesCoach(metrics);
  let coachSource = "rules";
  if (!coach.insufficientData) {
    const res = await runStructured({
      service: "coach", prompt: PROMPTS.weeklyCoach, schema: CoachSummarySchema, userId, effort: "low", maxTokens: 4000,
      content: [textBlock(`User goal: ${labelOf(GOALS, goals?.primaryGoal)}.\nWeekly metrics (JSON, kg / kcal / g):\n${JSON.stringify(metrics)}`)],
    });
    if (res.ok) { coach = res.data; coachSource = "ai"; }
  }
  const report = await db.weeklyReport.upsert({
    where: { userId_weekStart: { userId, weekStart } },
    create: { userId, weekStart, metrics: metrics as never, coach, coachSource },
    update: { metrics: metrics as never, coach, coachSource, createdAt: new Date() },
  });
  if (metrics.isComplete) await notify(userId, "weekly_report", "Your weekly report is ready", coach.headline, `/progress/reports/${weekStart}`);
  return report;
}
