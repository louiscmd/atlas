// Conservative double-progression engine.
// Inputs: the prescription and the user's recent sessions for one exercise.
import { estimate1RM, type SetLike } from "./performance";

export type Prescription = { sets: number; repMin: number; repMax: number; rirTarget: number | null };
export type SessionPerformance = { date: Date; sets: SetLike[] };
export type Recommendation = {
  action: "start" | "increase_weight" | "increase_reps" | "maintain" | "reduce";
  weightKg: number | null;
  repTarget: number;
  reason: string;
};

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

/**
 * @param history most recent first
 * @param incrementKg smallest load jump the user can make (default 2.5)
 */
export function recommendNext(p: Prescription, history: SessionPerformance[], incrementKg = 2.5, isTimed = false): Recommendation {
  const last = history[0];
  if (!last || last.sets.length === 0) {
    return { action: "start", weightKg: null, repTarget: p.repMin, reason: "First time — pick a weight you can lift for the target reps with good form, leaving 2–3 reps in reserve." };
  }
  // Use the working weight = most common heaviest weight of the last session
  const workWeight = Math.max(...last.sets.map((s) => s.weightKg));
  const workSets = last.sets.filter((s) => s.weightKg === workWeight);
  const minReps = Math.min(...workSets.map((s) => s.reps));
  const rirs = workSets.map((s) => s.rir).filter((r): r is number => r != null);
  const avgRir = rirs.length ? rirs.reduce((a, b) => a + b, 0) / rirs.length : null;
  const targetRir = p.rirTarget ?? 2;
  const hitAllSets = workSets.length >= p.sets;
  const enoughReserve = avgRir == null || avgRir >= targetRir - 0.5;

  if (isTimed || workWeight === 0) {
    if (minReps >= p.repMax) return { action: "increase_reps", weightKg: workWeight || null, repTarget: p.repMax, reason: "You hit the top of the range — try a harder variation or add a little load." };
    return { action: "increase_reps", weightKg: workWeight || null, repTarget: Math.min(p.repMax, minReps + 1), reason: "Add one rep (or a few seconds) per set this time." };
  }

  // Detect a repeated decline: e1RM fell in each of the last two sessions.
  const e1 = history.slice(0, 3).map((h) => Math.max(...h.sets.map((s) => estimate1RM(s.weightKg, s.reps))));
  const declining = e1.length === 3 && e1[0] < e1[1] && e1[1] < e1[2];
  if (declining) {
    const reduced = roundTo(workWeight * 0.9, incrementKg);
    return { action: "reduce", weightKg: reduced, repTarget: p.repMin, reason: "Performance has dipped two sessions in a row. Drop the load ~10% and build back up — check sleep, food and stress." };
  }

  if (hitAllSets && minReps >= p.repMax && enoughReserve) {
    return { action: "increase_weight", weightKg: workWeight + incrementKg, repTarget: p.repMin, reason: `You hit ${p.repMax} reps on every set with reps in reserve. Add ${incrementKg} kg and aim for ${p.repMin}+ reps.` };
  }
  if (hitAllSets && minReps >= p.repMax && !enoughReserve) {
    return { action: "maintain", weightKg: workWeight, repTarget: p.repMax, reason: "Top of the range, but closer to failure than planned. Repeat this weight and own it before adding load." };
  }
  if (minReps < p.repMin) {
    return { action: "maintain", weightKg: workWeight, repTarget: p.repMin, reason: `Last time some sets fell below ${p.repMin} reps. Keep the weight and aim to hit ${p.repMin} on every set.` };
  }
  return { action: "increase_reps", weightKg: workWeight, repTarget: Math.min(p.repMax, minReps + 1), reason: `Same weight — try to beat last time with ${Math.min(p.repMax, minReps + 1)} reps per set.` };
}
