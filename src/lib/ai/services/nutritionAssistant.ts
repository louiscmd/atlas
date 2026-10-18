import "server-only";
import { MealSuggestionSchema, type MealSuggestion } from "@/lib/domain/schemas";
import { remaining } from "@/lib/engines/nutrition";
import { localDate } from "@/lib/dates";
import { labelOf, GOALS } from "@/lib/domain/enums";
import { db } from "@/lib/server/db";
import { getDay, recentFoods } from "@/lib/server/services/nutrition";
import { runStructured, textBlock } from "../client";
import { PROMPTS } from "../prompts";

// Curated, realistic meal ideas with approximate macros for the rules fallback.
const IDEAS: MealSuggestion["suggestions"] = [
  { name: "Chicken, rice & vegetables", description: "150 g chicken breast, 150 g cooked rice, mixed vegetables, 1 tsp olive oil.", calories: 520, protein: 50, carbs: 52, fat: 10 },
  { name: "Greek yogurt bowl", description: "250 g Greek yogurt, a handful of berries, 20 g granola, drizzle of honey.", calories: 330, protein: 30, carbs: 40, fat: 5 },
  { name: "Salmon & potatoes", description: "150 g salmon, 200 g baked potatoes, green beans.", calories: 560, protein: 37, carbs: 45, fat: 22 },
  { name: "Egg & toast plate", description: "3 eggs, 2 slices whole-wheat toast, tomato and spinach.", calories: 380, protein: 25, carbs: 30, fat: 16 },
  { name: "Tuna wrap", description: "1 can tuna, light mayo, salad, 1 large tortilla.", calories: 390, protein: 34, carbs: 30, fat: 13 },
  { name: "Protein shake & banana", description: "1 scoop whey in milk, 1 banana.", calories: 340, protein: 32, carbs: 42, fat: 6 },
  { name: "Lentil & veggie bowl", description: "200 g cooked lentils, roasted vegetables, feta.", calories: 420, protein: 24, carbs: 52, fat: 12 },
  { name: "Cottage cheese & fruit", description: "200 g low-fat cottage cheese with pineapple.", calories: 200, protein: 25, carbs: 20, fat: 2 },
  { name: "Lean beef stir-fry", description: "150 g lean beef, vegetables, soy sauce, 120 g noodles or rice.", calories: 560, protein: 42, carbs: 55, fat: 17 },
];

export function rulesSuggestions(left: { calories: number; protein: number; carbs: number; fat: number }): MealSuggestion {
  if (left.calories < 150) {
    return { reply: "You're at or near today's target. If you're hungry, a light protein-forward snack is a good choice — otherwise just pick up as normal tomorrow.", suggestions: IDEAS.filter((i) => i.calories <= 220) };
  }
  const fits = IDEAS.filter((i) => i.calories <= left.calories + 60)
    .map((i) => ({ i, score: -Math.abs(i.protein - left.protein) - Math.abs(i.calories - left.calories) / 10 }))
    .sort((a, b) => b.score - a.score).slice(0, 3).map((x) => x.i);
  return { reply: `You have about ${left.calories} kcal and ${Math.max(0, left.protein)} g protein left today. These options fit reasonably well (macros are approximate):`, suggestions: fits };
}

/** Nutrition AI — meal suggestions from remaining targets. */
export async function askNutritionAssistant(userId: string, tz: string, question: string) {
  const day = await getDay(userId, localDate(tz));
  if (!day.target) return { data: { reply: "Set your nutrition targets first so I can tailor suggestions.", suggestions: [] }, source: "rules" as const };
  const left = remaining(day.target, day.totals);
  const [recent, goals] = await Promise.all([recentFoods(userId, 10), db.userGoals.findUnique({ where: { userId }, select: { primaryGoal: true } })]);
  const res = await runStructured({
    service: "nutrition", prompt: PROMPTS.mealSuggest, schema: MealSuggestionSchema, userId, effort: "low", maxTokens: 3000,
    content: [textBlock([
      `Goal: ${labelOf(GOALS, goals?.primaryGoal)}.`,
      `Daily targets: ${day.target.calories} kcal, ${day.target.proteinG} g protein, ${day.target.carbsG} g carbs, ${day.target.fatG} g fat.`,
      `Eaten today: ${Math.round(day.totals.calories)} kcal, ${Math.round(day.totals.protein)} g protein, ${Math.round(day.totals.carbs)} g carbs, ${Math.round(day.totals.fat)} g fat.`,
      `Remaining: ${left.calories} kcal, ${left.protein} g protein, ${left.carbs} g carbs, ${left.fat} g fat.`,
      `Today's meals: ${day.logs.map((l) => l.name).slice(0, 15).join(", ") || "nothing logged yet"}.`,
      `Recent/saved foods: ${recent.map((f) => f.name).join(", ") || "none"}.`,
      `Question: ${question.slice(0, 500)}`,
    ].join("\n"))],
  });
  if (res.ok) return { data: res.data, source: "ai" as const };
  return { data: rulesSuggestions(left), source: "rules" as const };
}
