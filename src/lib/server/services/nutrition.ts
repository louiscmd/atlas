import "server-only";
import { z } from "zod/v4";
import { db } from "../db";
import { addDays, dateRange, localDate } from "@/lib/dates";
import { scaleNutrients, sumNutrients, fromPer100, type Nutrients } from "@/lib/engines/nutrition";
import { MEAL_TYPES, keys } from "@/lib/domain/enums";
import { NotFoundError } from "./plans";
import { notify } from "./notifications";
import { track } from "../analytics";

export const zMeal = z.enum(keys(MEAL_TYPES));
const zDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function getTarget(userId: string) {
  return db.nutritionTarget.findFirst({ where: { userId }, orderBy: { effectiveFrom: "desc" } });
}

export async function setTarget(userId: string, t: { calories: number; proteinG: number; carbsG: number; fatG: number; waterMl: number; maintenanceCalories: number; isManual: boolean }) {
  const r = (n: number, lo: number, hi: number) => Math.round(Math.min(hi, Math.max(lo, n)));
  return db.nutritionTarget.create({ data: { userId, calories: r(t.calories, 1000, 6000), proteinG: r(t.proteinG, 0, 400), carbsG: r(t.carbsG, 0, 900), fatG: r(t.fatG, 0, 300), waterMl: r(t.waterMl, 500, 8000), maintenanceCalories: r(t.maintenanceCalories, 1000, 7000), isManual: t.isManual } });
}

export async function getDay(userId: string, date: string) {
  zDate.parse(date);
  const [logs, water, target] = await Promise.all([
    db.nutritionLog.findMany({ where: { userId, date }, orderBy: { loggedAt: "asc" } }),
    db.waterLog.findMany({ where: { userId, date }, orderBy: { loggedAt: "asc" } }),
    getTarget(userId),
  ]);
  const totals = sumNutrients(logs);
  const byMeal = MEAL_TYPES.map((m) => {
    const items = logs.filter((l) => l.mealType === m.key);
    return { ...m, items, totals: sumNutrients(items) };
  });
  return { date, logs, byMeal, totals, target, waterMl: water.reduce((s, w) => s + w.amountMl, 0), waterLogs: water, hasEstimates: logs.some((l) => l.isEstimate) };
}

async function afterLog(userId: string, date: string) {
  // Gentle protein nudge, at most once per day
  const target = await getTarget(userId);
  if (!target) return;
  const totals = sumNutrients(await db.nutritionLog.findMany({ where: { userId, date } }));
  const left = target.proteinG - totals.protein;
  if (left > 0 && left <= 25) {
    const already = await db.notification.findFirst({ where: { userId, category: "protein", createdAt: { gte: new Date(Date.now() - 18 * 3600_000) } } });
    if (!already) await notify(userId, "protein", "Almost at your protein target", `About ${Math.round(left)} g of protein to go today.`, "/nutrition");
  }
}

export async function logFood(userId: string, input: { foodId: string; servings: number; mealType: string; date: string }) {
  const meal = zMeal.parse(input.mealType);
  zDate.parse(input.date);
  const servings = Math.max(0.05, Math.min(50, input.servings));
  const food = await db.food.findFirst({ where: { id: input.foodId, OR: [{ userId: null }, { userId }] }, include: { nutrition: true } });
  if (!food?.nutrition) throw new NotFoundError("Food not found");
  const n = scaleNutrients(food.nutrition, servings);
  const amountLabel = `${Math.round(servings * 100) / 100} × ${food.servingLabel ?? `${food.servingSize} ${food.servingUnit}`}`;
  const log = await db.nutritionLog.create({ data: { userId, date: input.date, mealType: meal, name: food.name, foodId: food.id, servings, amountLabel, ...n, calories: n.calories ?? 0, protein: n.protein ?? 0, carbs: n.carbs ?? 0, fat: n.fat ?? 0, isEstimate: false, source: "food" } });
  await track(userId, "food_logged", { source: "food" });
  await afterLog(userId, input.date);
  return log;
}

export async function quickAdd(userId: string, input: { name: string; mealType: string; date: string } & Nutrients) {
  const meal = zMeal.parse(input.mealType);
  zDate.parse(input.date);
  const c = (n: number | null | undefined, hi: number) => (n == null ? null : Math.max(0, Math.min(hi, n)));
  const log = await db.nutritionLog.create({ data: { userId, date: input.date, mealType: meal, name: input.name.slice(0, 80) || "Quick add", calories: c(input.calories, 5000)!, protein: c(input.protein, 500)!, carbs: c(input.carbs, 800)!, fat: c(input.fat, 400)!, fiber: c(input.fiber, 150), isEstimate: true, source: "quick" } });
  await afterLog(userId, input.date);
  return log;
}

export async function updateLog(userId: string, logId: string, servings: number) {
  const log = await db.nutritionLog.findFirst({ where: { id: logId, userId } });
  if (!log) throw new NotFoundError("Entry not found");
  const factor = Math.max(0.05, Math.min(50, servings)) / (log.servings || 1);
  const n = scaleNutrients(log, factor);
  await db.nutritionLog.update({ where: { id: logId }, data: { servings: log.servings * factor, calories: n.calories!, protein: n.protein!, carbs: n.carbs!, fat: n.fat!, fiber: n.fiber, sugar: n.sugar, sodiumMg: n.sodiumMg, satFat: n.satFat, amountLabel: log.amountLabel?.replace(/^[\d.]+ ×/, `${Math.round(log.servings * factor * 100) / 100} ×`) } });
}

export async function moveLog(userId: string, logId: string, mealType: string) {
  const r = await db.nutritionLog.updateMany({ where: { id: logId, userId }, data: { mealType: zMeal.parse(mealType) } });
  if (!r.count) throw new NotFoundError("Entry not found");
}

export async function deleteLog(userId: string, logId: string) {
  const r = await db.nutritionLog.deleteMany({ where: { id: logId, userId } });
  if (!r.count) throw new NotFoundError("Entry not found");
}

export async function addWater(userId: string, date: string, amountMl: number) {
  zDate.parse(date);
  return db.waterLog.create({ data: { userId, date, amountMl: Math.max(-2000, Math.min(3000, Math.round(amountMl))) } });
}
export async function undoWater(userId: string, date: string) {
  const last = await db.waterLog.findFirst({ where: { userId, date }, orderBy: [{ loggedAt: "desc" }, { id: "desc" }] });
  if (last) await db.waterLog.delete({ where: { id: last.id } });
}

// ───────── Foods ─────────
const foodSelect = { id: true, name: true, brand: true, servingSize: true, servingUnit: true, servingLabel: true, gramsPerServing: true, source: true, verified: true, userId: true, nutrition: true } as const;

export async function searchFoods(userId: string, q: string, take = 30) {
  const query = q.trim().slice(0, 60);
  if (!query) return [];
  const words = query.split(/\s+/).slice(0, 4);
  return db.food.findMany({
    where: { AND: [{ OR: [{ userId: null }, { userId }] }, ...words.map((w) => ({ name: { contains: w, mode: "insensitive" as const } }))] },
    take, orderBy: { name: "asc" }, select: foodSelect,
  });
}

export async function recentFoods(userId: string, take = 12) {
  const logs = await db.nutritionLog.findMany({ where: { userId, foodId: { not: null } }, orderBy: { loggedAt: "desc" }, take: 80, select: { foodId: true } });
  const ids = [...new Set(logs.map((l) => l.foodId!))].slice(0, take);
  const foods = await db.food.findMany({ where: { id: { in: ids }, OR: [{ userId: null }, { userId }] }, select: foodSelect });
  return ids.map((id) => foods.find((f) => f.id === id)).filter(Boolean) as typeof foods;
}

export async function favoriteFoods(userId: string) {
  return (await db.foodFavorite.findMany({ where: { userId }, include: { food: { select: foodSelect } } })).map((f) => f.food);
}

export async function toggleFavorite(userId: string, foodId: string) {
  const food = await db.food.findFirst({ where: { id: foodId, OR: [{ userId: null }, { userId }] } });
  if (!food) throw new NotFoundError("Food not found");
  const existing = await db.foodFavorite.findUnique({ where: { userId_foodId: { userId, foodId } } });
  if (existing) await db.foodFavorite.delete({ where: { id: existing.id } });
  else await db.foodFavorite.create({ data: { userId, foodId } });
  return !existing;
}

export const CustomFoodSchema = z.object({
  name: z.string().trim().min(1).max(80), brand: z.string().max(60).optional().nullable(),
  servingSize: z.number().min(0.1).max(5000), servingUnit: z.enum(["g", "ml", "piece"]), servingLabel: z.string().max(40).optional().nullable(),
  calories: z.number().min(0).max(5000), protein: z.number().min(0).max(500), carbs: z.number().min(0).max(800), fat: z.number().min(0).max(400),
  fiber: z.number().min(0).max(150).nullable().optional(), sugar: z.number().min(0).max(500).nullable().optional(), sodiumMg: z.number().min(0).max(20000).nullable().optional(), satFat: z.number().min(0).max(200).nullable().optional(),
});

export async function createCustomFood(userId: string, input: z.infer<typeof CustomFoodSchema>, source: "custom" | "label_scan" = "custom") {
  const d = CustomFoodSchema.parse(input);
  return db.food.create({
    data: { userId, name: d.name, brand: d.brand ?? null, servingSize: d.servingSize, servingUnit: d.servingUnit, servingLabel: d.servingLabel ?? `${d.servingSize} ${d.servingUnit}`, gramsPerServing: d.servingUnit === "g" ? d.servingSize : null, source,
      nutrition: { create: { calories: d.calories, protein: d.protein, carbs: d.carbs, fat: d.fat, fiber: d.fiber ?? null, sugar: d.sugar ?? null, sodiumMg: d.sodiumMg ?? null, satFat: d.satFat ?? null } } },
    select: foodSelect,
  });
}

// ───────── Meals ─────────
export async function listMeals(userId: string) {
  const meals = await db.meal.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, include: { items: { orderBy: { order: "asc" }, include: { food: { select: foodSelect } } } } });
  return meals.map((m) => ({ ...m, totals: sumNutrients(m.items.map((i) => scaleNutrients(i.food.nutrition!, i.servings) as Nutrients)) }));
}

export const MealSchema = z.object({ name: z.string().trim().min(1).max(60), items: z.array(z.object({ foodId: z.string(), servings: z.number().min(0.05).max(50) })).min(1).max(30) });

export async function saveMeal(userId: string, input: z.infer<typeof MealSchema>, mealId?: string) {
  const d = MealSchema.parse(input);
  const foods = await db.food.count({ where: { id: { in: d.items.map((i) => i.foodId) }, OR: [{ userId: null }, { userId }] } });
  if (foods !== new Set(d.items.map((i) => i.foodId)).size) throw new NotFoundError("Food not found");
  if (mealId) {
    const own = await db.meal.findFirst({ where: { id: mealId, userId } });
    if (!own) throw new NotFoundError("Meal not found");
    await db.$transaction([db.mealItem.deleteMany({ where: { mealId } }), db.meal.update({ where: { id: mealId }, data: { name: d.name, items: { create: d.items.map((i, order) => ({ ...i, order })) } } })]);
    return mealId;
  }
  return (await db.meal.create({ data: { userId, name: d.name, items: { create: d.items.map((i, order) => ({ ...i, order })) } } })).id;
}

export async function duplicateMeal(userId: string, mealId: string) {
  const m = await db.meal.findFirst({ where: { id: mealId, userId }, include: { items: true } });
  if (!m) throw new NotFoundError("Meal not found");
  return db.meal.create({ data: { userId, name: `${m.name} (copy)`.slice(0, 60), items: { create: m.items.map(({ foodId, servings, order }) => ({ foodId, servings, order })) } } });
}

export async function deleteMeal(userId: string, mealId: string) {
  const r = await db.meal.deleteMany({ where: { id: mealId, userId } });
  if (!r.count) throw new NotFoundError("Meal not found");
}

export async function logMeal(userId: string, mealId: string, mealType: string, date: string) {
  const m = await db.meal.findFirst({ where: { id: mealId, userId }, include: { items: { include: { food: { include: { nutrition: true } } } } } });
  if (!m) throw new NotFoundError("Meal not found");
  const meal = zMeal.parse(mealType);
  zDate.parse(date);
  await db.nutritionLog.createMany({
    data: m.items.map((i) => {
      const n = scaleNutrients(i.food.nutrition!, i.servings);
      return { userId, date, mealType: meal, name: i.food.name, foodId: i.foodId, servings: i.servings, amountLabel: `${i.servings} × ${i.food.servingLabel ?? i.food.servingUnit} · ${m.name}`, calories: n.calories!, protein: n.protein!, carbs: n.carbs!, fat: n.fat!, fiber: n.fiber, sugar: n.sugar, sodiumMg: n.sodiumMg, satFat: n.satFat, source: "meal" };
    }),
  });
  await track(userId, "food_logged", { source: "meal" });
  await afterLog(userId, date);
}

// ───────── Scans ─────────
export const ScanItemEditSchema = z.object({
  name: z.string().trim().min(1).max(80), grams: z.number().min(1).max(3000), preparation: z.string().max(60).nullable(),
  kcalPer100: z.number().min(0).max(900), proteinPer100: z.number().min(0).max(100), carbsPer100: z.number().min(0).max(100), fatPer100: z.number().min(0).max(100), fiberPer100: z.number().min(0).max(60).nullable(),
  confidence: z.enum(["low", "medium", "high"]),
});

export async function getScan(userId: string, scanId: string) {
  const scan = await db.foodScan.findFirst({ where: { id: scanId, userId }, include: { items: { orderBy: { order: "asc" } } } });
  if (!scan) throw new NotFoundError("Scan not found");
  return scan;
}

/** Logs the user-corrected scan as estimated entries. */
export async function logScan(userId: string, scanId: string, input: { title: string; items: z.infer<typeof ScanItemEditSchema>[]; mealType: string; date: string }) {
  const scan = await getScan(userId, scanId);
  const items = z.array(ScanItemEditSchema).min(1).max(20).parse(input.items);
  const meal = zMeal.parse(input.mealType);
  zDate.parse(input.date);
  await db.$transaction([
    db.foodScanItem.deleteMany({ where: { scanId } }),
    db.foodScanItem.createMany({ data: items.map((it, order) => ({ scanId, order, ...it })) }),
    db.foodScan.update({ where: { id: scanId }, data: { status: "logged", title: input.title.slice(0, 80) } }),
    db.nutritionLog.createMany({
      data: items.map((it) => {
        const n = fromPer100(it);
        return { userId, date: input.date, mealType: meal, name: `${it.name}${it.preparation ? ` (${it.preparation})` : ""}`, scanId: scan.id, servings: 1, amountLabel: `~${Math.round(it.grams)} g · ${input.title}`.slice(0, 120), calories: n.calories, protein: n.protein, carbs: n.carbs, fat: n.fat, fiber: n.fiber, isEstimate: true, source: "scan" };
      }),
    }),
  ]);
  await track(userId, "food_logged", { source: "scan" });
  await afterLog(userId, input.date);
}

// ───────── History ─────────
export async function history(userId: string, tz: string, days = 30) {
  const to = localDate(tz);
  const from = addDays(to, -(days - 1));
  const [logs, water, target] = await Promise.all([
    db.nutritionLog.findMany({ where: { userId, date: { gte: from, lte: to } }, select: { date: true, calories: true, protein: true, carbs: true, fat: true } }),
    db.waterLog.findMany({ where: { userId, date: { gte: from, lte: to } }, select: { date: true, amountMl: true } }),
    getTarget(userId),
  ]);
  const series = dateRange(from, to).map((date) => {
    const t = sumNutrients(logs.filter((l) => l.date === date));
    return { date, ...t, waterMl: water.filter((w) => w.date === date).reduce((s, w) => s + w.amountMl, 0), logged: logs.some((l) => l.date === date) };
  });
  const loggedDays = series.filter((d) => d.logged);
  const avg = (k: "calories" | "protein" | "carbs" | "fat") => (loggedDays.length ? Math.round(loggedDays.reduce((s, d) => s + d[k], 0) / loggedDays.length) : 0);
  const withinCalories = target ? loggedDays.filter((d) => Math.abs(d.calories - target.calories) <= target.calories * 0.1).length : 0;
  const proteinHit = target ? loggedDays.filter((d) => d.protein >= target.proteinG * 0.9).length : 0;
  return { series, target, loggedDays: loggedDays.length, averages: { calories: avg("calories"), protein: avg("protein"), carbs: avg("carbs"), fat: avg("fat") }, withinCalories, proteinHit };
}
