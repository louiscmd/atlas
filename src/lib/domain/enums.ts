// Single source of truth for enumerated values stored as strings in the DB.
import { z } from "zod/v4";

export const EXPERIENCE = [
  { key: "complete_beginner", label: "Complete beginner", hint: "New to structured training" },
  { key: "beginner", label: "Beginner", hint: "Know the basics, still learning lifts" },
  { key: "intermediate", label: "Intermediate", hint: "Train consistently, comfortable with compounds" },
  { key: "advanced", label: "Advanced", hint: "Years of structured, progressive training" },
] as const;

export const TRAINING_HISTORY = [
  { key: "lt_3m", label: "Less than 3 months" },
  { key: "3_12m", label: "3–12 months" },
  { key: "1_2y", label: "1–2 years" },
  { key: "2y_plus", label: "2+ years" },
] as const;

export const GOALS = [
  { key: "build_muscle", label: "Build muscle" },
  { key: "lose_fat", label: "Lose fat" },
  { key: "maintain", label: "Maintain weight" },
  { key: "get_stronger", label: "Get stronger" },
  { key: "athletic", label: "Improve athletic performance" },
  { key: "endurance", label: "Improve endurance" },
  { key: "general", label: "General fitness" },
  { key: "recomp", label: "Body recomposition" },
] as const;

export const MUSCLES = [
  { key: "chest", label: "Chest" },
  { key: "back", label: "Back" },
  { key: "shoulders", label: "Shoulders" },
  { key: "biceps", label: "Biceps" },
  { key: "triceps", label: "Triceps" },
  { key: "forearms", label: "Forearms" },
  { key: "abs", label: "Abs" },
  { key: "glutes", label: "Glutes" },
  { key: "quads", label: "Quads" },
  { key: "hamstrings", label: "Hamstrings" },
  { key: "calves", label: "Calves" },
] as const;

export const SESSION_LENGTHS = [
  { key: "20_30", label: "20–30 min", minutes: 30 },
  { key: "30_45", label: "30–45 min", minutes: 45 },
  { key: "45_60", label: "45–60 min", minutes: 60 },
  { key: "60_90", label: "60–90 min", minutes: 80 },
  { key: "90_plus", label: "90+ min", minutes: 100 },
] as const;

export const LOCATIONS = [
  { key: "gym", label: "Commercial gym" },
  { key: "home", label: "Home" },
  { key: "both", label: "Both" },
  { key: "outdoor", label: "Outdoor" },
] as const;

export const EQUIPMENT = [
  { key: "barbell", label: "Barbell" },
  { key: "dumbbells", label: "Dumbbells" },
  { key: "bench", label: "Bench" },
  { key: "squat_rack", label: "Squat rack" },
  { key: "cable", label: "Cable machine" },
  { key: "smith", label: "Smith machine" },
  { key: "machines", label: "Machines" },
  { key: "pullup_bar", label: "Pull-up bar" },
  { key: "bands", label: "Resistance bands" },
  { key: "kettlebells", label: "Kettlebells" },
  { key: "cardio", label: "Cardio equipment" },
  { key: "bodyweight", label: "Bodyweight only" },
] as const;

export const GYM_DEFAULT_EQUIPMENT = EQUIPMENT.map((e) => e.key);
export const HOME_DEFAULT_EQUIPMENT = ["dumbbells", "bench", "pullup_bar", "bands", "bodyweight"];

export const CATEGORIES = [
  { key: "chest", label: "Chest" },
  { key: "back", label: "Back" },
  { key: "shoulders", label: "Shoulders" },
  { key: "biceps", label: "Biceps" },
  { key: "triceps", label: "Triceps" },
  { key: "legs", label: "Legs" },
  { key: "glutes", label: "Glutes" },
  { key: "abs", label: "Abs" },
  { key: "calves", label: "Calves" },
  { key: "full_body", label: "Full body" },
  { key: "cardio", label: "Cardio" },
  { key: "mobility", label: "Mobility" },
] as const;

export const DIFFICULTY = ["beginner", "intermediate", "advanced"] as const;
export const MOVEMENT_TYPES = ["compound", "isolation", "cardio", "mobility"] as const;

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export const WEEKDAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export const ACTIVITY_LEVELS = [
  { key: "sedentary", label: "Mostly sitting", factor: 1.2 },
  { key: "light", label: "Lightly active", factor: 1.375 },
  { key: "moderate", label: "Moderately active", factor: 1.55 },
  { key: "active", label: "Very active", factor: 1.725 },
  { key: "very_active", label: "Extremely active", factor: 1.9 },
] as const;

export const MEAL_TYPES = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snack", label: "Snacks" },
  { key: "supplement", label: "Supplements" },
] as const;

export const MEASUREMENT_TYPES = [
  { key: "waist", label: "Waist" },
  { key: "chest", label: "Chest" },
  { key: "arm", label: "Arm" },
  { key: "thigh", label: "Thigh" },
  { key: "calf", label: "Calf" },
  { key: "hips", label: "Hips" },
  { key: "neck", label: "Neck" },
] as const;

export const NOTIFICATION_CATEGORIES = [
  { key: "workout_reminder", label: "Workout reminders", example: "Your workout starts in 30 minutes." },
  { key: "workout_ready", label: "Plan ready", example: "Your workout is ready." },
  { key: "pr", label: "Personal records", example: "You hit a new PR." },
  { key: "protein", label: "Protein nudges", example: "You are close to your protein target." },
  { key: "weekly_report", label: "Weekly report", example: "Your weekly report is ready." },
] as const;

export const PROGRAM_CATEGORIES = [
  { key: "beginner", label: "Beginner" },
  { key: "hypertrophy", label: "Hypertrophy" },
  { key: "strength", label: "Strength" },
  { key: "fat_loss", label: "Fat loss" },
  { key: "home", label: "Home" },
  { key: "athletic", label: "Athletic" },
] as const;

type Keyed = readonly { key: string }[];
export const keys = <T extends Keyed>(list: T) => list.map((x) => x.key) as [T[number]["key"], ...T[number]["key"][]];
export const labelOf = (list: readonly { key: string; label: string }[], key?: string | null) =>
  list.find((x) => x.key === key)?.label ?? key ?? "";

export const zGoal = z.enum(keys(GOALS));
export const zMuscle = z.enum(keys(MUSCLES));
export const zEquipment = z.enum(keys(EQUIPMENT));
export const zExperience = z.enum(keys(EXPERIENCE));
export const zMealType = z.enum(keys(MEAL_TYPES));

export type GoalKey = z.infer<typeof zGoal>;
export type MuscleKey = z.infer<typeof zMuscle>;
export type EquipmentKey = z.infer<typeof zEquipment>;
export type MealTypeKey = z.infer<typeof zMealType>;
