"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import { requireOnboardedUser } from "@/lib/server/auth";
import { run } from "@/lib/server/action";
import { rateLimit, LIMITS } from "@/lib/server/rateLimit";
import * as n from "@/lib/server/services/nutrition";
import { getUserContext } from "@/lib/server/services/profile";
import { estimateTargets } from "@/lib/engines/nutrition";
import { askNutritionAssistant } from "@/lib/ai/services/nutritionAssistant";
import { db } from "@/lib/server/db";

const refresh = () => { revalidatePath("/nutrition", "layout"); revalidatePath("/home"); };
const id = z.string().min(1).max(64);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function searchFoods(q: string) {
  const user = await requireOnboardedUser();
  return run(() => n.searchFoods(user.id, z.string().max(60).parse(q)));
}

export async function logFood(input: { foodId: string; servings: number; mealType: string; date: string }) {
  const user = await requireOnboardedUser();
  return run(async () => { await n.logFood(user.id, { foodId: id.parse(input.foodId), servings: z.number().min(0.05).max(50).parse(input.servings), mealType: input.mealType, date: date.parse(input.date) }); refresh(); });
}

export async function quickAdd(input: { name: string; mealType: string; date: string; calories: number; protein: number; carbs: number; fat: number }) {
  const user = await requireOnboardedUser();
  return run(async () => { await n.quickAdd(user.id, input); refresh(); });
}

export async function logOp(op: { type: "servings"; id: string; servings: number } | { type: "move"; id: string; mealType: string } | { type: "delete"; id: string }) {
  const user = await requireOnboardedUser();
  return run(async () => {
    if (op.type === "servings") await n.updateLog(user.id, id.parse(op.id), z.number().min(0.05).max(50).parse(op.servings));
    if (op.type === "move") await n.moveLog(user.id, id.parse(op.id), op.mealType);
    if (op.type === "delete") await n.deleteLog(user.id, id.parse(op.id));
    refresh();
  });
}

export async function water(op: { type: "add"; date: string; amountMl: number } | { type: "undo"; date: string }) {
  const user = await requireOnboardedUser();
  return run(async () => {
    if (op.type === "add") await n.addWater(user.id, date.parse(op.date), z.number().int().min(50).max(3000).parse(op.amountMl));
    else await n.undoWater(user.id, date.parse(op.date));
    refresh();
  });
}

export async function toggleFavorite(foodId: string) {
  const user = await requireOnboardedUser();
  return run(async () => { const on = await n.toggleFavorite(user.id, id.parse(foodId)); revalidatePath("/nutrition/add"); return on; });
}

export async function createFood(input: z.infer<typeof n.CustomFoodSchema>, source: "custom" | "label_scan" = "custom") {
  const user = await requireOnboardedUser();
  return run(async () => { const f = await n.createCustomFood(user.id, input, source); revalidatePath("/nutrition/add"); return f; });
}

export async function saveMeal(input: z.infer<typeof n.MealSchema>, mealId?: string) {
  const user = await requireOnboardedUser();
  return run(async () => { const r = await n.saveMeal(user.id, input, mealId ? id.parse(mealId) : undefined); revalidatePath("/nutrition/meals"); return r; });
}

export async function mealOp(op: { type: "duplicate" | "delete"; mealId: string } | { type: "log"; mealId: string; mealType: string; date: string }) {
  const user = await requireOnboardedUser();
  return run(async () => {
    if (op.type === "duplicate") await n.duplicateMeal(user.id, id.parse(op.mealId));
    if (op.type === "delete") await n.deleteMeal(user.id, id.parse(op.mealId));
    if (op.type === "log") await n.logMeal(user.id, id.parse(op.mealId), op.mealType, date.parse(op.date));
    revalidatePath("/nutrition/meals");
    refresh();
  });
}

export async function logScan(scanId: string, input: { title: string; items: z.infer<typeof n.ScanItemEditSchema>[]; mealType: string; date: string }) {
  const user = await requireOnboardedUser();
  return run(async () => { await n.logScan(user.id, id.parse(scanId), input); refresh(); });
}

export async function setTargets(input: { calories: number; proteinG: number; carbsG: number; fatG: number; waterMl: number } | "recalculate") {
  const user = await requireOnboardedUser();
  return run(async () => {
    const ctx = await getUserContext(user.id);
    const latestWeight = await db.progressMeasurement.findFirst({ where: { userId: user.id, type: "weight" }, orderBy: { measuredAt: "desc" } });
    const est = estimateTargets({ sex: ctx.profile?.sex as never, age: ctx.age, heightCm: ctx.profile?.heightCm ?? 175, weightKg: latestWeight?.value ?? ctx.profile?.startWeightKg ?? 75, activityLevel: ctx.profile?.activityLevel ?? "moderate", goal: ctx.goals?.primaryGoal ?? "general" });
    if (input === "recalculate") await n.setTarget(user.id, { ...est, isManual: false });
    else await n.setTarget(user.id, { ...input, maintenanceCalories: est.maintenanceCalories, isManual: true });
    refresh();
  });
}

export async function askAssistant(question: string) {
  const user = await requireOnboardedUser();
  return run(async () => {
    const r = rateLimit(`ai:${user.id}`, ...LIMITS.ai);
    if (!r.ok) throw new Error("You've asked a lot of questions this hour — try again a little later.");
    const ctx = await getUserContext(user.id);
    return askNutritionAssistant(user.id, ctx.tz, z.string().trim().min(2, "Ask a question first").max(500).parse(question));
  });
}
