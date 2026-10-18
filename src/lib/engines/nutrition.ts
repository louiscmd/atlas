// Energy & macro estimation. All outputs are ESTIMATES and are labelled as such in the UI.
import { ACTIVITY_LEVELS } from "@/lib/domain/enums";

export type EnergyInput = {
  sex: "male" | "female" | "other" | null | undefined;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: string;
  goal: string;
  trainingDaysPerWeek?: number;
};

export type MacroTargets = {
  maintenanceCalories: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  waterMl: number;
  explanation: string[];
};

/** Mifflin–St Jeor resting energy expenditure. "other" uses the midpoint of both equations. */
export function bmr({ sex, age, heightCm, weightKg }: Pick<EnergyInput, "sex" | "age" | "heightCm" | "weightKg">) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (sex === "male") return base + 5;
  if (sex === "female") return base - 161;
  return base - 78;
}

export function activityFactor(level: string) {
  return ACTIVITY_LEVELS.find((a) => a.key === level)?.factor ?? 1.55;
}

const round = (n: number, to = 1) => Math.round(n / to) * to;

// Goal adjustments are deliberately conservative: never more than a 20% deficit.
const GOAL_ADJUST: Record<string, { pct: number; proteinPerKg: number; label: string }> = {
  lose_fat: { pct: -0.2, proteinPerKg: 2.0, label: "a moderate ~20% deficit for steady fat loss" },
  recomp: { pct: -0.1, proteinPerKg: 2.0, label: "a small ~10% deficit for recomposition" },
  build_muscle: { pct: 0.1, proteinPerKg: 1.8, label: "a small ~10% surplus to support muscle gain" },
  get_stronger: { pct: 0.05, proteinPerKg: 1.8, label: "a slight surplus to support strength" },
  maintain: { pct: 0, proteinPerKg: 1.6, label: "maintenance calories" },
  athletic: { pct: 0, proteinPerKg: 1.7, label: "maintenance calories to fuel performance" },
  endurance: { pct: 0, proteinPerKg: 1.5, label: "maintenance calories to fuel endurance work" },
  general: { pct: 0, proteinPerKg: 1.6, label: "maintenance calories" },
};

export function calorieFloor(sex: EnergyInput["sex"]) {
  return sex === "male" ? 1500 : 1200;
}

export function estimateTargets(input: EnergyInput): MacroTargets {
  const rest = bmr(input);
  const maintenance = rest * activityFactor(input.activityLevel);
  const adj = GOAL_ADJUST[input.goal] ?? GOAL_ADJUST.general;
  let calories = maintenance * (1 + adj.pct);
  const floor = calorieFloor(input.sex);
  const floored = calories < floor;
  calories = Math.max(calories, floor);

  const proteinG = round(input.weightKg * adj.proteinPerKg, 5);
  const fatG = round(Math.max((calories * 0.27) / 9, input.weightKg * 0.6), 5);
  const carbsG = Math.max(0, round((calories - proteinG * 4 - fatG * 9) / 4, 5));
  const fiberG = round((calories / 1000) * 14);
  const waterMl = round(input.weightKg * 35, 250);

  const explanation = [
    `Estimated resting energy: ~${round(rest, 10)} kcal (Mifflin–St Jeor equation).`,
    `Estimated maintenance: ~${round(maintenance, 10)} kcal based on your activity level.`,
    `Your target uses ${adj.label}.`,
    `Protein is set to ~${adj.proteinPerKg} g per kg of body weight.`,
  ];
  if (floored) explanation.push(`Calories were raised to a minimum of ${floor} kcal — we don't recommend going lower without professional guidance.`);

  return {
    maintenanceCalories: round(maintenance, 10),
    calories: round(calories, 10),
    proteinG, carbsG, fatG, fiberG, waterMl, explanation,
  };
}

export type Nutrients = { calories: number; protein: number; carbs: number; fat: number; fiber?: number | null; sugar?: number | null; sodiumMg?: number | null; satFat?: number | null };
const KEYS = ["calories", "protein", "carbs", "fat", "fiber", "sugar", "sodiumMg", "satFat"] as const;

export function scaleNutrients(n: Nutrients, factor: number): Required<{ [K in keyof Nutrients]: number | null }> {
  const out = {} as Record<(typeof KEYS)[number], number | null>;
  for (const k of KEYS) {
    const v = n[k];
    out[k] = v == null ? null : Math.round(v * factor * 10) / 10;
  }
  return out as never;
}

export function sumNutrients(items: Nutrients[]) {
  const total = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodiumMg: 0, satFat: 0 };
  for (const it of items) for (const k of KEYS) total[k] += it[k] ?? 0;
  for (const k of KEYS) total[k] = Math.round(total[k] * 10) / 10;
  return total;
}

/** Totals for a scanned item from per-100g estimates. */
export function fromPer100(item: { grams: number; kcalPer100: number; proteinPer100: number; carbsPer100: number; fatPer100: number; fiberPer100?: number | null }): Nutrients {
  const f = item.grams / 100;
  return {
    calories: Math.round(item.kcalPer100 * f),
    protein: Math.round(item.proteinPer100 * f * 10) / 10,
    carbs: Math.round(item.carbsPer100 * f * 10) / 10,
    fat: Math.round(item.fatPer100 * f * 10) / 10,
    fiber: item.fiberPer100 == null ? null : Math.round(item.fiberPer100 * f * 10) / 10,
  };
}

export function remaining(target: { calories: number; proteinG: number; carbsG: number; fatG: number }, eaten: Nutrients) {
  return {
    calories: Math.round(target.calories - eaten.calories),
    protein: Math.round(target.proteinG - eaten.protein),
    carbs: Math.round(target.carbsG - eaten.carbs),
    fat: Math.round(target.fatG - eaten.fat),
  };
}
