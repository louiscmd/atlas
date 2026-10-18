import "server-only";
import { ParsedWorkoutSchema, WorkoutPlanSchema, type ParsedWorkout, type WorkoutPlanDraft } from "@/lib/domain/schemas";
import { parseWorkoutText } from "@/lib/engines/workoutParser";
import { generatePlan, checkPlanConstraints, pickWeekdays, type PlannerInput } from "@/lib/engines/planGenerator";
import { hasEquipment } from "@/lib/engines/replacement";
import { SESSION_LENGTHS } from "@/lib/domain/enums";
import { getLibrary, getUserLibrary } from "@/lib/server/services/exercises";
import { getUserContext } from "@/lib/server/services/profile";
import { getActivePlan } from "@/lib/server/services/plans";
import { db } from "@/lib/server/db";
import { runStructured, textBlock } from "../client";
import { PROMPTS } from "../prompts";

export type Sourced<T> = { data: T; source: "ai" | "rules"; notice: string | null };

const PUSH = new Set(["chest", "shoulders", "triceps"]), PULL = new Set(["back", "biceps", "forearms"]), LEGS = new Set(["quads", "hamstrings", "glutes", "calves"]);
/** Names unnamed days from their exercises: Push / Pull / Legs / Upper / Full Body. */
export function inferDayName(muscles: string[]) {
  const m = muscles.filter((x) => x !== "abs");
  if (!m.length) return "Workout";
  const share = (s: Set<string>) => m.filter((x) => s.has(x)).length / m.length;
  if (share(PUSH) >= 0.8) return "Push";
  if (share(PULL) >= 0.8) return "Pull";
  if (share(LEGS) >= 0.8) return "Legs";
  if (share(LEGS) <= 0.15) return "Upper";
  return "Full Body";
}

/** Workout Planner AI — routine import. Falls back to the deterministic parser. */
export async function parseRoutine(userId: string, text: string): Promise<Sourced<ParsedWorkout>> {
  const lib = await getUserLibrary(userId); // includes the user's custom exercises, so re-imports match them
  const matchable = lib.map((e) => ({ id: e.id, name: e.name, slug: e.slug }));
  const byId = new Map(lib.map((e) => [e.id, e]));
  const nameDays = (w: ParsedWorkout) => {
    for (const d of w.days) if (!d.name || d.name === "Workout") d.name = inferDayName(d.exercises.flatMap((e) => (e.exerciseId ? byId.get(e.exerciseId)?.primaryMuscles ?? [] : [])));
    return w;
  };
  const rules = nameDays(parseWorkoutText(text, matchable));
  const looksStructured = rules.days.length > 0 && rules.days.every((d) => d.exercises.length > 0 && d.exercises.every((e) => e.exerciseId));
  if (looksStructured) return { data: rules, source: "rules", notice: null }; // no AI call needed (cost control)

  const ids = new Set(lib.map((e) => e.id));
  const res = await runStructured({
    service: "workout_planner", prompt: PROMPTS.workoutParse, schema: ParsedWorkoutSchema, userId, effort: "low", maxTokens: 8000,
    content: [textBlock(`Exercise library (id | name):\n${lib.map((e) => `${e.id} | ${e.name}`).join("\n")}\n\nUser's routine:\n"""${text.slice(0, 4000)}"""`)],
  });
  if (res.ok) {
    // Never trust ids from the model: unknown ids become "needs review"
    for (const d of res.data.days) for (const e of d.exercises) if (e.exerciseId && !ids.has(e.exerciseId)) e.exerciseId = null;
    return { data: nameDays(res.data), source: "ai", notice: null };
  }
  return { data: rules, source: "rules", notice: res.code === "not_configured" ? "AI import isn't configured, so we used the built-in parser. It works best with one exercise per line, e.g. “Bench Press — 3 × 8”." : "AI import is unavailable right now, so we used the built-in parser. Review the result carefully." };
}

async function plannerInput(userId: string): Promise<PlannerInput> {
  const [ctx, lib, active] = await Promise.all([getUserContext(userId), getLibrary(), getActivePlan(userId)]);
  const minutes = SESSION_LENGTHS.find((s) => s.key === ctx.goals?.sessionLength)?.minutes ?? 60;
  const current = active?.source === "imported" || active?.source === "custom" ? active.days.flatMap((d) => d.exercises.map((e) => e.exerciseId)) : [];
  return {
    goal: ctx.goals?.primaryGoal ?? "general", secondaryGoal: ctx.goals?.secondaryGoal, experience: ctx.profile?.experience ?? "beginner",
    daysPerWeek: ctx.goals?.daysPerWeek ?? 3, availableDays: ctx.availableDays, sessionMinutes: minutes, equipment: ctx.equipment,
    musclePriorities: ctx.musclePriorities, excludedExerciseIds: ctx.excludedExerciseIds, preferredExerciseIds: [...ctx.preferredExerciseIds, ...current], library: lib,
  };
}

async function performanceSummary(userId: string) {
  const sets = await db.workoutSet.findMany({ where: { userId, session: { status: "completed" } }, orderBy: { completedAt: "desc" }, take: 200, select: { weightKg: true, reps: true, rir: true, exercise: { select: { id: true, name: true } } } });
  const seen = new Map<string, string>();
  for (const s of sets) if (!seen.has(s.exercise.id)) seen.set(s.exercise.id, `${s.exercise.name}: last ${s.weightKg} kg × ${s.reps}${s.rir != null ? ` @ RIR ${s.rir}` : ""}`);
  return [...seen.values()].slice(0, 25);
}

/** Workout Planner AI — weekly plan. AI output must pass schema AND hard constraints, else rules engine. */
export async function buildWeeklyPlan(userId: string): Promise<Sourced<WorkoutPlanDraft> & { warnings: string[] }> {
  const input = await plannerInput(userId);
  const rules = generatePlan(input);
  const available = new Set([...input.equipment, "bodyweight"]);
  const candidates = input.library.filter((e) => hasEquipment(e, available) && !input.excludedExerciseIds.includes(e.id));
  const days = pickWeekdays(input.availableDays, Math.min(6, input.daysPerWeek));
  const libMap = new Map(input.library.map((e) => [e.id, e]));
  const ctx = await getUserContext(userId);
  const injuries = ctx.restrictions.filter((r) => r.type === "injury").map((r) => r.note).join("; ");

  const res = await runStructured({
    service: "workout_planner", prompt: PROMPTS.workoutGenerate, schema: WorkoutPlanSchema, userId, effort: "medium",
    validate: (plan) => {
      const errs = checkPlanConstraints(plan, { library: libMap, equipment: input.equipment, excludedExerciseIds: input.excludedExerciseIds });
      if (plan.days.some((d) => !days.includes(d.weekday))) errs.push(`Only schedule on weekdays ${days.join(", ")}`);
      return errs;
    },
    content: [textBlock([
      `User profile: goal=${input.goal}${input.secondaryGoal ? `, secondary=${input.secondaryGoal}` : ""}, experience=${input.experience}, sessions/week=${days.length}, weekdays=${days.join(",")}, minutes/session=${input.sessionMinutes}.`,
      `Priority muscles (ranked): ${input.musclePriorities.join(", ") || "none"}.`,
      injuries ? `User-reported limitations (do not diagnose; avoid aggravating movements): ${injuries.slice(0, 400)}` : "",
      `Exercises from current routine / preferred: ${input.preferredExerciseIds.map((id) => libMap.get(id)?.name).filter(Boolean).join(", ") || "none"}.`,
      `Recent performance:\n${(await performanceSummary(userId)).join("\n") || "no history yet"}`,
      `Candidate exercises (id | name | pattern | type | primary muscles):\n${candidates.map((e) => `${e.id} | ${e.name} | ${e.movementPattern} | ${e.movementType} | ${e.primaryMuscles.join("/")}`).join("\n")}`,
    ].filter(Boolean).join("\n\n"))],
  });
  if (res.ok) return { data: res.data, source: "ai", notice: null, warnings: rules.warnings };
  return {
    data: rules.plan, source: "rules", warnings: rules.warnings,
    notice: res.code === "not_configured" ? "Built with our rules-based programming engine (AI not configured)." : "AI planning was unavailable, so this plan was built with our rules-based programming engine.",
  };
}
