// Rules-based weekly plan generator. Used directly when AI is unavailable and
// as the hard-constraint validator for AI-generated plans.
import { WEEKDAYS } from "@/lib/domain/enums";
import { WorkoutPlanSchema, type WorkoutPlanDraft } from "@/lib/domain/schemas";
import { hasEquipment, type ExerciseLite } from "./replacement";

export type LibraryExercise = ExerciseLite & { slug: string; repMin: number; repMax: number; restSec: number; isTimed: boolean };

export type PlannerInput = {
  goal: string;
  secondaryGoal?: string | null;
  experience: string; // complete_beginner | beginner | intermediate | advanced
  daysPerWeek: number;
  availableDays: number[]; // 0=Mon..6=Sun
  sessionMinutes: number;
  equipment: string[];
  musclePriorities: string[];
  excludedExerciseIds: string[];
  preferredExerciseIds: string[]; // prioritized + from imported routine
  library: LibraryExercise[];
};

type Slot = { patterns: string[]; main?: boolean; muscles?: string[] };
type DayTemplate = { name: string; focus: string; warmup: string; slots: Slot[] };

const WU_UP = "5 min easy cardio, band pull-aparts ×15, then 2 ramp-up sets for the first exercise.";
const WU_LO = "5 min bike, bodyweight squats ×10, hip hinges ×8, then 2 ramp-up sets.";
const WU_FB = "5 min easy cardio, world's greatest stretch ×5/side, then ramp-up sets.";

const S = (patterns: string[], main = false, muscles?: string[]): Slot => ({ patterns, main, muscles });
const CORE = S(["core_anti_extension", "core_flexion", "core_anti_rotation", "core_anti_lateral"]);

const T: Record<string, DayTemplate> = {
  fbA: { name: "Full Body A", focus: "Squat / Push / Pull", warmup: WU_FB, slots: [S(["squat"], true), S(["horizontal_push"], true), S(["horizontal_pull", "vertical_pull"], true), S(["hinge"]), S(["lateral_raise"]), CORE] },
  fbB: { name: "Full Body B", focus: "Hinge / Press / Row", warmup: WU_FB, slots: [S(["hinge"], true), S(["vertical_push", "incline_push"], true), S(["vertical_pull", "horizontal_pull"], true), S(["lunge", "squat"]), S(["elbow_flexion"]), CORE] },
  fbC: { name: "Full Body C", focus: "Legs / Incline / Arms", warmup: WU_FB, slots: [S(["lunge", "squat"], true), S(["incline_push", "horizontal_push"], true), S(["horizontal_pull"], true), S(["knee_flexion", "hip_extension"]), S(["elbow_extension"]), S(["calf_raise"])] },
  upA: { name: "Upper A", focus: "Chest / Back / Shoulders / Arms", warmup: WU_UP, slots: [S(["horizontal_push"], true), S(["horizontal_pull"], true), S(["vertical_push", "incline_push"], true), S(["vertical_pull"]), S(["lateral_raise"]), S(["elbow_extension"]), S(["elbow_flexion"])] },
  loA: { name: "Lower A", focus: "Quads / Hamstrings / Calves", warmup: WU_LO, slots: [S(["squat"], true), S(["hinge"], true), S(["lunge", "squat"]), S(["knee_flexion"]), S(["calf_raise"]), CORE] },
  upB: { name: "Upper B", focus: "Back / Chest / Arms", warmup: WU_UP, slots: [S(["vertical_pull"], true), S(["incline_push", "horizontal_push"], true), S(["horizontal_pull"], true), S(["chest_fly", "lateral_raise"]), S(["rear_delt"]), S(["elbow_flexion"]), S(["elbow_extension"])] },
  loB: { name: "Lower B", focus: "Glutes / Hamstrings / Core", warmup: WU_LO, slots: [S(["hinge", "hip_extension"], true), S(["squat"], true), S(["lunge"]), S(["knee_extension"]), S(["knee_flexion"]), CORE] },
  push: { name: "Push", focus: "Chest / Shoulders / Triceps", warmup: WU_UP, slots: [S(["horizontal_push"], true), S(["vertical_push"], true), S(["incline_push"]), S(["chest_fly"]), S(["lateral_raise"]), S(["elbow_extension"])] },
  pull: { name: "Pull", focus: "Back / Rear delts / Biceps", warmup: WU_UP, slots: [S(["vertical_pull"], true), S(["horizontal_pull"], true), S(["horizontal_pull", "shoulder_extension"]), S(["rear_delt"]), S(["elbow_flexion"]), S(["elbow_flexion"])] },
  legs: { name: "Legs", focus: "Quads / Hamstrings / Calves", warmup: WU_LO, slots: [S(["squat"], true), S(["hinge"], true), S(["lunge", "squat"]), S(["knee_flexion"]), S(["knee_extension", "hip_extension"]), S(["calf_raise"])] },
};

const SPLITS: Record<number, string[]> = {
  1: ["fbA"], 2: ["fbA", "fbB"], 3: ["fbA", "fbB", "fbC"], 4: ["upA", "loA", "upB", "loB"],
  5: ["push", "pull", "legs", "upA", "loB"], 6: ["push", "pull", "legs", "push", "pull", "legs"],
};

type Scheme = { mainSets: number; accSets: number; main: [number, number]; acc: [number, number]; iso: [number, number]; mainRest: number; accRest: number; isoRest: number; mainRir: number; accRir: number };

export function repScheme(goal: string, experience: string): Scheme {
  const novice = experience === "complete_beginner" || experience === "beginner";
  const base: Scheme = { mainSets: 3, accSets: 3, main: [6, 10], acc: [8, 12], iso: [10, 15], mainRest: 150, accRest: 90, isoRest: 60, mainRir: 2, accRir: 1 };
  if (goal === "get_stronger") Object.assign(base, { mainSets: 4, main: [3, 6], acc: [6, 10], mainRest: 210, accRest: 120, mainRir: 2, accRir: 2 });
  if (goal === "athletic") Object.assign(base, { mainSets: 4, main: [4, 6], acc: [6, 10], mainRest: 180 });
  if (goal === "endurance") Object.assign(base, { main: [10, 15], acc: [12, 15], iso: [15, 20], mainRest: 75, accRest: 60, isoRest: 45 });
  if (goal === "lose_fat" || goal === "recomp") Object.assign(base, { mainRest: 120, accRest: 75 });
  if (novice) Object.assign(base, { mainSets: 3, accSets: 2, mainRir: 3, accRir: 2 });
  if (experience === "advanced" && goal !== "get_stronger") base.mainSets = 4;
  return base;
}

/** Choose `n` training days from the available ones, maximizing spacing. */
export function pickWeekdays(available: number[], n: number): number[] {
  const days = [...new Set(available)].filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b);
  const pool = days.length >= n ? days : [0, 1, 2, 3, 4, 5, 6];
  if (pool.length === n) return pool;
  let best: number[] = pool.slice(0, n), bestScore = -1;
  const combos = (start: number, acc: number[]) => {
    if (acc.length === n) {
      // score = smallest circular gap, then sum of squared gaps (lower better)
      const gaps = acc.map((d, i) => (i === acc.length - 1 ? acc[0] + 7 - d : acc[i + 1] - d));
      const score = Math.min(...gaps) * 100 - gaps.reduce((s, g) => s + g * g, 0);
      if (score > bestScore) { bestScore = score; best = [...acc]; }
      return;
    }
    for (let i = start; i < pool.length; i++) combos(i + 1, [...acc, pool[i]]);
  };
  combos(0, []);
  return best;
}

const DIFF_RANK: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 };
const EXP_MAX: Record<string, number> = { complete_beginner: 0, beginner: 1, intermediate: 2, advanced: 2 };

function minutesFor(sets: number, restSec: number) {
  return (sets * (restSec + 45)) / 60;
}

export type GeneratedPlan = { plan: WorkoutPlanDraft; warnings: string[] };

export function generatePlan(input: PlannerInput): GeneratedPlan {
  const warnings: string[] = [];
  let days = Math.max(1, Math.min(7, input.daysPerWeek));
  if (days === 7) { days = 6; warnings.push("We scheduled 6 training days and kept 1 full rest day — recovery is when progress happens."); }
  const weekdays = pickWeekdays(input.availableDays, days);
  if (input.availableDays.length < days) warnings.push(`You selected ${input.availableDays.length} available day(s) but want ${days} sessions — we spread them across the week. Adjust days in the plan editor.`);

  const available = new Set([...input.equipment, "bodyweight"]);
  const excluded = new Set(input.excludedExerciseIds);
  const preferred = new Set(input.preferredExerciseIds);
  const maxDiff = EXP_MAX[input.experience] ?? 1;
  const scheme = repScheme(input.goal, input.experience);
  const priority = input.musclePriorities.slice(0, 3);

  const pool = input.library.filter((e) => !excluded.has(e.id) && hasEquipment(e, available) && (DIFF_RANK[e.difficulty] ?? 1) <= maxDiff && e.movementType !== "mobility");
  const usedCount = new Map<string, number>();

  const pick = (slot: Slot, takenToday: Set<string>) => {
    const cands = pool.filter((e) => slot.patterns.includes(e.movementPattern) && !takenToday.has(e.id) && e.movementType !== "cardio");
    if (!cands.length) return null;
    const scored = cands.map((e, idx) => {
      let s = 0;
      if (preferred.has(e.id)) s += 40;
      if (slot.main && e.movementType === "compound") s += 25;
      if (!slot.main && e.movementType === "isolation") s += 10;
      s -= (usedCount.get(e.id) ?? 0) * 18; // variety across the week
      s += slot.patterns.length - slot.patterns.indexOf(e.movementPattern); // pattern order preference
      if (e.primaryMuscles.some((m) => priority.includes(m))) s += 6;
      if (input.experience === "complete_beginner" && e.equipment.includes("machines")) s += 4; // machines are easier to learn
      if (e.equipment.includes("bands") && (available.has("cable") || available.has("machines") || available.has("dumbbells"))) s -= 25; // bands only when nothing better exists
      return { e, s: s - idx * 0.01 };
    });
    scored.sort((a, b) => b.s - a.s);
    return scored[0].e;
  };

  const templates = SPLITS[days];
  const planDays = templates.map((key, i) => {
    const t = T[key];
    const taken = new Set<string>();
    const exercises: WorkoutPlanDraft["days"][number]["exercises"] = [];
    let minutes = 8; // warm-up
    const slots = [...t.slots];
    // Muscle priorities: add one extra isolation slot for the top priority muscle if it fits this day
    const extra = priority.map((m) => PRIORITY_SLOT[m]).find((s) => s && t.focus.toLowerCase().includes(s.dayHint));
    if (extra) slots.push(S(extra.patterns));

    for (const slot of slots) {
      const ex = pick(slot, taken);
      if (!ex) continue;
      const isMain = !!slot.main && ex.movementType === "compound";
      const isIso = ex.movementType === "isolation";
      let sets = isMain ? scheme.mainSets : scheme.accSets;
      if (ex.primaryMuscles.some((m) => priority.includes(m))) sets = Math.min(sets + 1, 5);
      const range = ex.isTimed ? [ex.repMin, ex.repMax] as [number, number] : isMain ? scheme.main : isIso ? scheme.iso : scheme.acc;
      const rest = isMain ? scheme.mainRest : isIso ? scheme.isoRest : scheme.accRest;
      const cost = minutesFor(sets, rest);
      if (minutes + cost > input.sessionMinutes && exercises.length >= 3) break;
      minutes += cost;
      taken.add(ex.id);
      usedCount.set(ex.id, (usedCount.get(ex.id) ?? 0) + 1);
      exercises.push({
        exerciseId: ex.id, order: exercises.length, sets, repMin: range[0], repMax: range[1], restSec: rest,
        rirTarget: ex.isTimed ? null : isMain ? scheme.mainRir : scheme.accRir, tempo: null,
        notes: preferred.has(ex.id) ? "From your current routine / priorities" : null,
      });
    }
    // Conditioning finisher for fat-loss / endurance if time remains
    if ((input.goal === "lose_fat" || input.goal === "endurance") && minutes + 12 <= input.sessionMinutes + 5) {
      const cardio = input.library.find((e) => e.movementType === "cardio" && hasEquipment(e, available) && !excluded.has(e.id) && (DIFF_RANK[e.difficulty] ?? 1) <= maxDiff);
      if (cardio) exercises.push({ exerciseId: cardio.id, order: exercises.length, sets: 1, repMin: 10, repMax: 15, restSec: 0, rirTarget: null, tempo: null, notes: "Conditioning finisher — minutes at a moderate pace" });
    }
    return { weekday: weekdays[i], name: t.name, focus: t.focus, warmup: t.warmup, exercises };
  });

  if (planDays.some((d) => d.exercises.length < 3)) warnings.push("Your equipment limits exercise choice on some days. Adding equipment (e.g. dumbbells or bands) unlocks better options.");

  const splitName = { 1: "Full Body", 2: "Full Body A/B", 3: "Full Body ×3", 4: "Upper/Lower", 5: "PPL + Upper/Lower", 6: "Push/Pull/Legs" }[days];
  const rationale = [
    `${splitName} split across ${days} day(s): ${weekdays.map((d) => WEEKDAYS[d]).join(", ")}.`,
    days >= 4 ? "Each muscle group is trained about twice per week." : "Full-body sessions train each muscle group on every training day with rest days in between.",
    `Main lifts use ${scheme.main[0]}–${scheme.main[1]} reps at RIR ${scheme.mainRir}; accessories ${scheme.acc[0]}–${scheme.acc[1]} reps; isolation ${scheme.iso[0]}–${scheme.iso[1]} reps.`,
    "Compound movements come first while you're fresh; isolation work follows.",
    priority.length ? `Extra volume for your priority muscles: ${priority.join(", ")}.` : "",
    `Sessions are sized for about ${input.sessionMinutes} minutes.`,
  ].filter(Boolean).join(" ");

  const draft = {
    name: `My ${splitName} Plan`,
    goal: input.goal,
    difficulty: (maxDiff === 0 ? "beginner" : input.experience === "advanced" ? "advanced" : maxDiff === 1 ? "beginner" : "intermediate") as WorkoutPlanDraft["difficulty"],
    sessionMinutes: Math.max(15, Math.min(150, input.sessionMinutes)),
    rationale,
    progression: "Double progression: when you reach the top of the rep range on every set with the target reps in reserve, the app suggests a small load increase next session.",
    days: planDays,
  };
  return { plan: WorkoutPlanSchema.parse(draft), warnings };
}

const PRIORITY_SLOT: Record<string, { patterns: string[]; dayHint: string }> = {
  chest: { patterns: ["chest_fly", "incline_push"], dayHint: "chest" },
  back: { patterns: ["vertical_pull", "shoulder_extension"], dayHint: "back" },
  shoulders: { patterns: ["lateral_raise", "rear_delt"], dayHint: "shoulder" },
  biceps: { patterns: ["elbow_flexion"], dayHint: "bicep" },
  triceps: { patterns: ["elbow_extension"], dayHint: "tricep" },
  forearms: { patterns: ["wrist_flexion", "carry"], dayHint: "arm" },
  abs: { patterns: ["core_flexion", "core_anti_extension"], dayHint: "core" },
  glutes: { patterns: ["hip_extension", "hip_abduction"], dayHint: "glute" },
  quads: { patterns: ["knee_extension"], dayHint: "quad" },
  hamstrings: { patterns: ["knee_flexion"], dayHint: "hamstring" },
  calves: { patterns: ["calf_raise"], dayHint: "quad" },
};

/**
 * Hard constraints any plan (AI or rules) must satisfy before it is saved.
 * Returns a list of human-readable violations (empty = OK).
 */
export function checkPlanConstraints(plan: WorkoutPlanDraft, ctx: { library: Map<string, LibraryExercise>; equipment: string[]; excludedExerciseIds: string[] }) {
  const errors: string[] = [];
  const available = new Set([...ctx.equipment, "bodyweight"]);
  const excluded = new Set(ctx.excludedExerciseIds);
  for (const day of plan.days) {
    for (const ex of day.exercises) {
      const lib = ctx.library.get(ex.exerciseId);
      if (!lib) { errors.push(`${day.name}: unknown exercise id ${ex.exerciseId}`); continue; }
      if (!hasEquipment(lib, available)) errors.push(`${day.name}: ${lib.name} needs equipment you don't have`);
      if (excluded.has(lib.id)) errors.push(`${day.name}: ${lib.name} is on your excluded list`);
    }
  }
  // Weekly hard-set ceiling per muscle (primary) to avoid extreme volume
  const perMuscle = new Map<string, number>();
  for (const day of plan.days) for (const ex of day.exercises) {
    const lib = ctx.library.get(ex.exerciseId);
    lib?.primaryMuscles.forEach((m) => perMuscle.set(m, (perMuscle.get(m) ?? 0) + ex.sets));
  }
  for (const [m, sets] of perMuscle) if (sets > 26) errors.push(`${sets} weekly sets for ${m} is excessive (max 26)`);
  return errors;
}
