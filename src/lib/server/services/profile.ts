import "server-only";
import { z } from "zod/v4";
import { db } from "../db";
import { estimateTargets } from "@/lib/engines/nutrition";
import { EQUIPMENT, GOALS, MUSCLES, EXPERIENCE, TRAINING_HISTORY, SESSION_LENGTHS, LOCATIONS, ACTIVITY_LEVELS, keys } from "@/lib/domain/enums";

export const OnboardingSchema = z.object({
  firstName: z.string().trim().min(1).max(40),
  age: z.number().int().min(13).max(100),
  sex: z.enum(["male", "female", "other"]),
  heightCm: z.number().min(120).max(230),
  weightKg: z.number().min(30).max(300),
  unitSystem: z.enum(["metric", "imperial"]),
  timezone: z.string().min(1).max(64),
  country: z.string().max(64).optional().nullable(),
  experience: z.enum(keys(EXPERIENCE)),
  trainingHistory: z.enum(keys(TRAINING_HISTORY)),
  primaryGoal: z.enum(keys(GOALS)),
  secondaryGoal: z.enum(keys(GOALS)).nullable(),
  goalWeightKg: z.number().min(30).max(300).nullable(),
  musclePriorities: z.array(z.enum(keys(MUSCLES))).max(11),
  daysPerWeek: z.number().int().min(1).max(7),
  sessionLength: z.enum(keys(SESSION_LENGTHS)),
  availableDays: z.array(z.number().int().min(0).max(6)).max(7),
  trainingLocation: z.enum(keys(LOCATIONS)),
  equipment: z.array(z.enum(keys(EQUIPMENT))).max(20),
  activityLevel: z.enum(keys(ACTIVITY_LEVELS)),
  injuries: z.string().max(500).optional().nullable(),
  cannotDo: z.array(z.string()).max(50),
  dislikes: z.array(z.string()).max(50),
  prioritize: z.array(z.string()).max(50),
});
export type OnboardingInput = z.infer<typeof OnboardingSchema>;

export async function getUserContext(userId: string) {
  const [profile, goals, equipment, preferences, restrictions] = await Promise.all([
    db.userProfile.findUnique({ where: { userId } }),
    db.userGoals.findUnique({ where: { userId } }),
    db.userEquipment.findMany({ where: { userId } }),
    db.userPreferences.findUnique({ where: { userId } }),
    db.userRestrictions.findMany({ where: { userId }, include: { exercise: { select: { id: true, name: true, slug: true } } } }),
  ]);
  const age = profile?.birthYear ? new Date().getFullYear() - profile.birthYear : 30;
  return {
    profile, goals, preferences, restrictions, age,
    equipment: equipment.map((e) => e.equipment),
    unit: (profile?.unitSystem ?? "metric") as "metric" | "imperial",
    tz: profile?.timezone ?? "UTC",
    excludedExerciseIds: restrictions.filter((r) => (r.type === "cannot_do" || r.type === "dislike") && r.exerciseId).map((r) => r.exerciseId!),
    preferredExerciseIds: restrictions.filter((r) => r.type === "prioritize" && r.exerciseId).map((r) => r.exerciseId!),
    musclePriorities: (goals?.musclePriorities as string[] | undefined) ?? [],
    availableDays: (goals?.availableDays as number[] | undefined) ?? [],
  };
}
export type UserContext = Awaited<ReturnType<typeof getUserContext>>;

async function validExerciseIds(ids: string[]) {
  if (!ids.length) return [];
  return (await db.exercise.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((e) => e.id);
}

export async function saveOnboarding(userId: string, input: OnboardingInput) {
  const birthYear = new Date().getFullYear() - input.age;
  const [cannot, dislike, prior] = await Promise.all([validExerciseIds(input.cannotDo), validExerciseIds(input.dislikes), validExerciseIds(input.prioritize)]);
  const targets = estimateTargets({ sex: input.sex, age: input.age, heightCm: input.heightCm, weightKg: input.weightKg, activityLevel: input.activityLevel, goal: input.primaryGoal });
  const equipment = input.equipment.length ? input.equipment : ["bodyweight"];

  await db.$transaction(async (tx) => {
    const profile = { firstName: input.firstName, birthYear, sex: input.sex, heightCm: input.heightCm, startWeightKg: input.weightKg, unitSystem: input.unitSystem, timezone: input.timezone, country: input.country ?? null, experience: input.experience, trainingHistory: input.trainingHistory, activityLevel: input.activityLevel, onboardingCompletedAt: new Date() };
    await tx.userProfile.upsert({ where: { userId }, create: { userId, ...profile }, update: profile });
    const goals = { primaryGoal: input.primaryGoal, secondaryGoal: input.secondaryGoal, goalWeightKg: input.goalWeightKg, musclePriorities: input.musclePriorities, daysPerWeek: input.daysPerWeek, sessionLength: input.sessionLength, availableDays: [...new Set(input.availableDays)].sort(), trainingLocation: input.trainingLocation };
    await tx.userGoals.upsert({ where: { userId }, create: { userId, ...goals }, update: goals });
    await tx.userEquipment.deleteMany({ where: { userId } });
    await tx.userEquipment.createMany({ data: equipment.map((e) => ({ userId, equipment: e })) });
    await tx.userRestrictions.deleteMany({ where: { userId } });
    await tx.userRestrictions.createMany({
      data: [
        ...(input.injuries?.trim() ? [{ userId, type: "injury", note: input.injuries.trim() }] : []),
        ...cannot.map((exerciseId) => ({ userId, type: "cannot_do", exerciseId })),
        ...dislike.map((exerciseId) => ({ userId, type: "dislike", exerciseId })),
        ...prior.map((exerciseId) => ({ userId, type: "prioritize", exerciseId })),
      ],
    });
    await tx.userPreferences.upsert({ where: { userId }, create: { userId, restByExercise: {}, notifications: {} }, update: {} });
    const hasTarget = await tx.nutritionTarget.count({ where: { userId } });
    if (!hasTarget) await tx.nutritionTarget.create({ data: { userId, calories: targets.calories, proteinG: targets.proteinG, carbsG: targets.carbsG, fatG: targets.fatG, fiberG: targets.fiberG, waterMl: targets.waterMl, maintenanceCalories: targets.maintenanceCalories } });
    const hasWeight = await tx.progressMeasurement.count({ where: { userId, type: "weight" } });
    if (!hasWeight) await tx.progressMeasurement.create({ data: { userId, type: "weight", value: input.weightKg } });
    await tx.subscription.upsert({ where: { userId }, create: { userId }, update: {} });
  });
}

export async function updateEquipment(userId: string, equipment: string[]) {
  const valid = equipment.filter((e) => EQUIPMENT.some((x) => x.key === e));
  await db.$transaction([
    db.userEquipment.deleteMany({ where: { userId } }),
    db.userEquipment.createMany({ data: (valid.length ? valid : ["bodyweight"]).map((e) => ({ userId, equipment: e })) }),
  ]);
}

export async function setRestriction(userId: string, exerciseId: string, type: "cannot_do" | "dislike" | "prioritize" | null) {
  await db.userRestrictions.deleteMany({ where: { userId, exerciseId } });
  if (type && (await db.exercise.count({ where: { id: exerciseId } }))) await db.userRestrictions.create({ data: { userId, exerciseId, type } });
}

export async function exportUserData(userId: string) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      email: true, createdAt: true, profile: true, goals: true, equipment: true, preferences: true, restrictions: true,
      plans: { include: { days: { include: { exercises: true } } } },
      workoutSessions: { include: { exercises: true, sets: true } },
      records: true, measurements: true,
      photos: { select: { id: true, pose: true, takenAt: true, bodyWeightKg: true, note: true } },
      nutritionTargets: true, customFoods: { include: { nutrition: true } }, meals: { include: { items: true } },
      nutritionLogs: true, waterLogs: true, weeklyReports: true, foodScans: { include: { items: true } },
    },
  });
  return { exportedAt: new Date().toISOString(), note: "Progress photos are listed by metadata; download images individually from the app.", ...user };
}

/** Permanently deletes a user, every row they own (FK cascades) and their stored files. */
export async function deleteUserAccount(userId: string) {
  await db.$transaction([
    db.storedFile.deleteMany({ where: { key: { startsWith: `photos-${userId}/` } } }),
    db.user.delete({ where: { id: userId } }),
  ]);
}
