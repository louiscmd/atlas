import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import { deleteUserAccount, saveOnboarding } from "@/lib/server/services/profile";
import * as plans from "@/lib/server/services/plans";
import * as workouts from "@/lib/server/services/workouts";
import * as nutrition from "@/lib/server/services/nutrition";
import * as progress from "@/lib/server/services/progress";
import { getAlternativesForUser, getExercisePerformance, getExerciseDetail, getLibrary, getUserLibrary } from "@/lib/server/services/exercises";
import { computeWeeklyMetrics, currentWeekStart } from "@/lib/server/services/reports";
import { rulesCoach } from "@/lib/ai/services/coach";
import { parseRoutine, buildWeeklyPlan } from "@/lib/ai/services/workoutPlanner";
import { runStructured } from "@/lib/ai/client";
import { PROMPTS } from "@/lib/ai/prompts";
import { CoachSummarySchema } from "@/lib/domain/schemas";
import { hashPassword, verifyPassword, issueAuthToken, consumeAuthToken } from "@/lib/server/auth";
import { addDays, localDate } from "@/lib/dates";
import { getChallenge } from "@/lib/server/services/progress";
import { readStored } from "@/lib/server/storage";

const onboarding = (over: Partial<Parameters<typeof saveOnboarding>[1]> = {}) => ({
  firstName: "Test", age: 30, sex: "male" as const, heightCm: 180, weightKg: 80, unitSystem: "metric" as const, timezone: "UTC", country: null,
  experience: "intermediate" as const, trainingHistory: "1_2y" as const, primaryGoal: "build_muscle" as const, secondaryGoal: null, goalWeightKg: null,
  musclePriorities: ["shoulders" as const], daysPerWeek: 4, sessionLength: "45_60" as const, availableDays: [0, 1, 3, 4], trainingLocation: "gym" as const,
  equipment: ["barbell", "dumbbells", "bench", "squat_rack", "cable", "machines", "pullup_bar"] as never, activityLevel: "moderate" as const,
  injuries: null, cannotDo: [], dislikes: [], prioritize: [], ...over,
});

let A: string, B: string;
const today = localDate("UTC");

beforeAll(async () => {
  A = (await db.user.create({ data: { email: `a-${Date.now()}@forma.test` } })).id;
  B = (await db.user.create({ data: { email: `b-${Date.now()}@forma.test` } })).id;
  await saveOnboarding(A, onboarding());
  await saveOnboarding(B, onboarding({ equipment: ["dumbbells", "bench"] as never }));
});

describe("onboarding", () => {
  it("creates profile, goals, equipment, targets and starting weight", async () => {
    const [p, g, eq, t, w] = await Promise.all([
      db.userProfile.findUnique({ where: { userId: A } }), db.userGoals.findUnique({ where: { userId: A } }),
      db.userEquipment.count({ where: { userId: A } }), nutrition.getTarget(A), db.progressMeasurement.count({ where: { userId: A, type: "weight" } }),
    ]);
    expect(p?.onboardingCompletedAt).toBeTruthy();
    expect(g?.daysPerWeek).toBe(4);
    expect(eq).toBe(7);
    expect(t?.calories).toBeGreaterThan(2000);
    expect(w).toBe(1);
  });
});

describe("programs and plan customization", () => {
  it("starting a program creates a user copy and never modifies the template", async () => {
    const before = await db.programExercise.findMany({ where: { day: { program: { slug: "upper-lower-hypertrophy-4" } } }, orderBy: { id: "asc" } });
    const plan = await plans.startProgram(A, "upper-lower-hypertrophy-4");
    const full = await plans.getPlan(A, plan.id);
    expect(full.days).toHaveLength(4);
    expect(full.isActive).toBe(true);
    const ex = full.days[0].exercises[0];
    await plans.updatePlanExercise(A, ex.id, { sets: 5, repMin: 3, repMax: 5 });
    await plans.removePlanExercise(A, full.days[0].exercises[1].id);
    await plans.duplicateDay(A, full.days[0].id);
    await plans.renamePlan(A, plan.id, "My Upper Lower");
    const after = await db.programExercise.findMany({ where: { day: { program: { slug: "upper-lower-hypertrophy-4" } } }, orderBy: { id: "asc" } });
    expect(after).toEqual(before);
    const edited = await plans.getPlan(A, plan.id);
    expect(edited.name).toBe("My Upper Lower");
    expect(edited.days).toHaveLength(5);
    expect(edited.days[0].exercises[0]).toMatchObject({ sets: 5, repMin: 3, repMax: 5 });
  });

  it("rejects scheduling two days on the same weekday", async () => {
    const plan = await plans.getActivePlan(A);
    await expect(plans.updateDay(A, plan!.days[1].id, { weekday: plan!.days[0].weekday })).rejects.toThrow(/already on that day/);
  });

  it("replacement respects the user's equipment", async () => {
    const bench = await db.exercise.findUniqueOrThrow({ where: { slug: "barbell-bench-press" } });
    const alts = await getAlternativesForUser(B, bench.id);
    expect(alts.length).toBeGreaterThan(0);
    expect(alts[0].slug).toBe("dumbbell-bench-press");
    expect(alts.every((a) => a.equipment.every((q) => ["dumbbells", "bench", "bodyweight"].includes(q)))).toBe(true);
  });
});

describe("workout sessions", () => {
  let sessionId: string;
  it("starts a session snapshot from a plan day", async () => {
    const plan = await plans.getActivePlan(A);
    const s = await workouts.startSession(A, plan!.days[0].id);
    sessionId = s.id;
    const full = await workouts.getSession(A, s.id);
    expect(full.exercises.length).toBe(plan!.days[0].exercises.length);
    expect(full.exercises[0].recommendation).toContain("start");
    // a second start returns the same in-progress session
    expect((await workouts.startSession(A, plan!.days[1].id)).id).toBe(s.id);
  });

  it("logs sets idempotently by clientId", async () => {
    const full = await workouts.getSession(A, sessionId);
    const se = full.exercises[0];
    await workouts.logSet(A, { clientId: "client-set-0001", sessionExerciseId: se.id, setNumber: 1, weightKg: 60, reps: 5, rir: 2 });
    await workouts.logSet(A, { clientId: "client-set-0001", sessionExerciseId: se.id, setNumber: 1, weightKg: 62.5, reps: 5, rir: 2 }); // retry/edit
    const sets = await db.workoutSet.findMany({ where: { sessionExerciseId: se.id } });
    expect(sets).toHaveLength(1);
    expect(sets[0].weightKg).toBe(62.5);
  });

  it("replacing mid-exercise keeps completed sets on the original", async () => {
    const full = await workouts.getSession(A, sessionId);
    const se = full.exercises[0];
    const db_ = await db.exercise.findUniqueOrThrow({ where: { slug: "dumbbell-bench-press" } });
    await workouts.replaceSessionExercise(A, se.id, db_.id, false);
    const after = await workouts.getSession(A, sessionId);
    expect(after.exercises[0].exerciseId).toBe(se.exerciseId);
    expect(after.exercises[0].sets).toHaveLength(1);
    expect(after.exercises[1]).toMatchObject({ exerciseId: db_.id, replacedFrom: se.exerciseName });
  });

  it("completes a session and detects PRs on the next one", async () => {
    await workouts.completeSession(A, sessionId);
    const first = await workouts.getSession(A, sessionId);
    expect(first.status).toBe("completed");
    expect(first.records).toHaveLength(0); // first exposure sets a baseline
    const plan = await plans.getActivePlan(A);
    const s2 = await workouts.startSession(A, plan!.days[0].id);
    const se = (await workouts.getSession(A, s2.id)).exercises[0];
    expect(JSON.parse(se.recommendation!).action).not.toBe("start");
    await workouts.logSet(A, { clientId: "client-set-0002", sessionExerciseId: se.id, setNumber: 1, weightKg: 70, reps: 5, rir: 1 });
    const { prs } = await workouts.completeSession(A, s2.id);
    expect(prs.map((p) => p.type)).toContain("heaviest_weight");
    const perf = await getExercisePerformance(A, se.exerciseId);
    expect(perf?.best.weightKg).toBe(70);
    const notif = await db.notification.findFirst({ where: { userId: A, category: "pr" } });
    expect(notif).toBeTruthy();
  });

  it("refuses to finish an empty workout", async () => {
    const s = await workouts.startSession(A, null);
    await expect(workouts.completeSession(A, s.id)).rejects.toThrow(/at least one set/);
    await workouts.discardSession(A, s.id);
  });
});

describe("nutrition", () => {
  it("logs foods with scaled nutrition snapshots", async () => {
    const egg = await db.food.findFirstOrThrow({ where: { name: "Egg, whole, large" } });
    const log = await nutrition.logFood(A, { foodId: egg.id, servings: 3, mealType: "breakfast", date: today });
    expect(log.calories).toBe(216);
    expect(log.isEstimate).toBe(false);
    const day = await nutrition.getDay(A, today);
    expect(day.totals.protein).toBeCloseTo(18.9, 1);
  });

  it("saves meals and logs them in one step", async () => {
    const [egg, bread, avo] = await Promise.all(["Egg, whole, large", "White bread", "Avocado"].map((n) => db.food.findFirstOrThrow({ where: { name: n } })));
    const mealId = await nutrition.saveMeal(A, { name: "My Breakfast", items: [{ foodId: egg.id, servings: 3 }, { foodId: bread.id, servings: 2 }, { foodId: avo.id, servings: 1 }] });
    const meals = await nutrition.listMeals(A);
    expect(Math.round(meals.find((m) => m.id === mealId)!.totals.calories)).toBe(216 + 150 + 160);
    await nutrition.logMeal(A, mealId as string, "breakfast", today);
    expect((await nutrition.getDay(A, today)).logs.length).toBe(4);
  });

  it("logs corrected food scans as estimates", async () => {
    const scan = await db.foodScan.create({ data: { userId: A, kind: "photo", status: "completed", title: "Bowl", confidence: "medium" } });
    await nutrition.logScan(A, scan.id, { title: "Chicken bowl", mealType: "lunch", date: today, items: [
      { name: "Chicken", grams: 200, preparation: "grilled", kcalPer100: 165, proteinPer100: 31, carbsPer100: 0, fatPer100: 3.6, fiberPer100: null, confidence: "medium" },
      { name: "Rice", grams: 250, preparation: null, kcalPer100: 130, proteinPer100: 2.7, carbsPer100: 28, fatPer100: 0.3, fiberPer100: null, confidence: "medium" },
    ] });
    const day = await nutrition.getDay(A, today);
    const scanned = day.logs.filter((l) => l.scanId === scan.id);
    expect(scanned).toHaveLength(2);
    expect(scanned.every((l) => l.isEstimate)).toBe(true);
    expect(scanned.reduce((s, l) => s + l.calories, 0)).toBe(330 + 325);
    expect(day.hasEstimates).toBe(true);
  });

  it("food search is case-insensitive", async () => {
    expect((await nutrition.searchFoods(A, "CHICKEN breast")).map((f) => f.name)).toContain("Chicken breast, cooked");
  });

  it("tracks water and supports undo", async () => {
    await nutrition.addWater(A, today, 500);
    await nutrition.addWater(A, today, 250);
    await nutrition.undoWater(A, today);
    expect((await nutrition.getDay(A, today)).waterMl).toBe(500);
  });
});

describe("data isolation — user B can never touch user A's data", () => {
  it("plans, days and exercises", async () => {
    const plan = await plans.getActivePlan(A);
    await expect(plans.getPlan(B, plan!.id)).rejects.toBeInstanceOf(plans.NotFoundError);
    await expect(plans.activatePlan(B, plan!.id)).rejects.toBeInstanceOf(plans.NotFoundError);
    await expect(plans.deleteDay(B, plan!.days[0].id)).rejects.toBeInstanceOf(plans.NotFoundError);
    await expect(plans.updatePlanExercise(B, plan!.days[0].exercises[0].id, { sets: 1 })).rejects.toBeInstanceOf(plans.NotFoundError);
    await expect(plans.replacePlanExercise(B, plan!.days[0].exercises[0].id, plan!.days[0].exercises[0].exerciseId)).rejects.toBeInstanceOf(plans.NotFoundError);
    expect(await plans.getActivePlan(B)).toBeNull();
  });

  it("workout sessions and sets", async () => {
    const s = await db.workoutSession.findFirstOrThrow({ where: { userId: A }, include: { exercises: true, sets: true } });
    await expect(workouts.getSession(B, s.id)).rejects.toBeInstanceOf(plans.NotFoundError);
    await expect(workouts.logSet(B, { clientId: "intruder-0001", sessionExerciseId: s.exercises[0].id, setNumber: 9, weightKg: 1, reps: 1 })).rejects.toBeInstanceOf(plans.NotFoundError);
    await expect(workouts.deleteSet(B, s.sets[0].id)).rejects.toBeInstanceOf(plans.NotFoundError);
    // reusing another user's clientId must not overwrite their set
    const bSession = await workouts.startSession(B, null);
    const bench = await db.exercise.findUniqueOrThrow({ where: { slug: "dumbbell-bench-press" } });
    const bse = await workouts.addExerciseToSession(B, bSession.id, bench.id);
    await expect(workouts.logSet(B, { clientId: s.sets[0].clientId, sessionExerciseId: bse.id, setNumber: 1, weightKg: 1, reps: 1 })).rejects.toBeInstanceOf(plans.NotFoundError);
    expect((await db.workoutSet.findUniqueOrThrow({ where: { id: s.sets[0].id } })).userId).toBe(A);
    expect(await workouts.listHistory(B)).toHaveLength(0);
  });

  it("nutrition logs, meals, scans and custom foods", async () => {
    const log = await db.nutritionLog.findFirstOrThrow({ where: { userId: A } });
    await expect(nutrition.deleteLog(B, log.id)).rejects.toBeInstanceOf(plans.NotFoundError);
    await expect(nutrition.updateLog(B, log.id, 2)).rejects.toBeInstanceOf(plans.NotFoundError);
    const meal = await db.meal.findFirstOrThrow({ where: { userId: A } });
    await expect(nutrition.deleteMeal(B, meal.id)).rejects.toBeInstanceOf(plans.NotFoundError);
    await expect(nutrition.logMeal(B, meal.id, "lunch", today)).rejects.toBeInstanceOf(plans.NotFoundError);
    const scan = await db.foodScan.findFirstOrThrow({ where: { userId: A } });
    await expect(nutrition.getScan(B, scan.id)).rejects.toBeInstanceOf(plans.NotFoundError);
    const secret = await nutrition.createCustomFood(A, { name: "Grandma's secret stew", servingSize: 300, servingUnit: "g", calories: 400, protein: 30, carbs: 20, fat: 18 });
    expect(await nutrition.searchFoods(B, "secret stew")).toHaveLength(0);
    expect(await nutrition.searchFoods(A, "secret stew")).toHaveLength(1);
    await expect(nutrition.logFood(B, { foodId: secret.id, servings: 1, mealType: "lunch", date: today })).rejects.toBeInstanceOf(plans.NotFoundError);
    await expect(nutrition.toggleFavorite(B, secret.id)).rejects.toBeInstanceOf(plans.NotFoundError);
    expect((await nutrition.getDay(B, today)).logs).toHaveLength(0);
  });

  it("measurements and photos", async () => {
    const m = await progress.addMeasurement(A, "waist", 82);
    await expect(progress.deleteMeasurement(B, m.id)).rejects.toBeInstanceOf(plans.NotFoundError);
    const photo = await db.progressPhoto.create({ data: { userId: A, pose: "front", storageKey: `photos-${A}/test.jpg`, mimeType: "image/jpeg" } });
    await expect(progress.getPhotoFile(B, photo.id)).rejects.toBeInstanceOf(plans.NotFoundError);
    await expect(progress.deletePhoto(B, photo.id)).rejects.toBeInstanceOf(plans.NotFoundError);
    expect(await progress.listPhotos(B)).toHaveLength(0);
    expect((await progress.weightSeries(B)).entries.every((e) => e.userId === B)).toBe(true);
  });

  it("stores photos privately in the database and serves the exact bytes back", async () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Array(64).fill(7)]);
    const photo = await progress.addPhoto(A, jpeg, "image/jpeg", "side", null);
    expect((await readStored((await progress.getPhotoFile(A, photo.id)).storageKey)).equals(jpeg)).toBe(true);
    await progress.deletePhoto(A, photo.id);
    expect(await db.storedFile.count({ where: { key: photo.storageKey } })).toBe(0);
  });

  it("account deletion cascades every user-owned row", async () => {
    const C = (await db.user.create({ data: { email: `c-${Date.now()}@forma.test` } })).id;
    await saveOnboarding(C, onboarding());
    await progress.addPhoto(C, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 6, 7, 8]), "image/jpeg", "front", null);
    await plans.startProgram(C, "beginner-full-body-3");
    await deleteUserAccount(C);
    const counts = await Promise.all([db.workoutPlan.count({ where: { userId: C } }), db.userProfile.count({ where: { userId: C } }), db.nutritionTarget.count({ where: { userId: C } }), db.progressMeasurement.count({ where: { userId: C } }), db.progressPhoto.count({ where: { userId: C } }), db.storedFile.count({ where: { key: { startsWith: `photos-${C}/` } } })]);
    expect(counts).toEqual([0, 0, 0, 0, 0, 0]);
  });
});

describe("custom exercises from imports", () => {
  let customId: string, customSlug: string;
  it("saves unmatched imported exercises as the user's own custom exercises", async () => {
    const plan = await plans.saveImportedPlan(A, { warnings: [], days: [{ weekday: 5, name: "Strongman", exercises: [
      { rawText: "zercher carry 3x20", exerciseId: null, name: "Zercher Carry", sets: 3, repMin: 20, repMax: 20, weightKg: null, notes: null },
      { rawText: "bench 3x8", exerciseId: (await db.exercise.findUniqueOrThrow({ where: { slug: "barbell-bench-press" } })).id, name: "Barbell Bench Press", sets: 3, repMin: 8, repMax: 8, weightKg: null, notes: null },
    ] }] }, "Saturday: zercher carry 3x20, bench 3x8", "Strongman import");
    const full = await plans.getPlan(A, plan.id);
    const custom = await db.exercise.findUniqueOrThrow({ where: { id: full.days[0].exercises[0].exerciseId } });
    customId = custom.id; customSlug = custom.slug;
    expect(custom).toMatchObject({ ownerId: A, name: "Zercher Carry", category: "custom", repMin: 20, repMax: 20 });
    expect((await getUserLibrary(A)).some((e) => e.id === customId)).toBe(true);
    expect((await getLibrary()).some((e) => e.id === customId)).toBe(false);
    expect((await getExerciseDetail(customSlug, A))?.isCustom).toBe(true);
  });

  it("reuses the same custom exercise on re-import (case-insensitive)", async () => {
    await plans.saveImportedPlan(A, { warnings: [], days: [{ weekday: null, name: "Again", exercises: [
      { rawText: "", exerciseId: null, name: "zercher   carry", sets: 2, repMin: 15, repMax: 15, weightKg: null, notes: null },
    ] }] }, "", "Again");
    expect(await db.exercise.count({ where: { ownerId: A, name: { equals: "Zercher Carry", mode: "insensitive" } } })).toBe(1);
    const parsed = await parseRoutine(A, "Monday: zercher carry 3x20");
    expect(parsed.data.days[0].exercises[0].exerciseId).toBe(customId);
  });

  it("is invisible and unusable for other users", async () => {
    expect((await getUserLibrary(B)).some((e) => e.id === customId)).toBe(false);
    expect(await getExerciseDetail(customSlug, B)).toBeNull();
    expect((await parseRoutine(B, "Monday: zercher carry 3x20")).data.days[0].exercises[0].exerciseId).toBeNull();
    const bPlan = await plans.startProgram(B, "dumbbell-home-3");
    const bDay = (await plans.getPlan(B, bPlan.id)).days[0];
    await expect(plans.addExerciseToDay(B, bDay.id, customId)).rejects.toBeInstanceOf(plans.NotFoundError);
    await expect(plans.replacePlanExercise(B, bDay.exercises[0].id, customId)).rejects.toBeInstanceOf(plans.NotFoundError);
    const s = await workouts.startSession(B, bDay.id);
    await expect(workouts.addExerciseToSession(B, s.id, customId)).rejects.toBeInstanceOf(plans.NotFoundError);
    const se = (await workouts.getSession(B, s.id)).exercises[0];
    await expect(workouts.replaceSessionExercise(B, se.id, customId, false)).rejects.toBeInstanceOf(plans.NotFoundError);
    await workouts.discardSession(B, s.id);
  });

  it("can be trained, logged and deleted with the account", async () => {
    const D = (await db.user.create({ data: { email: `d-${Date.now()}@forma.test` } })).id;
    await saveOnboarding(D, onboarding());
    const plan = await plans.saveImportedPlan(D, { warnings: [], days: [{ weekday: null, name: "Odd lifts", exercises: [
      { rawText: "", exerciseId: null, name: "Atlas Stone Load", sets: 3, repMin: 3, repMax: 5, weightKg: null, notes: null },
    ] }] }, "", "Odd lifts");
    const day = (await plans.getPlan(D, plan.id)).days[0];
    const s = await workouts.startSession(D, day.id);
    const se = (await workouts.getSession(D, s.id)).exercises[0];
    await workouts.logSet(D, { clientId: `d-set-${Date.now()}`, sessionExerciseId: se.id, setNumber: 1, weightKg: 100, reps: 3, rir: 2 });
    await workouts.completeSession(D, s.id);
    await deleteUserAccount(D);
    expect(await db.exercise.count({ where: { ownerId: D } })).toBe(0);
    expect(await db.workoutSet.count({ where: { userId: D } })).toBe(0);
  });
});

describe("changing a workout's date", () => {
  it("moves the session, its sets and PRs to the chosen day, keeping time of day", async () => {
    const s = await db.workoutSession.findFirstOrThrow({ where: { userId: A, status: "completed", sets: { some: {} } }, include: { sets: true } });
    const target = addDays(localDate("UTC", s.completedAt!), -3);
    const before = s.completedAt!.toISOString().slice(11);
    await workouts.changeSessionDate(A, s.id, target, "UTC");
    const after = await db.workoutSession.findUniqueOrThrow({ where: { id: s.id }, include: { sets: true } });
    expect(localDate("UTC", after.completedAt!)).toBe(target);
    expect(after.completedAt!.toISOString().slice(11)).toBe(before);
    expect(+after.completedAt! - +after.startedAt).toBe(+s.completedAt! - +s.startedAt);
    for (const set of after.sets) expect(localDate("UTC", set.completedAt)).toBe(target);
  });

  it("counts the moved workout in the earlier challenge week", async () => {
    const E = (await db.user.create({ data: { email: `e-${Date.now()}@forma.test` } })).id;
    await saveOnboarding(E, onboarding());
    await db.userProfile.update({ where: { userId: E }, data: { onboardingCompletedAt: new Date(Date.now() - 8 * 86400_000) } });
    const s = await workouts.startSession(E, null);
    const bench = await db.exercise.findUniqueOrThrow({ where: { slug: "push-up" } });
    const se = await workouts.addExerciseToSession(E, s.id, bench.id);
    await workouts.logSet(E, { clientId: `e-set-${Date.now()}`, sessionExerciseId: se.id, setNumber: 1, weightKg: 0, reps: 10 });
    await workouts.completeSession(E, s.id);
    const before = await getChallenge(E, "UTC");
    const cur = before.current!, prev = before.weeks[cur.index - 2];
    expect(cur.count).toBe(1);
    await workouts.changeSessionDate(E, s.id, prev.end, "UTC"); // e.g. Monday's workout → previous Sunday
    const after = await getChallenge(E, "UTC");
    expect(after.weeks[prev.index - 1].count).toBe(prev.count + 1);
    expect(after.weeks[cur.index - 1].count).toBe(0);
  });

  it("rejects future dates, unfinished workouts and other users", async () => {
    const s = await db.workoutSession.findFirstOrThrow({ where: { userId: A, status: "completed" } });
    await expect(workouts.changeSessionDate(A, s.id, addDays(localDate("UTC"), 1), "UTC")).rejects.toThrow(/future/);
    await expect(workouts.changeSessionDate(B, s.id, localDate("UTC"), "UTC")).rejects.toBeInstanceOf(plans.NotFoundError);
    const open = await workouts.startSession(B, null);
    await expect(workouts.changeSessionDate(B, open.id, localDate("UTC"), "UTC")).rejects.toThrow(/finished/);
    await workouts.discardSession(B, open.id);
  });
});

describe("weekly report", () => {
  it("computes metrics from real data and never invents facts", async () => {
    const m = await computeWeeklyMetrics(A, "UTC", currentWeekStart("UTC"));
    expect(m.workoutsCompleted).toBeGreaterThanOrEqual(1);
    expect(m.nutritionDaysLogged).toBe(1);
    const c = rulesCoach(m);
    expect(c.wentWell.join(" ")).toMatch(/workout/);
    const empty = rulesCoach({ ...m, workoutsCompleted: 0, nutritionDaysLogged: 0, prs: [], strengthUp: [] });
    expect(empty.insufficientData).toBe(true);
  });
});

describe("AI services without a key", () => {
  it("reports not_configured instead of pretending", async () => {
    const r = await runStructured({ service: "coach", prompt: PROMPTS.weeklyCoach, schema: CoachSummarySchema, content: [], userId: A });
    expect(r).toEqual({ ok: false, code: "not_configured" });
  });
  it("routine import falls back to the deterministic parser with a notice", async () => {
    const r = await parseRoutine(A, "Monday: bench 3x8, yoke walk 3x20");
    expect(r.source).toBe("rules");
    expect(r.data.days[0].exercises[0].exerciseId).toBeTruthy();
    expect(r.notice).toMatch(/isn't configured/);
  });
  it("weekly plan falls back to the rules engine and respects equipment", async () => {
    const r = await buildWeeklyPlan(B);
    expect(r.source).toBe("rules");
    const ids = r.data.days.flatMap((d) => d.exercises.map((e) => e.exerciseId));
    const exs = await db.exercise.findMany({ where: { id: { in: ids } } });
    expect(exs.every((e) => (e.equipment as string[]).every((q) => ["dumbbells", "bench"].includes(q)))).toBe(true);
  });
});

describe("auth primitives", () => {
  it("hashes passwords and verifies them", async () => {
    const h = await hashPassword("correct horse 1");
    expect(await verifyPassword("correct horse 1", h)).toBe(true);
    expect(await verifyPassword("wrong", h)).toBe(false);
    expect(await verifyPassword("anything", null)).toBe(false);
  });
  it("auth tokens are single-use and type-bound", async () => {
    const t = await issueAuthToken(A, "reset_password", 10);
    expect(await consumeAuthToken(t, "verify_email")).toBeNull();
    expect(await consumeAuthToken(t, "reset_password")).toBe(A);
    expect(await consumeAuthToken(t, "reset_password")).toBeNull();
    const stored = await db.authToken.findFirst({ where: { userId: A } });
    expect(stored?.tokenHash).not.toBe(t); // only the keyed hash is stored
  });
});
