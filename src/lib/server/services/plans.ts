import "server-only";
import { db } from "../db";
import type { Prisma } from "@prisma/client";
import { WorkoutPlanSchema, type ParsedWorkout, type WorkoutPlanDraft } from "@/lib/domain/schemas";
import { assertExerciseAccess, ensureCustomExercises, getUserLibrary } from "./exercises";

export { NotFoundError } from "./errors";
import { NotFoundError } from "./errors";

const planInclude = {
  days: {
    orderBy: [{ order: "asc" }],
    include: { exercises: { orderBy: { order: "asc" }, include: { exercise: { select: { id: true, slug: true, name: true, category: true, equipment: true, primaryMuscles: true, isTimed: true } } } } },
  },
  sourceProgram: { select: { slug: true, name: true } },
} satisfies Prisma.WorkoutPlanInclude;

export type PlanWithDays = Prisma.WorkoutPlanGetPayload<{ include: typeof planInclude }>;

export async function listPlans(userId: string) {
  return db.workoutPlan.findMany({ where: { userId, archivedAt: null }, orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }], include: { _count: { select: { days: true } } } });
}

export async function getActivePlan(userId: string) {
  return db.workoutPlan.findFirst({ where: { userId, isActive: true, archivedAt: null }, include: planInclude });
}

export async function getPlan(userId: string, planId: string) {
  const plan = await db.workoutPlan.findFirst({ where: { id: planId, userId }, include: planInclude });
  if (!plan) throw new NotFoundError("Plan not found");
  return plan;
}

/** Ownership guards — every mutation goes through one of these. */
async function ownDay(userId: string, dayId: string) {
  const day = await db.workoutDay.findFirst({ where: { id: dayId, plan: { userId } }, include: { exercises: { orderBy: { order: "asc" } } } });
  if (!day) throw new NotFoundError("Workout day not found");
  return day;
}
async function ownPlanExercise(userId: string, id: string) {
  const ex = await db.workoutExercise.findFirst({ where: { id, day: { plan: { userId } } } });
  if (!ex) throw new NotFoundError("Exercise not found");
  return ex;
}

async function createPlan(userId: string, data: {
  name: string; source: string; sourceProgramId?: string | null; goal?: string | null; difficulty?: string | null; sessionMinutes?: number | null;
  equipment?: string[]; originalText?: string | null; rationale?: string | null; progression?: string | null;
  days: { weekday: number | null; name: string; focus?: string | null; warmup?: string | null; exercises: { exerciseId: string; sets: number; repMin: number; repMax: number; restSec: number; rirTarget?: number | null; tempo?: string | null; notes?: string | null }[] }[];
  activate?: boolean;
}) {
  return db.$transaction(async (tx) => {
    if (data.activate !== false) await tx.workoutPlan.updateMany({ where: { userId, isActive: true }, data: { isActive: false } });
    const plan = await tx.workoutPlan.create({
      data: {
        userId, name: data.name, source: data.source, sourceProgramId: data.sourceProgramId ?? null, goal: data.goal ?? null, difficulty: data.difficulty ?? null,
        daysPerWeek: data.days.length, sessionMinutes: data.sessionMinutes ?? null, equipment: data.equipment ?? [], originalText: data.originalText ?? null,
        rationale: data.rationale ?? null, progression: data.progression ?? null, isActive: data.activate !== false,
        weeks: { create: { weekNumber: 1 } },
      },
      include: { weeks: true },
    });
    for (const [order, d] of data.days.entries()) {
      await tx.workoutDay.create({
        data: {
          planId: plan.id, weekId: plan.weeks[0].id, order, weekday: d.weekday, name: d.name, focus: d.focus ?? null, warmup: d.warmup ?? null,
          exercises: { create: d.exercises.map((e, i) => ({ exerciseId: e.exerciseId, order: i, sets: e.sets, repMin: e.repMin, repMax: e.repMax, restSec: e.restSec, rirTarget: e.rirTarget ?? null, tempo: e.tempo ?? null, notes: e.notes ?? null })) },
        },
      });
    }
    return plan;
  });
}

export async function savePlanDraft(userId: string, draft: WorkoutPlanDraft, source: "generated" | "custom", equipment: string[]) {
  const plan = WorkoutPlanSchema.parse(draft); // re-validate at the boundary
  return createPlan(userId, { ...plan, source, equipment, days: plan.days.map((d) => ({ ...d, exercises: [...d.exercises].sort((a, b) => a.order - b.order) })) });
}

/**
 * Saves a user-reviewed import. Exercises the library couldn't match are
 * saved as the user's own custom exercises (visible only to them).
 */
export async function saveImportedPlan(userId: string, parsed: ParsedWorkout, originalText: string, name: string) {
  const lib = new Map((await getUserLibrary(userId)).map((e) => [e.id, e]));
  const unmatched = parsed.days.flatMap((d) => d.exercises.filter((e) => !e.exerciseId || !lib.has(e.exerciseId)));
  const customIds = await ensureCustomExercises(userId, unmatched.map((e) => ({ name: e.name, repMin: e.repMin, repMax: e.repMax })));
  const days = parsed.days.filter((d) => d.exercises.length).map((d) => ({
    weekday: d.weekday, name: d.name || "Workout", focus: null,
    exercises: d.exercises.filter((e) => e.name.trim() || e.exerciseId).map((e) => {
      const ex = e.exerciseId ? lib.get(e.exerciseId) : undefined;
      const exerciseId = ex?.id ?? customIds.get(e.name.trim().replace(/\s+/g, " ").slice(0, 80).toLowerCase());
      if (!exerciseId) throw new Error(`Give “${e.name || "this exercise"}” a name`);
      return { exerciseId, sets: e.sets, repMin: Math.min(e.repMin, e.repMax), repMax: Math.max(e.repMin, e.repMax), restSec: ex?.restSec ?? 90, rirTarget: ex?.isTimed ? null : 2, notes: e.notes };
    }),
  }));
  if (!days.some((d) => d.exercises.length)) throw new Error("Add at least one exercise");
  const used = days.map((d) => d.weekday).filter((w) => w != null);
  if (new Set(used).size !== used.length) throw new Error("Two workout days are on the same weekday");
  return createPlan(userId, { name: name || "My Imported Plan", source: "imported", originalText: originalText.slice(0, 5000), days });
}

/** Copies a template into a user-owned plan. The template itself is never modified. */
export async function startProgram(userId: string, slug: string) {
  const tpl = await db.programTemplate.findUnique({ where: { slug }, include: { days: { orderBy: { order: "asc" }, include: { exercises: { orderBy: { order: "asc" } } } } } });
  if (!tpl) throw new NotFoundError("Program not found");
  return createPlan(userId, {
    name: tpl.name, source: "program", sourceProgramId: tpl.id, goal: tpl.goal, difficulty: tpl.difficulty, sessionMinutes: tpl.sessionMinutes,
    equipment: tpl.equipment as string[], progression: tpl.progression,
    days: tpl.days.map((d) => ({ weekday: d.weekday, name: d.name, focus: d.focus, warmup: d.warmup, exercises: d.exercises.map((e) => ({ exerciseId: e.exerciseId, sets: e.sets, repMin: e.repMin, repMax: e.repMax, restSec: e.restSec, rirTarget: e.rir, tempo: e.tempo, notes: e.notes })) })),
  });
}

export async function activatePlan(userId: string, planId: string) {
  await getPlan(userId, planId);
  await db.$transaction([
    db.workoutPlan.updateMany({ where: { userId, isActive: true }, data: { isActive: false } }),
    db.workoutPlan.update({ where: { id: planId }, data: { isActive: true, archivedAt: null } }),
  ]);
}

export async function archivePlan(userId: string, planId: string) {
  await getPlan(userId, planId);
  await db.workoutPlan.update({ where: { id: planId }, data: { archivedAt: new Date(), isActive: false } });
}

export async function renamePlan(userId: string, planId: string, name: string) {
  await getPlan(userId, planId);
  await db.workoutPlan.update({ where: { id: planId }, data: { name: name.trim().slice(0, 80) || "My Plan" } });
}

// ───────── Day operations ─────────
export async function updateDay(userId: string, dayId: string, data: { name?: string; weekday?: number | null; focus?: string | null; notes?: string | null }) {
  const day = await ownDay(userId, dayId);
  if (data.weekday != null) {
    const clash = await db.workoutDay.findFirst({ where: { planId: day.planId, weekday: data.weekday, id: { not: dayId } } });
    if (clash) throw new Error(`“${clash.name}” is already on that day`);
  }
  await db.workoutDay.update({ where: { id: dayId }, data: { ...data, name: data.name?.trim().slice(0, 60) || undefined } });
}

export async function duplicateDay(userId: string, dayId: string) {
  const day = await ownDay(userId, dayId);
  const count = await db.workoutDay.count({ where: { planId: day.planId } });
  if (count >= 7) throw new Error("A plan can have at most 7 workout days");
  const copy = await db.workoutDay.create({
    data: { planId: day.planId, weekId: day.weekId, order: count, weekday: null, name: `${day.name} (copy)`.slice(0, 60), focus: day.focus, warmup: day.warmup, notes: day.notes,
      exercises: { create: day.exercises.map(({ exerciseId, order, sets, repMin, repMax, restSec, rirTarget, rpeTarget, tempo, notes }) => ({ exerciseId, order, sets, repMin, repMax, restSec, rirTarget, rpeTarget, tempo, notes })) } },
  });
  await syncDaysPerWeek(day.planId);
  return copy;
}

export async function addDay(userId: string, planId: string) {
  await getPlan(userId, planId);
  const count = await db.workoutDay.count({ where: { planId } });
  if (count >= 7) throw new Error("A plan can have at most 7 workout days");
  const day = await db.workoutDay.create({ data: { planId, order: count, name: `Workout ${count + 1}` } });
  await syncDaysPerWeek(planId);
  return day;
}

export async function deleteDay(userId: string, dayId: string) {
  const day = await ownDay(userId, dayId);
  await db.workoutDay.delete({ where: { id: dayId } });
  await syncDaysPerWeek(day.planId);
}

async function syncDaysPerWeek(planId: string) {
  const n = await db.workoutDay.count({ where: { planId } });
  await db.workoutPlan.update({ where: { id: planId }, data: { daysPerWeek: n } });
}

// ───────── Exercise operations ─────────
export async function addExerciseToDay(userId: string, dayId: string, exerciseId: string) {
  const day = await ownDay(userId, dayId);
  const ex = await assertExerciseAccess(userId, exerciseId);
  return db.workoutExercise.create({ data: { dayId, exerciseId, order: day.exercises.length, sets: 3, repMin: ex.repMin, repMax: ex.repMax, restSec: ex.restSec, rirTarget: ex.isTimed ? null : 2 } });
}

export async function updatePlanExercise(userId: string, id: string, data: { sets?: number; repMin?: number; repMax?: number; restSec?: number; rirTarget?: number | null; notes?: string | null }) {
  const cur = await ownPlanExercise(userId, id);
  const sets = clamp(data.sets ?? cur.sets, 1, 10);
  const repMin = clamp(data.repMin ?? cur.repMin, 1, 100);
  const repMax = Math.max(repMin, clamp(data.repMax ?? cur.repMax, 1, 100));
  await db.workoutExercise.update({
    where: { id },
    data: { sets, repMin, repMax, restSec: clamp(data.restSec ?? cur.restSec, 0, 600), rirTarget: data.rirTarget === undefined ? cur.rirTarget : data.rirTarget == null ? null : clamp(data.rirTarget, 0, 5), notes: data.notes === undefined ? cur.notes : data.notes?.slice(0, 200) || null },
  });
}

export async function removePlanExercise(userId: string, id: string) {
  const ex = await ownPlanExercise(userId, id);
  await db.workoutExercise.delete({ where: { id } });
  await renumber(ex.dayId);
}

export async function movePlanExercise(userId: string, id: string, direction: "up" | "down") {
  const ex = await ownPlanExercise(userId, id);
  const list = await db.workoutExercise.findMany({ where: { dayId: ex.dayId }, orderBy: { order: "asc" } });
  const idx = list.findIndex((e) => e.id === id);
  const swap = direction === "up" ? idx - 1 : idx + 1;
  if (swap < 0 || swap >= list.length) return;
  [list[idx], list[swap]] = [list[swap], list[idx]];
  await db.$transaction(list.map((e, i) => db.workoutExercise.update({ where: { id: e.id }, data: { order: i } })));
}

export async function replacePlanExercise(userId: string, id: string, newExerciseId: string) {
  await ownPlanExercise(userId, id);
  const ex = await assertExerciseAccess(userId, newExerciseId);
  await db.workoutExercise.update({ where: { id }, data: { exerciseId: newExerciseId, ...(ex.isTimed ? { repMin: ex.repMin, repMax: ex.repMax, rirTarget: null } : {}) } });
}

async function renumber(dayId: string) {
  const list = await db.workoutExercise.findMany({ where: { dayId }, orderBy: { order: "asc" } });
  await db.$transaction(list.map((e, i) => db.workoutExercise.update({ where: { id: e.id }, data: { order: i } })));
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)));

// ───────── Program library (read-only templates) ─────────
export async function listPrograms() {
  return db.programTemplate.findMany({ orderBy: [{ featured: "desc" }, { daysPerWeek: "asc" }], include: { days: { select: { weekday: true, name: true } } } });
}
export async function getProgram(slug: string) {
  return db.programTemplate.findUnique({ where: { slug }, include: { days: { orderBy: { order: "asc" }, include: { exercises: { orderBy: { order: "asc" }, include: { exercise: { select: { slug: true, name: true, category: true, equipment: true } } } } } } } });
}
