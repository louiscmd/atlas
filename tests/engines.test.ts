import { describe, expect, it } from "vitest";
import { bmr, estimateTargets, scaleNutrients, sumNutrients, fromPer100, remaining } from "@/lib/engines/nutrition";
import { estimate1RM, smoothTrend, summarizeSets } from "@/lib/engines/performance";
import { recommendNext } from "@/lib/engines/progression";
import { bestsFromHistory, detectPRs } from "@/lib/engines/records";
import { rankAlternatives, type ExerciseLite } from "@/lib/engines/replacement";
import { parseWorkoutText, matchExercise } from "@/lib/engines/workoutParser";
import { generatePlan, pickWeekdays, checkPlanConstraints, type LibraryExercise } from "@/lib/engines/planGenerator";
import { EXERCISES } from "../prisma/seed/exercises";

const library: LibraryExercise[] = EXERCISES.map((e) => ({
  id: e.slug, slug: e.slug, name: e.name, category: e.category, primaryMuscles: e.primary, secondaryMuscles: e.secondary, equipment: e.equipment,
  difficulty: e.difficulty, movementType: e.type, movementPattern: e.pattern, repMin: e.reps[0], repMax: e.reps[1], restSec: e.rest, isTimed: !!e.timed,
}));
const match = library.map((e) => ({ id: e.id, name: e.name, slug: e.id }));

describe("macro calculations", () => {
  it("computes Mifflin-St Jeor BMR", () => {
    expect(Math.round(bmr({ sex: "male", age: 30, heightCm: 180, weightKg: 80 }))).toBe(1780);
    expect(Math.round(bmr({ sex: "female", age: 30, heightCm: 165, weightKg: 60 }))).toBe(1320);
  });
  it("applies a moderate deficit and never goes below the floor", () => {
    const t = estimateTargets({ sex: "female", age: 60, heightCm: 150, weightKg: 45, activityLevel: "sedentary", goal: "lose_fat" });
    expect(t.calories).toBeGreaterThanOrEqual(1200);
    expect(t.explanation.join(" ")).toMatch(/minimum/);
    const m = estimateTargets({ sex: "male", age: 30, heightCm: 180, weightKg: 80, activityLevel: "moderate", goal: "lose_fat" });
    expect(m.calories).toBeCloseTo(m.maintenanceCalories * 0.8, -1);
    expect(m.proteinG).toBe(160);
    // macros add up to calories within rounding
    expect(Math.abs(m.proteinG * 4 + m.carbsG * 4 + m.fatG * 9 - m.calories)).toBeLessThan(40);
  });
  it("scales and sums nutrients", () => {
    const egg = { calories: 72, protein: 6.3, carbs: 0.4, fat: 4.8 };
    expect(scaleNutrients(egg, 3).calories).toBe(216);
    expect(sumNutrients([egg, egg]).protein).toBe(12.6);
    expect(fromPer100({ grams: 250, kcalPer100: 130, proteinPer100: 2.7, carbsPer100: 28, fatPer100: 0.3 }).calories).toBe(325);
    expect(remaining({ calories: 2000, proteinG: 150, carbsG: 200, fatG: 60 }, { calories: 1440, protein: 102, carbs: 130, fat: 42 })).toEqual({ calories: 560, protein: 48, carbs: 70, fat: 18 });
  });
});

describe("performance", () => {
  it("estimates 1RM with Epley and caps high reps", () => {
    expect(estimate1RM(100, 1)).toBe(100);
    expect(estimate1RM(80, 6)).toBe(96);
    expect(estimate1RM(50, 30)).toBe(estimate1RM(50, 12));
  });
  it("summarizes sets", () => {
    expect(summarizeSets([{ weightKg: 70, reps: 8 }, { weightKg: 70, reps: 8 }, { weightKg: 70, reps: 8 }], (k) => `${k} kg`)).toBe("70 kg × 8 × 3");
  });
  it("smooths weight trend", () => {
    const pts = smoothTrend([{ date: new Date(1), value: 80 }, { date: new Date(2), value: 82 }]);
    expect(pts[1].trend).toBe(80.5);
  });
});

describe("progression engine", () => {
  const p = { sets: 3, repMin: 8, repMax: 10, rirTarget: 2 };
  const s = (w: number, r: number, rir = 2) => ({ weightKg: w, reps: r, rir });
  it("suggests a small increase when top of range is hit with reserve", () => {
    const rec = recommendNext(p, [{ date: new Date(), sets: [s(70, 10), s(70, 10), s(70, 10)] }]);
    expect(rec.action).toBe("increase_weight");
    expect(rec.weightKg).toBe(72.5);
  });
  it("does not increase when sets were too close to failure", () => {
    expect(recommendNext(p, [{ date: new Date(), sets: [s(70, 10, 0), s(70, 10, 0), s(70, 10, 0)] }]).action).toBe("maintain");
  });
  it("adds reps inside the range", () => {
    const rec = recommendNext(p, [{ date: new Date(), sets: [s(70, 9), s(70, 8), s(70, 8)] }]);
    expect(rec).toMatchObject({ action: "increase_reps", weightKg: 70, repTarget: 9 });
  });
  it("reduces load after repeated decline", () => {
    const rec = recommendNext(p, [
      { date: new Date(3), sets: [s(70, 6)] }, { date: new Date(2), sets: [s(70, 7)] }, { date: new Date(1), sets: [s(70, 8)] },
    ]);
    expect(rec.action).toBe("reduce");
    expect(rec.weightKg).toBe(62.5);
  });
  it("handles first session", () => expect(recommendNext(p, []).action).toBe("start"));
});

describe("PR detection", () => {
  const prior = bestsFromHistory([{ weightKg: 80, reps: 5 }, { weightKg: 70, reps: 8 }]);
  it("detects heaviest weight", () => {
    const prs = detectPRs([{ weightKg: 82.5, reps: 3 }], prior, 1000);
    expect(prs.map((p) => p.type)).toContain("heaviest_weight");
  });
  it("detects most reps at a known weight", () => {
    const prs = detectPRs([{ weightKg: 70, reps: 10 }], prior, 5000);
    expect(prs.map((p) => p.type)).toEqual(expect.arrayContaining(["most_reps"]));
  });
  it("detects session volume", () => {
    const prs = detectPRs([{ weightKg: 60, reps: 10 }, { weightKg: 60, reps: 10 }], prior, 1000);
    expect(prs.map((p) => p.type)).toContain("best_session_volume");
  });
  it("does not flag PRs on the first-ever session", () => {
    expect(detectPRs([{ weightKg: 100, reps: 5 }], null, 0)).toEqual([]);
  });
  it("does not flag PRs for worse performance", () => {
    expect(detectPRs([{ weightKg: 60, reps: 5 }], prior, 5000)).toEqual([]);
  });
});

describe("replacement engine", () => {
  const bench = library.find((e) => e.id === "barbell-bench-press") as ExerciseLite;
  it("recommends dumbbell bench when the user has dumbbells but no barbell", () => {
    const ranked = rankAlternatives(bench, library, { available: new Set(["dumbbells", "bench"]), excluded: new Set(), preferred: new Set(), curatedAlternativeIds: ["dumbbell-bench-press", "smith-machine-bench-press"] });
    expect(ranked[0].id).toBe("dumbbell-bench-press");
    expect(ranked.every((r) => r.equipment.every((q) => ["dumbbells", "bench"].includes(q)))).toBe(true);
  });
  it("respects excluded exercises and requires the same muscle", () => {
    const ranked = rankAlternatives(bench, library, { available: new Set(["dumbbells", "bench"]), excluded: new Set(["dumbbell-bench-press"]), preferred: new Set() });
    expect(ranked.find((r) => r.id === "dumbbell-bench-press")).toBeUndefined();
    expect(ranked.every((r) => r.primaryMuscles.some((m) => bench.primaryMuscles.includes(m)))).toBe(true);
  });
});

describe("workout parser", () => {
  it("parses structured input", () => {
    const r = parseWorkoutText("Monday:\nBench Press — 3 × 8\nIncline Dumbbell Press — 3 × 10\nLateral Raises — 3 × 15", match);
    expect(r.days).toHaveLength(1);
    expect(r.days[0].weekday).toBe(0);
    expect(r.days[0].exercises.map((e) => e.exerciseId)).toEqual(["barbell-bench-press", "incline-dumbbell-press", "lateral-raise"]);
    expect(r.days[0].exercises[0]).toMatchObject({ sets: 3, repMin: 8, repMax: 8 });
  });
  it("parses natural language shorthand", () => {
    const r = parseWorkoutText("Monday chest and shoulders, bench 3x8, incline dumbbells 3x10, laterals 3x15\nWednesday legs: squat 5x5 @ 100kg, rdl 3x8-10, leg curls 3x12", match);
    expect(r.days).toHaveLength(2);
    expect(r.days[0].name).toMatch(/Chest/);
    expect(r.days[0].exercises.map((e) => e.exerciseId)).toEqual(["barbell-bench-press", "incline-dumbbell-press", "lateral-raise"]);
    expect(r.days[1].weekday).toBe(2);
    expect(r.days[1].exercises[0]).toMatchObject({ exerciseId: "back-squat", sets: 5, repMin: 5, weightKg: 100 });
    expect(r.days[1].exercises[1]).toMatchObject({ exerciseId: "romanian-deadlift", repMin: 8, repMax: 10 });
  });
  it("flags unmatched exercises for review", () => {
    const r = parseWorkoutText("Day 1:\nZercher carries 3x20", match);
    expect(r.days[0].exercises[0]).toMatchObject({ exerciseId: null, name: "Zercher Carries" });
    expect(r.warnings[0]).toMatch(/Not in our library/);
  });
  it("matches exact names", () => expect(matchExercise("Goblet Squat", match)?.id).toBe("goblet-squat"));
});

describe("plan generator", () => {
  const base = {
    goal: "build_muscle", experience: "intermediate", daysPerWeek: 4, availableDays: [0, 1, 3, 4], sessionMinutes: 60,
    equipment: ["barbell", "dumbbells", "bench", "squat_rack", "cable", "machines", "pullup_bar"], musclePriorities: ["shoulders"],
    excludedExerciseIds: [], preferredExerciseIds: [], library,
  };
  const byId = new Map(library.map((e) => [e.id, e]));
  it("generates a valid upper/lower plan on the chosen days", () => {
    const { plan } = generatePlan(base);
    expect(plan.days.map((d) => d.weekday)).toEqual([0, 1, 3, 4]);
    expect(plan.days[0].name).toMatch(/Upper/);
    expect(checkPlanConstraints(plan, { library: byId, equipment: base.equipment, excludedExerciseIds: [] })).toEqual([]);
  });
  it("orders compounds before isolation", () => {
    const { plan } = generatePlan(base);
    for (const d of plan.days) {
      const types = d.exercises.map((e) => byId.get(e.exerciseId)!.movementType).filter((t) => t !== "cardio");
      expect(types[0]).toBe("compound");
    }
  });
  it("never uses unavailable equipment", () => {
    const { plan } = generatePlan({ ...base, equipment: ["dumbbells"], daysPerWeek: 3, availableDays: [0, 2, 4] });
    for (const d of plan.days) for (const e of d.exercises) {
      expect(byId.get(e.exerciseId)!.equipment.every((q) => q === "dumbbells")).toBe(true);
    }
  });
  it("respects excluded exercises and fits the session length", () => {
    const { plan } = generatePlan({ ...base, excludedExerciseIds: ["barbell-bench-press", "back-squat"], sessionMinutes: 30 });
    const ids = plan.days.flatMap((d) => d.exercises.map((e) => e.exerciseId));
    expect(ids).not.toContain("barbell-bench-press");
    expect(ids).not.toContain("back-squat");
    expect(Math.max(...plan.days.map((d) => d.exercises.length))).toBeLessThanOrEqual(5);
  });
  it("spreads training days for recovery", () => {
    expect(pickWeekdays([0, 1, 2, 3, 4, 5, 6], 3)).toEqual([0, 2, 4]);
    expect(pickWeekdays([0, 1, 2, 3, 4, 5, 6], 7).length).toBe(7);
  });
  it("keeps a rest day when 7 days are requested", () => {
    const { plan, warnings } = generatePlan({ ...base, daysPerWeek: 7, availableDays: [0, 1, 2, 3, 4, 5, 6] });
    expect(plan.days).toHaveLength(6);
    expect(warnings.join(" ")).toMatch(/rest day/);
  });
  it("constraint checker rejects equipment violations", () => {
    const { plan } = generatePlan(base);
    expect(checkPlanConstraints(plan, { library: byId, equipment: ["bands"], excludedExerciseIds: [] }).length).toBeGreaterThan(0);
  });
});

import { computeChallenge } from "@/lib/engines/challenge";
describe("20-week challenge", () => {
  // 2026-10-14 is a Wednesday → week 1 starts Monday 2026-10-12
  const five = (monday: string) => ["0", "1", "2", "3", "4"].map((d) => `${monday.slice(0, 8)}${String(Number(monday.slice(8)) + Number(d)).padStart(2, "0")}`);
  it("starts on the Monday of the join week and spans 20 weeks", () => {
    const c = computeChallenge({ joinedOn: "2026-10-14", today: "2026-10-14", workoutDates: [] });
    expect(c.weeks).toHaveLength(20);
    expect(c.weeks[0]).toMatchObject({ index: 1, start: "2026-10-12", end: "2026-10-18", status: "current" });
    expect(c.weeks[19].end).toBe("2027-02-28");
    expect(c.weeks[1].status).toBe("upcoming");
  });
  it("ticks a week at 5 workouts, marks past weeks below 5 as missed", () => {
    const c = computeChallenge({ joinedOn: "2026-10-12", today: "2026-10-28", workoutDates: [...five("2026-10-12"), "2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-26"] });
    expect(c.weeks[0]).toMatchObject({ count: 5, status: "complete" });
    expect(c.weeks[1]).toMatchObject({ count: 4, status: "missed" });
    expect(c.weeks[2]).toMatchObject({ count: 1, status: "current" });
    expect(c.completed).toBe(1);
    expect(c.missed).toBe(1);
  });
  it("counts the current week as complete as soon as it hits 5, and more than 5 still counts once", () => {
    const c = computeChallenge({ joinedOn: "2026-10-12", today: "2026-10-16", workoutDates: [...five("2026-10-12"), "2026-10-16"] });
    expect(c.weeks[0]).toMatchObject({ count: 6, status: "complete" });
    expect(c.completed).toBe(1);
  });
  it("ignores workouts outside the 20 weeks and reports finished/perfect", () => {
    const dates: string[] = [];
    for (let w = 0; w < 20; w++) {
      const d = new Date(Date.UTC(2026, 9, 12 + w * 7));
      for (let k = 0; k < 5; k++) dates.push(new Date(+d + k * 86400_000).toISOString().slice(0, 10));
    }
    const c = computeChallenge({ joinedOn: "2026-10-12", today: "2027-03-10", workoutDates: [...dates, "2027-03-02"] });
    expect(c).toMatchObject({ completed: 20, perfect: true, finished: true, current: null });
  });
});
