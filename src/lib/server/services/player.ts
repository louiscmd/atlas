import "server-only";
import * as workouts from "./workouts";
import { getExercisePerformance } from "./exercises";

/** Everything the workout player needs, including previous performance per exercise. */
export async function getPlayerState(userId: string, sessionId: string) {
  const s = await workouts.getSession(userId, sessionId);
  const perf = await Promise.all(s.exercises.map((e) => getExercisePerformance(userId, e.exerciseId, sessionId)));
  return {
    id: s.id, name: s.name, focus: s.focus, status: s.status, startedAt: s.startedAt.toISOString(), dayId: s.dayId,
    exercises: s.exercises.map((e, i) => ({
      id: e.id, exerciseId: e.exerciseId, slug: e.exercise.slug, name: e.exerciseName, isTimed: e.exercise.isTimed, targetSets: e.targetSets, repMin: e.repMin, repMax: e.repMax,
      restSec: e.restSec, rirTarget: e.rirTarget, status: e.status, notes: e.notes, replacedFrom: e.replacedFrom,
      recommendation: e.recommendation ? (JSON.parse(e.recommendation) as { action: string; weightKg: number | null; repTarget: number; reason: string }) : null,
      sets: e.sets.map((x) => ({ id: x.id, clientId: x.clientId, setNumber: x.setNumber, weightKg: x.weightKg, reps: x.reps, rir: x.rir })),
      previous: perf[i] ? { last: perf[i]!.lastSession.sets.map((x) => ({ weightKg: x.weightKg, reps: x.reps })), best: perf[i]!.best, e1rm: perf[i]!.e1rm } : null,
    })),
  };
}
export type PlayerState = Awaited<ReturnType<typeof getPlayerState>>;
