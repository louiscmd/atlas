import "server-only";
import { db } from "../db";
import { addDays, localDate, weekStart as weekStartOf } from "@/lib/dates";
import { estimate1RM } from "@/lib/engines/performance";
import { smoothTrend } from "@/lib/engines/performance";
import { sumNutrients } from "@/lib/engines/nutrition";
import { getTarget } from "./nutrition";
import { getActivePlan } from "./plans";

export type WeeklyMetrics = {
  weekStart: string; weekEnd: string; isComplete: boolean;
  workoutsCompleted: number; workoutsPlanned: number; missedSessions: string[];
  totalSets: number; setsBelowTargetRir: number; setsWithRir: number;
  nutritionDaysLogged: number; avgCalories: number | null; avgProtein: number | null; calorieTarget: number | null; proteinTarget: number | null; proteinDaysHit: number;
  avgWaterMl: number | null;
  weightStart: number | null; weightEnd: number | null; weightChange: number | null; weighIns: number;
  prs: { exercise: string; type: string; value: number }[];
  strengthUp: { exercise: string; from: number; to: number }[];
  strengthDown: { exercise: string; from: number; to: number }[];
};

export async function computeWeeklyMetrics(userId: string, tz: string, weekStart: string): Promise<WeeklyMetrics> {
  const weekEnd = addDays(weekStart, 6);
  const today = localDate(tz);
  const startDt = new Date(`${weekStart}T00:00:00Z`), endDt = new Date(`${addDays(weekEnd, 1)}T00:00:00Z`);
  // ±14h widening covers any time zone; then filter by local date
  const inWeek = (d: Date) => { const ld = localDate(tz, d); return ld >= weekStart && ld <= weekEnd; };
  const widen = { gte: new Date(+startDt - 14 * 3600_000), lt: new Date(+endDt + 14 * 3600_000) };

  const [sessions, plan, logs, water, weights, prs, target] = await Promise.all([
    db.workoutSession.findMany({ where: { userId, status: "completed", completedAt: widen }, include: { sets: true, exercises: true, day: { select: { weekday: true, name: true } } } }),
    getActivePlan(userId),
    db.nutritionLog.findMany({ where: { userId, date: { gte: weekStart, lte: weekEnd } } }),
    db.waterLog.findMany({ where: { userId, date: { gte: weekStart, lte: weekEnd } } }),
    db.progressMeasurement.findMany({ where: { userId, type: "weight", measuredAt: { lt: endDt } }, orderBy: { measuredAt: "asc" } }),
    db.personalRecord.findMany({ where: { userId, achievedAt: widen }, include: { exercise: { select: { name: true } } } }),
    getTarget(userId),
  ]);
  const weekSessions = sessions.filter((s) => inWeek(s.completedAt!));
  const sets = weekSessions.flatMap((s) => s.sets.map((set) => ({ ...set, target: s.exercises.find((e) => e.id === set.sessionExerciseId)?.rirTarget ?? null })));
  const withRir = sets.filter((s) => s.rir != null && s.target != null);

  // A planned day counts as missed only if it's already past AND the plan existed by then.
  const planned = plan?.days.filter((d) => d.weekday != null) ?? [];
  const planStart = plan ? localDate(tz, plan.createdAt) : today;
  const doneDayIds = new Set(weekSessions.map((s) => s.dayId));
  const missed = planned.filter((d) => {
    const date = addDays(weekStart, d.weekday!);
    return date < today && date >= planStart && !doneDayIds.has(d.id);
  }).map((d) => d.name);

  const days = [...new Set(logs.map((l) => l.date))];
  const perDay = days.map((d) => sumNutrients(logs.filter((l) => l.date === d)));
  const avg = (k: "calories" | "protein") => (perDay.length ? Math.round(perDay.reduce((s, d) => s + d[k], 0) / perDay.length) : null);
  const waterDays = [...new Set(water.map((w) => w.date))];

  const trend = smoothTrend(weights.map((w) => ({ date: w.measuredAt, value: w.value })));
  const before = trend.filter((t) => +t.date < +startDt).at(-1);
  const during = trend.filter((t) => inWeek(t.date));
  const weightStart = before?.trend ?? during[0]?.trend ?? null;
  const weightEnd = during.at(-1)?.trend ?? null;

  // Strength trend: best e1RM this week vs best in the previous 4 weeks
  const exIds = [...new Set(sets.map((s) => s.exerciseId))];
  const prior = exIds.length ? await db.workoutSet.findMany({ where: { userId, exerciseId: { in: exIds }, session: { status: "completed" }, completedAt: { gte: new Date(+startDt - 28 * 86400_000), lt: startDt } }, select: { exerciseId: true, weightKg: true, reps: true } }) : [];
  const names = new Map(weekSessions.flatMap((s) => s.exercises.map((e) => [e.exerciseId, e.exerciseName] as const)));
  const up: WeeklyMetrics["strengthUp"] = [], down: WeeklyMetrics["strengthDown"] = [];
  for (const id of exIds) {
    const cur = Math.max(...sets.filter((s) => s.exerciseId === id && s.weightKg > 0).map((s) => estimate1RM(s.weightKg, s.reps)), 0);
    const prev = Math.max(...prior.filter((s) => s.exerciseId === id && s.weightKg > 0).map((s) => estimate1RM(s.weightKg, s.reps)), 0);
    if (!cur || !prev) continue;
    if (cur > prev * 1.01) up.push({ exercise: names.get(id) ?? "", from: prev, to: cur });
    if (cur < prev * 0.95) down.push({ exercise: names.get(id) ?? "", from: prev, to: cur });
  }

  return {
    weekStart, weekEnd, isComplete: today > weekEnd,
    workoutsCompleted: weekSessions.length, workoutsPlanned: plan ? plan.daysPerWeek : 0, missedSessions: missed,
    totalSets: sets.length, setsBelowTargetRir: withRir.filter((s) => s.rir! < s.target!).length, setsWithRir: withRir.length,
    nutritionDaysLogged: days.length, avgCalories: avg("calories"), avgProtein: avg("protein"), calorieTarget: target?.calories ?? null, proteinTarget: target?.proteinG ?? null,
    proteinDaysHit: target ? perDay.filter((d) => d.protein >= target.proteinG * 0.9).length : 0,
    avgWaterMl: waterDays.length ? Math.round(water.reduce((s, w) => s + w.amountMl, 0) / waterDays.length) : null,
    weightStart, weightEnd, weightChange: weightStart != null && weightEnd != null ? Math.round((weightEnd - weightStart) * 10) / 10 : null, weighIns: during.length,
    prs: prs.filter((p) => inWeek(p.achievedAt)).map((p) => ({ exercise: p.exercise.name, type: p.type, value: p.value })),
    strengthUp: up, strengthDown: down,
  };
}

export const currentWeekStart = (tz: string) => weekStartOf(localDate(tz));

export async function listReports(userId: string) {
  return db.weeklyReport.findMany({ where: { userId }, orderBy: { weekStart: "desc" }, take: 26 });
}
export async function getReport(userId: string, weekStart: string) {
  return db.weeklyReport.findUnique({ where: { userId_weekStart: { userId, weekStart } } });
}
