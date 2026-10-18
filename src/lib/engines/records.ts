// Personal-record detection for a completed session.
import { estimate1RM, totalVolume, type SetLike } from "./performance";

export type PRType = "heaviest_weight" | "best_e1rm" | "most_reps" | "best_session_volume";
export type ExistingBests = { heaviest: number; e1rm: number; volume: number; repsAtWeight: Map<number, number> };
export type DetectedPR = { type: PRType; value: number; weightKg?: number; reps?: number; previous: number | null };

export const PR_LABEL: Record<PRType, string> = {
  heaviest_weight: "Heaviest weight",
  best_e1rm: "Estimated 1RM",
  most_reps: "Most reps at weight",
  best_session_volume: "Session volume",
};

export function bestsFromHistory(sets: SetLike[]): ExistingBests {
  const repsAtWeight = new Map<number, number>();
  let heaviest = 0, e1rm = 0;
  for (const s of sets) {
    heaviest = Math.max(heaviest, s.weightKg);
    e1rm = Math.max(e1rm, estimate1RM(s.weightKg, s.reps));
    repsAtWeight.set(s.weightKg, Math.max(repsAtWeight.get(s.weightKg) ?? 0, s.reps));
  }
  return { heaviest, e1rm, volume: 0, repsAtWeight };
}

/**
 * Only flag PRs when there IS history — the first session for an exercise sets
 * baselines rather than spamming "NEW PR". Bodyweight (0 kg) sets only count for reps.
 */
export function detectPRs(sessionSets: SetLike[], prior: ExistingBests | null, priorBestVolume: number): DetectedPR[] {
  if (!prior || sessionSets.length === 0) return [];
  const prs: DetectedPR[] = [];
  const top = sessionSets.reduce((b, s) => (s.weightKg > b.weightKg || (s.weightKg === b.weightKg && s.reps > b.reps) ? s : b));
  if (top.weightKg > 0 && top.weightKg > prior.heaviest) prs.push({ type: "heaviest_weight", value: top.weightKg, weightKg: top.weightKg, reps: top.reps, previous: prior.heaviest || null });

  const bestE = sessionSets.reduce((b, s) => (estimate1RM(s.weightKg, s.reps) > estimate1RM(b.weightKg, b.reps) ? s : b));
  const e = estimate1RM(bestE.weightKg, bestE.reps);
  if (bestE.weightKg > 0 && e > prior.e1rm + 0.05 && !prs.some((p) => p.type === "heaviest_weight" && p.reps === 1)) {
    prs.push({ type: "best_e1rm", value: e, weightKg: bestE.weightKg, reps: bestE.reps, previous: prior.e1rm || null });
  }

  // Most reps at a weight already lifted before (so it is a like-for-like comparison)
  let repPR: DetectedPR | null = null;
  for (const s of sessionSets) {
    const prev = prior.repsAtWeight.get(s.weightKg);
    if (prev != null && s.reps > prev && (!repPR || s.weightKg > (repPR.weightKg ?? 0))) {
      repPR = { type: "most_reps", value: s.reps, weightKg: s.weightKg, reps: s.reps, previous: prev };
    }
  }
  if (repPR && !prs.some((p) => p.type === "heaviest_weight")) prs.push(repPR);

  const vol = totalVolume(sessionSets);
  if (vol > 0 && priorBestVolume > 0 && vol > priorBestVolume) prs.push({ type: "best_session_volume", value: vol, previous: priorBestVolume });
  return prs;
}
