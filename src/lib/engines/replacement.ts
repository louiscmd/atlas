// Ranks replacement exercises for a given exercise and user context.

export type ExerciseLite = {
  id: string;
  name: string;
  category: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string[];
  difficulty: string;
  movementType: string;
  movementPattern: string;
};

export type ReplacementContext = {
  available: Set<string>; // user's equipment keys
  excluded: Set<string>; // exercise ids user cannot do / dislikes
  preferred: Set<string>; // exercise ids user wants to prioritize
  curatedAlternativeIds?: string[]; // ordered alternatives from the library
};

const DIFF = { beginner: 0, intermediate: 1, advanced: 2 } as Record<string, number>;

export function hasEquipment(ex: Pick<ExerciseLite, "equipment">, available: Set<string>) {
  return ex.equipment.every((q) => q === "bodyweight" || available.has(q));
}

export function scoreAlternative(target: ExerciseLite, cand: ExerciseLite, ctx: ReplacementContext) {
  if (cand.id === target.id || ctx.excluded.has(cand.id) || !hasEquipment(cand, ctx.available)) return -Infinity;
  let score = 0;
  const reasons: string[] = [];
  const primaryOverlap = cand.primaryMuscles.filter((m) => target.primaryMuscles.includes(m)).length;
  if (primaryOverlap === 0) return -Infinity; // must train the same muscle
  score += primaryOverlap * 30;
  reasons.push("Same muscle group");
  if (cand.movementPattern === target.movementPattern) { score += 40; reasons.push("Similar movement"); }
  if (cand.movementType === target.movementType) score += 10;
  score -= Math.abs((DIFF[cand.difficulty] ?? 1) - (DIFF[target.difficulty] ?? 1)) * 8;
  const curatedIdx = ctx.curatedAlternativeIds?.indexOf(cand.id) ?? -1;
  if (curatedIdx >= 0) { score += 25 - curatedIdx * 2; reasons.push("Recommended alternative"); }
  if (ctx.preferred.has(cand.id)) { score += 15; reasons.push("On your priority list"); }
  return { score, reasons };
}

export function rankAlternatives<T extends ExerciseLite>(target: ExerciseLite, candidates: T[], ctx: ReplacementContext, limit = 8) {
  return candidates
    .map((c) => ({ exercise: c, result: scoreAlternative(target, c, ctx) }))
    .filter((x): x is { exercise: T; result: { score: number; reasons: string[] } } => typeof x.result === "object")
    .sort((a, b) => b.result.score - a.result.score)
    .slice(0, limit)
    .map((x) => ({ ...x.exercise, score: x.result.score, reasons: x.result.reasons }));
}
