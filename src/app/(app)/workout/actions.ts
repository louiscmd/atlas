"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import { requireOnboardedUser } from "@/lib/server/auth";
import { run } from "@/lib/server/action";
import { rateLimit, LIMITS } from "@/lib/server/rateLimit";
import { track } from "@/lib/server/analytics";
import { ParsedWorkoutSchema, WorkoutPlanSchema, type ParsedWorkout, type WorkoutPlanDraft } from "@/lib/domain/schemas";
import * as plans from "@/lib/server/services/plans";
import * as workouts from "@/lib/server/services/workouts";
import { getAlternativesForUser, getUserLibrary } from "@/lib/server/services/exercises";
import { getUserContext, setRestriction } from "@/lib/server/services/profile";
import { notify } from "@/lib/server/services/notifications";
import { buildWeeklyPlan, parseRoutine } from "@/lib/ai/services/workoutPlanner";
import { getPlayerState } from "@/lib/server/services/player";

const refresh = () => { revalidatePath("/workout", "layout"); revalidatePath("/home"); };
// Used from inside the workout player: must not re-render the active session route.
const refreshOutsidePlayer = () => { for (const p of ["/workout", "/workout/plan", "/workout/history", "/home"]) revalidatePath(p); };
const id = z.string().min(1).max(64);

async function aiGate(userId: string) {
  const r = rateLimit(`ai:${userId}`, ...LIMITS.ai);
  if (!r.ok) throw new Error("You've used AI features a lot in the last hour. Please try again a bit later.");
}

// ───────── Import ─────────
export async function parseImport(text: string) {
  const user = await requireOnboardedUser();
  return run(async () => {
    const t = z.string().trim().min(3, "Paste or type your routine first").max(5000).parse(text);
    await aiGate(user.id);
    return parseRoutine(user.id, t);
  });
}

export async function confirmImport(parsed: ParsedWorkout, originalText: string, name: string) {
  const user = await requireOnboardedUser();
  return run(async () => {
    const plan = await plans.saveImportedPlan(user.id, ParsedWorkoutSchema.parse(parsed), originalText, name.slice(0, 80));
    await track(user.id, "plan_imported");
    refresh();
    return plan.id;
  });
}

// ───────── Generate ─────────
export async function generatePlanDraft() {
  const user = await requireOnboardedUser();
  return run(async () => {
    await aiGate(user.id);
    return buildWeeklyPlan(user.id);
  });
}

export async function saveGeneratedPlan(draft: WorkoutPlanDraft) {
  const user = await requireOnboardedUser();
  return run(async () => {
    const ctx = await getUserContext(user.id);
    const plan = await plans.savePlanDraft(user.id, WorkoutPlanSchema.parse(draft), "generated", ctx.equipment);
    await track(user.id, "plan_generated");
    await notify(user.id, "workout_ready", "Your plan is ready", `${plan.name} is now your active plan.`, "/workout/plan");
    refresh();
    return plan.id;
  });
}

// ───────── Programs ─────────
export async function startProgram(slug: string) {
  const user = await requireOnboardedUser();
  return run(async () => {
    const plan = await plans.startProgram(user.id, z.string().max(80).parse(slug));
    await track(user.id, "program_started");
    refresh();
    return plan.id;
  });
}

// ───────── Plan editing ─────────
export async function planOp(op:
  | { type: "activate" | "archive"; planId: string }
  | { type: "rename"; planId: string; name: string }
  | { type: "addDay"; planId: string }
  | { type: "updateDay"; dayId: string; name?: string; weekday?: number | null }
  | { type: "duplicateDay" | "deleteDay"; dayId: string }
  | { type: "addExercise"; dayId: string; exerciseId: string }
  | { type: "updateExercise"; id: string; sets?: number; repMin?: number; repMax?: number; restSec?: number; rirTarget?: number | null; notes?: string | null }
  | { type: "removeExercise"; id: string }
  | { type: "moveExercise"; id: string; direction: "up" | "down" }
  | { type: "replaceExercise"; id: string; exerciseId: string }) {
  const user = await requireOnboardedUser();
  return run(async () => {
    const u = user.id;
    switch (op.type) {
      case "activate": await plans.activatePlan(u, id.parse(op.planId)); break;
      case "archive": await plans.archivePlan(u, id.parse(op.planId)); break;
      case "rename": await plans.renamePlan(u, id.parse(op.planId), z.string().max(80).parse(op.name)); break;
      case "addDay": await plans.addDay(u, id.parse(op.planId)); break;
      case "updateDay": await plans.updateDay(u, id.parse(op.dayId), { name: op.name == null ? undefined : z.string().max(60).parse(op.name), weekday: op.weekday === undefined ? undefined : z.number().int().min(0).max(6).nullable().parse(op.weekday) }); break;
      case "duplicateDay": await plans.duplicateDay(u, id.parse(op.dayId)); break;
      case "deleteDay": await plans.deleteDay(u, id.parse(op.dayId)); break;
      case "addExercise": await plans.addExerciseToDay(u, id.parse(op.dayId), id.parse(op.exerciseId)); break;
      case "updateExercise": { const { type: _t, id: exId, ...rest } = op; await plans.updatePlanExercise(u, id.parse(exId), rest); break; }
      case "removeExercise": await plans.removePlanExercise(u, id.parse(op.id)); break;
      case "moveExercise": await plans.movePlanExercise(u, id.parse(op.id), op.direction === "up" ? "up" : "down"); break;
      case "replaceExercise": await plans.replacePlanExercise(u, id.parse(op.id), id.parse(op.exerciseId)); break;
    }
    refresh();
  });
}

export async function getAlternatives(exerciseId: string) {
  const user = await requireOnboardedUser();
  return run(() => getAlternativesForUser(user.id, id.parse(exerciseId)));
}

export async function searchLibrary() {
  const user = await requireOnboardedUser();
  return run(async () => (await getUserLibrary(user.id)).map((e) => ({ id: e.id, name: e.name, category: e.category, equipment: e.equipment, primaryMuscles: e.primaryMuscles, isCustom: e.ownerId != null })));
}

export async function setExercisePreference(exerciseId: string, type: "cannot_do" | "dislike" | "prioritize" | null) {
  const user = await requireOnboardedUser();
  return run(async () => { await setRestriction(user.id, id.parse(exerciseId), type); revalidatePath("/workout/exercises", "layout"); });
}

// ───────── Sessions ─────────
export async function startWorkout(dayId: string | null) {
  const user = await requireOnboardedUser();
  return run(async () => {
    const s = await workouts.startSession(user.id, dayId ? id.parse(dayId) : null);
    refresh();
    return s.id;
  });
}

const SetSchema = z.object({ clientId: z.string().min(8).max(64), sessionExerciseId: id, setNumber: z.number().int().min(1).max(50), weightKg: z.number().min(0).max(1000), reps: z.number().int().min(0).max(500), rir: z.number().int().min(0).max(10).nullable().optional(), completedAt: z.string().optional() });

export async function logSet(input: z.infer<typeof SetSchema>) {
  const user = await requireOnboardedUser();
  return run(async () => { const s = await workouts.logSet(user.id, SetSchema.parse(input)); return { id: s.id, clientId: s.clientId }; });
}

export async function sessionOp(op:
  | { type: "deleteSet"; setId: string }
  | { type: "addSet" | "removeSet"; sessionExerciseId: string }
  | { type: "skip" | "unskip"; sessionExerciseId: string }
  | { type: "note"; sessionExerciseId: string; notes: string }
  | { type: "replace"; sessionExerciseId: string; exerciseId: string; updatePlan: boolean }
  | { type: "add"; sessionId: string; exerciseId: string }
  | { type: "rest"; exerciseId: string; seconds: number }
  | { type: "discard"; sessionId: string }) {
  const user = await requireOnboardedUser();
  return run(async () => {
    const u = user.id;
    switch (op.type) {
      case "deleteSet": await workouts.deleteSet(u, id.parse(op.setId)); break;
      case "addSet": await workouts.changeTargetSets(u, id.parse(op.sessionExerciseId), 1); break;
      case "removeSet": await workouts.changeTargetSets(u, id.parse(op.sessionExerciseId), -1); break;
      case "skip": await workouts.setExerciseStatus(u, id.parse(op.sessionExerciseId), "skipped"); break;
      case "unskip": await workouts.setExerciseStatus(u, id.parse(op.sessionExerciseId), "pending"); break;
      case "note": await workouts.setExerciseNote(u, id.parse(op.sessionExerciseId), z.string().max(500).parse(op.notes)); break;
      case "replace": await workouts.replaceSessionExercise(u, id.parse(op.sessionExerciseId), id.parse(op.exerciseId), !!op.updatePlan); break;
      case "add": await workouts.addExerciseToSession(u, id.parse(op.sessionId), id.parse(op.exerciseId)); break;
      case "rest": await workouts.setRestPreference(u, id.parse(op.exerciseId), z.number().min(0).max(600).parse(op.seconds)); break;
      case "discard": await workouts.discardSession(u, id.parse(op.sessionId)); refreshOutsidePlayer(); break;
    }
  });
}

export async function getSessionState(sessionId: string) {
  const user = await requireOnboardedUser();
  return run(() => getPlayerState(user.id, id.parse(sessionId)));
}

export async function finishWorkout(sessionId: string, notes?: string) {
  const user = await requireOnboardedUser();
  return run(async () => {
    const { prs } = await workouts.completeSession(user.id, id.parse(sessionId), notes?.slice(0, 1000));
    refreshOutsidePlayer();
    return { prCount: prs.length };
  });
}


export async function changeWorkoutDate(sessionId: string, date: string) {
  const user = await requireOnboardedUser();
  return run(async () => {
    const ctx = await getUserContext(user.id);
    await workouts.changeSessionDate(user.id, id.parse(sessionId), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(date), ctx.tz);
    refreshOutsidePlayer();
    revalidatePath(`/workout/history/${sessionId}`);
    revalidatePath("/progress", "layout");
  });
}
