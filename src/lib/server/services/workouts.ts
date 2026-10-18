import "server-only";
import { db } from "../db";
import { localDate, weekdayOf } from "@/lib/dates";
import { recommendNext } from "@/lib/engines/progression";
import { bestsFromHistory, detectPRs, PR_LABEL } from "@/lib/engines/records";
import { totalVolume } from "@/lib/engines/performance";
import { assertExerciseAccess, getExercisePerformance } from "./exercises";
import { getActivePlan, NotFoundError } from "./plans";
import { notify } from "./notifications";
import { track } from "../analytics";

export async function getInProgressSession(userId: string) {
  return db.workoutSession.findFirst({ where: { userId, status: "in_progress" }, orderBy: { startedAt: "desc" }, select: { id: true, name: true, startedAt: true } });
}

/** Today's planned workout from the active plan (or the next upcoming one). */
export async function getTodayWorkout(userId: string, tz: string) {
  const plan = await getActivePlan(userId);
  if (!plan || !plan.days.length) return { plan, today: null, next: null, isRestDay: false, completedToday: false };
  const today = localDate(tz);
  const wd = weekdayOf(today);
  const todayDay = plan.days.find((d) => d.weekday === wd) ?? null;
  // Unscheduled plans: rotate through days in order based on the last completed session
  let rotating = null;
  if (plan.days.every((d) => d.weekday == null)) {
    const last = await db.workoutSession.findFirst({ where: { userId, planId: plan.id, status: "completed" }, orderBy: { completedAt: "desc" }, select: { dayId: true } });
    const idx = last ? plan.days.findIndex((d) => d.id === last.dayId) : -1;
    rotating = plan.days[(idx + 1) % plan.days.length];
  }
  const scheduled = plan.days.filter((d) => d.weekday != null).sort((a, b) => ((a.weekday! - wd + 7) % 7) - ((b.weekday! - wd + 7) % 7));
  const next = scheduled.find((d) => d.weekday !== wd) ?? null;
  const startOfDay = new Date(Date.now() - 20 * 3600_000);
  const completedToday = !!(await db.workoutSession.findFirst({ where: { userId, status: "completed", completedAt: { gte: startOfDay }, ...(todayDay ? { dayId: todayDay.id } : {}) } }));
  const day = todayDay ?? rotating;
  return { plan, today: day, next, isRestDay: !day, completedToday };
}

export function estimateDayMinutes(exercises: { sets: number; restSec: number }[]) {
  return Math.round(8 + exercises.reduce((m, e) => m + (e.sets * (e.restSec + 45)) / 60, 0));
}

/** Creates a session snapshot from a plan day (or an empty session). Reuses an in-progress one. */
export async function startSession(userId: string, dayId: string | null) {
  const existing = await db.workoutSession.findFirst({ where: { userId, status: "in_progress" } });
  if (existing) return existing;
  let day = null;
  if (dayId) {
    day = await db.workoutDay.findFirst({ where: { id: dayId, plan: { userId } }, include: { exercises: { orderBy: { order: "asc" }, include: { exercise: true } } } });
    if (!day) throw new NotFoundError("Workout not found");
  }
  const prefs = await db.userPreferences.findUnique({ where: { userId } });
  const restOverrides = (prefs?.restByExercise ?? {}) as Record<string, number>;
  const increment = prefs?.weightIncrementKg ?? 2.5;

  const exercises = day ? await Promise.all(day.exercises.map(async (we, order) => {
    const perf = await getExercisePerformance(userId, we.exerciseId);
    const rec = recommendNext({ sets: we.sets, repMin: we.repMin, repMax: we.repMax, rirTarget: we.rirTarget }, perf?.recentSessions ?? [], increment, we.exercise.isTimed);
    return {
      exerciseId: we.exerciseId, exerciseName: we.exercise.name, order, targetSets: we.sets, repMin: we.repMin, repMax: we.repMax,
      restSec: restOverrides[we.exerciseId] ?? we.restSec, rirTarget: we.rirTarget, notes: we.notes,
      recommendation: JSON.stringify(rec),
    };
  })) : [];

  const session = await db.workoutSession.create({
    data: { userId, planId: day?.planId ?? null, dayId: day?.id ?? null, name: day?.name ?? "Quick Workout", focus: day?.focus ?? null, exercises: { create: exercises } },
  });
  await track(userId, "workout_started", { source: day ? "plan" : "quick" });
  return session;
}

export async function getSession(userId: string, sessionId: string) {
  const session = await db.workoutSession.findFirst({
    where: { id: sessionId, userId },
    include: {
      exercises: { orderBy: { order: "asc" }, include: { sets: { orderBy: { setNumber: "asc" } }, exercise: { select: { slug: true, isTimed: true, equipment: true, category: true, primaryMuscles: true } } } },
      records: { include: { exercise: { select: { name: true } } } },
      plan: { select: { id: true, name: true } },
    },
  });
  if (!session) throw new NotFoundError("Workout not found");
  return session;
}

async function ownSessionExercise(userId: string, sessionExerciseId: string) {
  const se = await db.workoutSessionExercise.findFirst({ where: { id: sessionExerciseId, session: { userId } }, include: { session: true } });
  if (!se) throw new NotFoundError("Exercise not found");
  return se;
}

export type SetInput = { clientId: string; sessionExerciseId: string; setNumber: number; weightKg: number; reps: number; rir?: number | null; rpe?: number | null; completedAt?: string };

/** Idempotent on clientId so offline retries never duplicate a set. */
export async function logSet(userId: string, input: SetInput) {
  const se = await ownSessionExercise(userId, input.sessionExerciseId);
  if (se.session.status === "abandoned") throw new Error("This workout was discarded");
  const data = {
    weightKg: Math.max(0, Math.min(1000, input.weightKg)), reps: Math.max(0, Math.min(500, Math.round(input.reps))),
    rir: input.rir == null ? null : Math.max(0, Math.min(10, Math.round(input.rir))), rpe: input.rpe == null ? null : Math.max(1, Math.min(10, input.rpe)),
  };
  const existing = await db.workoutSet.findUnique({ where: { clientId: input.clientId } });
  if (existing && existing.userId !== userId) throw new NotFoundError("Set not found");
  const set = existing
    ? await db.workoutSet.update({ where: { id: existing.id }, data })
    : await db.workoutSet.create({ data: { ...data, clientId: input.clientId, userId, sessionId: se.sessionId, sessionExerciseId: se.id, exerciseId: se.exerciseId, setNumber: input.setNumber, completedAt: input.completedAt ? new Date(input.completedAt) : new Date() } });
  const done = await db.workoutSet.count({ where: { sessionExerciseId: se.id } });
  if (done >= se.targetSets && se.status === "pending") {
    await db.workoutSessionExercise.update({ where: { id: se.id }, data: { status: "completed" } });
    await track(userId, "exercise_completed");
  }
  return set;
}

export async function deleteSet(userId: string, setId: string) {
  const set = await db.workoutSet.findFirst({ where: { id: setId, userId } });
  if (!set) throw new NotFoundError("Set not found");
  await db.workoutSet.delete({ where: { id: setId } });
  const rest = await db.workoutSet.findMany({ where: { sessionExerciseId: set.sessionExerciseId }, orderBy: { setNumber: "asc" } });
  await db.$transaction(rest.map((s, i) => db.workoutSet.update({ where: { id: s.id }, data: { setNumber: i + 1 } })));
  const se = await db.workoutSessionExercise.findUniqueOrThrow({ where: { id: set.sessionExerciseId } });
  if (se.status === "completed" && rest.length < se.targetSets) await db.workoutSessionExercise.update({ where: { id: se.id }, data: { status: "pending" } });
}

export async function changeTargetSets(userId: string, sessionExerciseId: string, delta: 1 | -1) {
  const se = await ownSessionExercise(userId, sessionExerciseId);
  const done = await db.workoutSet.count({ where: { sessionExerciseId } });
  const targetSets = Math.max(Math.max(1, done), Math.min(12, se.targetSets + delta));
  await db.workoutSessionExercise.update({ where: { id: se.id }, data: { targetSets, status: done >= targetSets ? "completed" : "pending" } });
}

export async function setExerciseStatus(userId: string, sessionExerciseId: string, status: "pending" | "skipped") {
  await ownSessionExercise(userId, sessionExerciseId);
  await db.workoutSessionExercise.update({ where: { id: sessionExerciseId }, data: { status } });
}

export async function setExerciseNote(userId: string, sessionExerciseId: string, notes: string) {
  await ownSessionExercise(userId, sessionExerciseId);
  await db.workoutSessionExercise.update({ where: { id: sessionExerciseId }, data: { notes: notes.slice(0, 500) || null } });
}

/** Swaps the exercise for this session only. Completed sets stay with the original exercise. */
export async function replaceSessionExercise(userId: string, sessionExerciseId: string, newExerciseId: string, alsoUpdatePlan: boolean) {
  const se = await ownSessionExercise(userId, sessionExerciseId);
  const ex = await assertExerciseAccess(userId, newExerciseId);
  const done = await db.workoutSet.count({ where: { sessionExerciseId } });
  const perf = await getExercisePerformance(userId, ex.id);
  const rec = recommendNext({ sets: se.targetSets, repMin: se.repMin, repMax: se.repMax, rirTarget: se.rirTarget }, perf?.recentSessions ?? [], 2.5, ex.isTimed);
  const fields = { exerciseId: ex.id, exerciseName: ex.name, replacedFrom: se.exerciseName, recommendation: JSON.stringify(rec), status: "pending", ...(ex.isTimed ? { repMin: ex.repMin, repMax: ex.repMax, rirTarget: null } : {}) };
  if (done > 0) {
    // keep completed work: shrink original, insert replacement after it
    await db.workoutSessionExercise.update({ where: { id: se.id }, data: { targetSets: done, status: "completed" } });
    await db.workoutSessionExercise.updateMany({ where: { sessionId: se.sessionId, order: { gt: se.order } }, data: { order: { increment: 1 } } });
    await db.workoutSessionExercise.create({ data: { sessionId: se.sessionId, order: se.order + 1, targetSets: Math.max(1, se.targetSets - done), repMin: se.repMin, repMax: se.repMax, restSec: ex.restSec, rirTarget: se.rirTarget, ...fields } });
  } else {
    await db.workoutSessionExercise.update({ where: { id: se.id }, data: { ...fields, restSec: ex.restSec } });
  }
  if (alsoUpdatePlan && se.session.dayId) {
    const planEx = await db.workoutExercise.findFirst({ where: { dayId: se.session.dayId, exerciseId: se.exerciseId, day: { plan: { userId } } } });
    if (planEx) await db.workoutExercise.update({ where: { id: planEx.id }, data: { exerciseId: ex.id } });
  }
}

export async function addExerciseToSession(userId: string, sessionId: string, exerciseId: string) {
  const session = await db.workoutSession.findFirst({ where: { id: sessionId, userId, status: "in_progress" }, include: { _count: { select: { exercises: true } } } });
  if (!session) throw new NotFoundError("Workout not found");
  const ex = await assertExerciseAccess(userId, exerciseId);
  const perf = await getExercisePerformance(userId, ex.id);
  const rec = recommendNext({ sets: 3, repMin: ex.repMin, repMax: ex.repMax, rirTarget: 2 }, perf?.recentSessions ?? [], 2.5, ex.isTimed);
  return db.workoutSessionExercise.create({ data: { sessionId, exerciseId, exerciseName: ex.name, order: session._count.exercises, targetSets: 3, repMin: ex.repMin, repMax: ex.repMax, restSec: ex.restSec, rirTarget: ex.isTimed ? null : 2, recommendation: JSON.stringify(rec) } });
}

export async function setRestPreference(userId: string, exerciseId: string, seconds: number) {
  const prefs = await db.userPreferences.upsert({ where: { userId }, create: { userId, restByExercise: {}, notifications: {} }, update: {} });
  const map = { ...((prefs.restByExercise ?? {}) as Record<string, number>), [exerciseId]: Math.max(0, Math.min(600, Math.round(seconds))) };
  await db.userPreferences.update({ where: { userId }, data: { restByExercise: map } });
}

export async function discardSession(userId: string, sessionId: string) {
  const s = await db.workoutSession.findFirst({ where: { id: sessionId, userId, status: "in_progress" } });
  if (!s) throw new NotFoundError("Workout not found");
  await db.workoutSession.delete({ where: { id: sessionId } });
}

/** Finishes the workout: totals, duration and personal records. */
export async function completeSession(userId: string, sessionId: string, notes?: string) {
  const session = await getSession(userId, sessionId);
  if (session.status === "completed") return { session, prs: session.records };
  const sets = session.exercises.flatMap((e) => e.sets);
  if (!sets.length) throw new Error("Log at least one set before finishing");
  const durationSec = Math.round((Date.now() - session.startedAt.getTime()) / 1000);

  const prs: { exerciseId: string; name: string; type: string; value: number; weightKg?: number; reps?: number; previous: number | null }[] = [];
  const byExercise = new Map<string, typeof sets>();
  for (const s of sets) byExercise.set(s.exerciseId, [...(byExercise.get(s.exerciseId) ?? []), s]);
  for (const [exerciseId, exSets] of byExercise) {
    const prior = await db.workoutSet.findMany({ where: { userId, exerciseId, session: { status: "completed", id: { not: sessionId } } }, select: { weightKg: true, reps: true, sessionId: true } });
    if (!prior.length) continue;
    const vols = new Map<string, number>();
    for (const p of prior) vols.set(p.sessionId, (vols.get(p.sessionId) ?? 0) + p.weightKg * p.reps);
    const detected = detectPRs(exSets, bestsFromHistory(prior), Math.max(0, ...vols.values()));
    const name = session.exercises.find((e) => e.exerciseId === exerciseId)!.exerciseName;
    prs.push(...detected.map((d) => ({ exerciseId, name, ...d })));
  }

  await db.$transaction([
    db.workoutSession.update({ where: { id: sessionId }, data: { status: "completed", completedAt: new Date(), durationSec, totalVolume: totalVolume(sets), notes: notes?.slice(0, 1000) || session.notes } }),
    db.workoutSessionExercise.updateMany({ where: { sessionId, status: "pending", sets: { none: {} } }, data: { status: "skipped" } }),
    ...prs.map((p) => db.personalRecord.create({ data: { userId, exerciseId: p.exerciseId, sessionId, type: p.type, value: p.value, weightKg: p.weightKg ?? null, reps: p.reps ?? null, previous: p.previous } })),
  ]);
  await track(userId, "workout_completed", { count: sets.length });
  if (prs.length) {
    await track(userId, "pr_achieved", { count: prs.length });
    const top = prs[0];
    await notify(userId, "pr", "New personal record", `${top.name}: ${PR_LABEL[top.type as keyof typeof PR_LABEL]}${prs.length > 1 ? ` and ${prs.length - 1} more` : ""}.`, `/workout/history/${sessionId}`);
  }
  return { session: await getSession(userId, sessionId), prs };
}

export async function listHistory(userId: string, take = 30, cursor?: string) {
  return db.workoutSession.findMany({
    where: { userId, status: "completed" }, orderBy: { completedAt: "desc" }, take, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: { _count: { select: { sets: true, records: true } }, exercises: { select: { exerciseName: true, status: true }, orderBy: { order: "asc" } } },
  });
}
