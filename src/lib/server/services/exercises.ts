import "server-only";
import { db } from "../db";
import { rankAlternatives, type ExerciseLite } from "@/lib/engines/replacement";
import type { LibraryExercise } from "@/lib/engines/planGenerator";
import { estimate1RM, totalVolume } from "@/lib/engines/performance";
import { getUserContext } from "./profile";

// The library changes rarely: memoize in-process (admin edits call invalidateLibrary()).
let cache: { at: number; data: LibraryExercise[] } | null = null;
const TTL = 5 * 60_000;

export async function getLibrary(): Promise<LibraryExercise[]> {
  if (cache && Date.now() - cache.at < TTL) return cache.data;
  const rows = await db.exercise.findMany({ orderBy: { name: "asc" }, select: { id: true, slug: true, name: true, category: true, primaryMuscles: true, secondaryMuscles: true, equipment: true, difficulty: true, movementType: true, movementPattern: true, repMin: true, repMax: true, restSec: true, isTimed: true } });
  const data = rows.map((r) => ({ ...r, primaryMuscles: r.primaryMuscles as string[], secondaryMuscles: r.secondaryMuscles as string[], equipment: r.equipment as string[] }));
  cache = { at: Date.now(), data };
  return data;
}
export const invalidateLibrary = () => { cache = null; };

export async function getExerciseDetail(slug: string) {
  const ex = await db.exercise.findUnique({
    where: { slug },
    include: { videos: { orderBy: { isPrimary: "desc" } }, alternatives: { orderBy: { rank: "asc" }, include: { alternative: { select: { id: true, slug: true, name: true, equipment: true, category: true } } } } },
  });
  if (!ex) return null;
  return {
    ...ex,
    primaryMuscles: ex.primaryMuscles as string[], secondaryMuscles: ex.secondaryMuscles as string[], equipment: ex.equipment as string[],
    instructions: ex.instructions as string[], commonMistakes: ex.commonMistakes as string[], tips: ex.tips as string[],
    alternatives: ex.alternatives.map((a) => ({ ...a.alternative, equipment: a.alternative.equipment as string[] })),
  };
}

export async function getAlternativesForUser(userId: string, exerciseId: string, limit = 8) {
  const [lib, ctx, curated] = await Promise.all([
    getLibrary(), getUserContext(userId),
    db.exerciseAlternative.findMany({ where: { exerciseId }, orderBy: { rank: "asc" }, select: { alternativeId: true } }),
  ]);
  const target = lib.find((e) => e.id === exerciseId);
  if (!target) return [];
  return rankAlternatives(target as ExerciseLite, lib, {
    available: new Set([...ctx.equipment, "bodyweight"]), excluded: new Set(ctx.excludedExerciseIds), preferred: new Set(ctx.preferredExerciseIds),
    curatedAlternativeIds: curated.map((c) => c.alternativeId),
  }, limit);
}

/** Last session, best set and e1RM for an exercise — powers "Previous performance". */
export async function getExercisePerformance(userId: string, exerciseId: string, excludeSessionId?: string) {
  const sets = await db.workoutSet.findMany({
    where: { userId, exerciseId, session: { status: "completed", ...(excludeSessionId ? { id: { not: excludeSessionId } } : {}) } },
    orderBy: { completedAt: "desc" }, take: 300,
    select: { weightKg: true, reps: true, rir: true, completedAt: true, sessionId: true },
  });
  if (!sets.length) return null;
  const bySession = new Map<string, typeof sets>();
  for (const s of sets) bySession.set(s.sessionId, [...(bySession.get(s.sessionId) ?? []), s]);
  const sessions = [...bySession.values()].map((ss) => ({ date: ss[0].completedAt, sets: [...ss].reverse() }));
  const best = sets.reduce((b, s) => (estimate1RM(s.weightKg, s.reps) > estimate1RM(b.weightKg, b.reps) ? s : b));
  const heaviest = sets.reduce((b, s) => (s.weightKg > b.weightKg || (s.weightKg === b.weightKg && s.reps > b.reps) ? s : b));
  return {
    lastSession: sessions[0],
    recentSessions: sessions.slice(0, 5),
    best: { weightKg: heaviest.weightKg, reps: heaviest.reps },
    e1rm: estimate1RM(best.weightKg, best.reps),
    sessionCount: sessions.length,
    bestVolume: Math.max(...sessions.map((s) => totalVolume(s.sets))),
  };
}
