// Structured schemas shared by AI services, engines and API boundaries.
// Every AI output is parsed with one of these before touching the database.
import { z } from "zod/v4";

const int = (min: number, max: number) => z.number().int().min(min).max(max);

// ───────── Workout plan ─────────
export const PlanExerciseSchema = z.object({
  exerciseId: z.string().min(1),
  order: int(0, 30),
  sets: int(1, 8),
  repMin: int(1, 60),
  repMax: int(1, 60),
  restSec: int(0, 600),
  rirTarget: int(0, 5).nullable(),
  tempo: z.string().max(12).nullable().optional(),
  notes: z.string().max(200).nullable().optional(),
}).refine((x) => x.repMin <= x.repMax, { message: "repMin must be ≤ repMax" });

export const PlanDaySchema = z.object({
  weekday: int(0, 6),
  name: z.string().min(1).max(60),
  focus: z.string().max(80),
  warmup: z.string().max(300),
  exercises: z.array(PlanExerciseSchema).min(1).max(12),
});

export const WorkoutPlanSchema = z.object({
  name: z.string().min(1).max(80),
  goal: z.string().max(80),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  sessionMinutes: int(15, 150),
  rationale: z.string().max(1200),
  progression: z.string().max(600),
  days: z.array(PlanDaySchema).min(1).max(7),
}).superRefine((plan, ctx) => {
  const weekdays = plan.days.map((d) => d.weekday);
  if (new Set(weekdays).size !== weekdays.length) ctx.addIssue({ code: "custom", message: "Two workouts on the same weekday" });
  for (const d of plan.days) {
    const sets = d.exercises.reduce((s, e) => s + e.sets, 0);
    if (sets > 30) ctx.addIssue({ code: "custom", message: `${d.name}: ${sets} sets exceeds the safe session limit (30)` });
  }
});
export type WorkoutPlanDraft = z.infer<typeof WorkoutPlanSchema>;

// ───────── Imported workout (parser output) ─────────
export const ParsedExerciseSchema = z.object({
  rawText: z.string().max(200),
  exerciseId: z.string().nullable(), // null = not matched to the library, user must pick
  name: z.string().max(100),
  sets: int(1, 10),
  repMin: int(1, 100),
  repMax: int(1, 100),
  weightKg: z.number().min(0).max(500).nullable(),
  notes: z.string().max(200).nullable(),
});
export const ParsedDaySchema = z.object({
  weekday: int(0, 6).nullable(),
  name: z.string().max(60),
  exercises: z.array(ParsedExerciseSchema).max(20),
});
export const ParsedWorkoutSchema = z.object({
  days: z.array(ParsedDaySchema).min(1).max(7),
  warnings: z.array(z.string().max(200)).max(20),
});
export type ParsedWorkout = z.infer<typeof ParsedWorkoutSchema>;

// ───────── Food vision ─────────
export const Confidence = z.enum(["low", "medium", "high"]);
export const FoodScanItemSchema = z.object({
  name: z.string().min(1).max(80),
  grams: z.number().min(1).max(2000),
  preparation: z.string().max(60).nullable(),
  kcalPer100: z.number().min(0).max(900),
  proteinPer100: z.number().min(0).max(100),
  carbsPer100: z.number().min(0).max(100),
  fatPer100: z.number().min(0).max(100),
  fiberPer100: z.number().min(0).max(60).nullable(),
  confidence: Confidence,
});
export const FoodScanResultSchema = z.object({
  isFood: z.boolean(),
  title: z.string().max(80),
  confidence: Confidence,
  notes: z.string().max(300).nullable(),
  items: z.array(FoodScanItemSchema).max(15),
});
export type FoodScanResult = z.infer<typeof FoodScanResultSchema>;

export const NutritionLabelSchema = z.object({
  isLabel: z.boolean(),
  productName: z.string().max(80).nullable(),
  servingSizeText: z.string().max(60),
  servingGrams: z.number().min(0).max(2000).nullable(),
  calories: z.number().min(0).max(3000),
  protein: z.number().min(0).max(300),
  carbs: z.number().min(0).max(300),
  fat: z.number().min(0).max(300),
  fiber: z.number().min(0).max(100).nullable(),
  sugar: z.number().min(0).max(300).nullable(),
  sodiumMg: z.number().min(0).max(10000).nullable(),
  satFat: z.number().min(0).max(100).nullable(),
  confidence: Confidence,
});
export type NutritionLabel = z.infer<typeof NutritionLabelSchema>;

// ───────── Nutrition assistant ─────────
export const MealSuggestionSchema = z.object({
  reply: z.string().max(1200),
  suggestions: z.array(z.object({
    name: z.string().max(80),
    description: z.string().max(240),
    calories: z.number().min(0).max(2500),
    protein: z.number().min(0).max(250),
    carbs: z.number().min(0).max(400),
    fat: z.number().min(0).max(200),
  })).max(4),
});
export type MealSuggestion = z.infer<typeof MealSuggestionSchema>;

// ───────── Coach ─────────
export const CoachSummarySchema = z.object({
  headline: z.string().max(140),
  wentWell: z.array(z.string().max(200)).max(5),
  toImprove: z.array(z.string().max(200)).max(5),
  nextWeek: z.array(z.string().max(200)).max(5),
  insufficientData: z.boolean(),
});
export type CoachSummary = z.infer<typeof CoachSummarySchema>;
