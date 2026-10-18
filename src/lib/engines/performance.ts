// Strength metrics: estimated 1RM, volume, bests.

export type SetLike = { weightKg: number; reps: number; rir?: number | null; completedAt?: Date | string };

/** Epley estimate. Above 12 reps estimates get unreliable, so we cap the input. */
export function estimate1RM(weightKg: number, reps: number) {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return weightKg;
  const r = Math.min(reps, 12);
  return Math.round(weightKg * (1 + r / 30) * 10) / 10;
}

export const setVolume = (s: SetLike) => s.weightKg * s.reps;
export const totalVolume = (sets: SetLike[]) => Math.round(sets.reduce((a, s) => a + setVolume(s), 0));

export function bestSet(sets: SetLike[]) {
  let best: SetLike | null = null;
  for (const s of sets) if (!best || estimate1RM(s.weightKg, s.reps) > estimate1RM(best.weightKg, best.reps)) best = s;
  return best;
}

export function heaviest(sets: SetLike[]) {
  return sets.reduce<SetLike | null>((b, s) => (!b || s.weightKg > b.weightKg || (s.weightKg === b.weightKg && s.reps > b.reps) ? s : b), null);
}

/** "70 kg × 8 × 3" when all sets match, otherwise "70×8, 70×8, 72.5×7". */
export function summarizeSets(sets: SetLike[], fmt: (kg: number) => string) {
  if (!sets.length) return "";
  const same = sets.every((s) => s.weightKg === sets[0].weightKg && s.reps === sets[0].reps);
  if (same) return `${fmt(sets[0].weightKg)} × ${sets[0].reps}${sets.length > 1 ? ` × ${sets.length}` : ""}`;
  return sets.map((s) => `${fmt(s.weightKg)}×${s.reps}`).join(", ");
}

/** Exponentially weighted moving average for noisy body-weight data. */
export function smoothTrend(points: { date: Date; value: number }[], alpha = 0.25) {
  const sorted = [...points].sort((a, b) => +a.date - +b.date);
  let ema: number | null = null;
  return sorted.map((p) => {
    ema = ema == null ? p.value : alpha * p.value + (1 - alpha) * ema;
    return { date: p.date, value: p.value, trend: Math.round(ema * 10) / 10 };
  });
}
