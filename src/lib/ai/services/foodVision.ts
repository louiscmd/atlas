import "server-only";
import { FoodScanResultSchema, NutritionLabelSchema, type FoodScanResult, type NutritionLabel } from "@/lib/domain/schemas";
import { runStructured, imageBlock, textBlock, type AIResult } from "../client";
import { PROMPTS } from "../prompts";
import type { ImageType } from "@/lib/server/storage";

/** Food Vision AI — meal photo → components + per-100 g estimates. No fake fallback. */
export async function analyzeMealPhoto(userId: string, image: Buffer, type: ImageType, hint?: string): Promise<AIResult<FoodScanResult>> {
  return runStructured({
    service: "food_vision", prompt: PROMPTS.foodVision, schema: FoodScanResultSchema, userId, effort: "medium", maxTokens: 6000,
    content: [imageBlock(image.toString("base64"), type), textBlock(hint ? `User note about the meal: ${hint.slice(0, 200)}` : "Analyze this meal.")],
  });
}

/** Food Vision AI — nutrition label OCR. */
export async function readNutritionLabel(userId: string, image: Buffer, type: ImageType): Promise<AIResult<NutritionLabel>> {
  return runStructured({
    service: "food_vision", prompt: PROMPTS.nutritionLabel, schema: NutritionLabelSchema, userId, effort: "low", maxTokens: 3000,
    content: [imageBlock(image.toString("base64"), type), textBlock("Read this nutrition label.")],
  });
}

/** Clearly-labelled development sample (never used in production). */
export const DEV_SAMPLE_SCAN: FoodScanResult = {
  isFood: true, title: "Chicken Rice Bowl (development sample)", confidence: "medium",
  notes: "DEVELOPMENT SAMPLE — not an analysis of your photo. Configure ANTHROPIC_API_KEY for real scans.",
  items: [
    { name: "Grilled chicken breast", grams: 180, preparation: "grilled", kcalPer100: 165, proteinPer100: 31, carbsPer100: 0, fatPer100: 3.6, fiberPer100: 0, confidence: "medium" },
    { name: "White rice", grams: 250, preparation: "steamed", kcalPer100: 130, proteinPer100: 2.7, carbsPer100: 28, fatPer100: 0.3, fiberPer100: 0.4, confidence: "medium" },
    { name: "Teriyaki-style sauce", grams: 40, preparation: null, kcalPer100: 110, proteinPer100: 2, carbsPer100: 20, fatPer100: 2, fiberPer100: 0, confidence: "low" },
    { name: "Mixed vegetables", grams: 100, preparation: "steamed", kcalPer100: 65, proteinPer100: 2.9, carbsPer100: 13, fatPer100: 0.2, fiberPer100: 4.4, confidence: "medium" },
  ],
};
export const DEV_SAMPLE_LABEL: NutritionLabel = {
  isLabel: true, productName: "Protein Granola (development sample)", servingSizeText: "45 g", servingGrams: 45,
  calories: 190, protein: 12, carbs: 24, fat: 5, fiber: 4, sugar: 6, sodiumMg: 85, satFat: 1, confidence: "medium",
};
