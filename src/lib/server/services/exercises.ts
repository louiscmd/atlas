import "server-only";
import { db } from "../db";
import { rankAlternatives, type ExerciseLite } from "@/lib/engines/replacement";
import type { LibraryExercise } from "@/lib/engines/planGenerator";
import { estimate1RM, totalVolume } from "@/lib/engines/performance";
import { getUserContext } from "./profile";
import { NotFoundError } from "./errors";
import { randomToken } from "../crypto";

const LIB_SELECT = { id: true, slug: true, name: true, category: true, primaryMuscles: true, secondaryMuscles: true, equipment: true, difficulty: true, movementType: true, movementPattern: true, repMin: true, repMax: true, restSec: true, isTimed: true, ownerId: true } as const;
type Row = { primaryMuscles: unknown; secondaryMuscles: unknown; equipment: unknown };
const toLib = <T extends Row>(r: T) => ({ ...r, primaryMuscles: r.primaryMuscles as string[], secondaryMuscles: r.secondaryMuscles as string[], equipment: r.equipment as string[] });

/** Visible to a user: the shared library plus their own custom exercises. */
export const visibleTo = (userId: string) => ({ OR: [{ ownerId: null }, { ownerId: userId }] });

// The shared library changes rarely: memoize in-process (admin edits call invalidateLibrary()).
let cache: { at: number; data: (LibraryExercise & { ownerId: string | null })[] } | null = null;
const TTL = 5 * 60_000;

/** Shared library only — never includes anyone's custom exercises. */
export async function getLibrary() {
  if (cache && Date.now() - cache.at < TTL) return cache.data;
  const data = (await db.exercise.findMany({ where: { ownerId: null }, orderBy: { name: "asc" }, select: LIB_SELECT })).map(toLib);
  cache = { at: Date.now(), data };
  return data;
}
export const invalidateLibrary = () => { cache = null; };

/** Shared library + this user's custom exercises (custom first). */
export async function getUserLibrary(userId: string) {
  const [lib, custom] = await Promise.all([
    getLibrary(),
    db.exercise.findMany({ where: { ownerId: userId }, orderBy: { name: "asc" }, select: LIB_SELECT }),
  ]);
  return [...custom.map(toLib), ...lib];
}

/** Throws NotFound unless the exercise is in the shared library or owned by the user. */
export async function assertExerciseAccess(userId: string, exerciseId: string) {
  const ex = await db.exercise.findFirst({ where: { id: exerciseId, ...visibleTo(userId) } });
  if (!ex) throw new NotFoundError("Exercise not found");
  return ex;
}

const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "exercise";

/**
 * Finds or creates the user's custom exercises for names the library couldn't
 * match (e.g. from an imported routine). Reuses an existing custom exercise
 * with the same name (case-insensitive). Returns name → exercise id.
 */
export async function ensureCustomExercises(userId: string, items: { name: string; repMin: number; repMax: number }[]) {
  const out = new Map<string, string>();
  for (const it of items) {
    const name = it.name.trim().replace(/\s+/g, " ").slice(0, 80);
    const key = name.toLowerCase();
    if (!name || out.has(key)) continue;
    const existing = await db.exercise.findFirst({ where: { ownerId: userId, name: { equals: name, mode: "insensitive" } }, select: { id: true } });
    if (existing) { out.set(key, existing.id); continue; }
    const created = await db.exercise.create({
      data: {
        ownerId: userId, name, slug: `custom-${userId.slice(-6)}-${slugify(name)}-${randomToken(4).toLowerCase().replace(/[^a-z0-9]/g, "")}`,
        category: "custom", primaryMuscles: [], secondaryMuscles: [], equipment: [], difficulty: "intermediate",
        movementType: "custom", movementPattern: "custom", instructions: [], commonMistakes: [], tips: [],
        repMin: Math.max(1, Math.min(it.repMin, it.repMax)), repMax: Math.max(it.repMin, it.repMax), restSec: 90,
      },
      select: { id: true },
    });
    out.set(key, created.id);
  }
  return out;
}

export async function getExerciseDetail(slug: string, userId: string) {
  const ex = await db.exercise.findFirst({
    where: { slug, ...visibleTo(userId) },
    include: { videos: { orderBy: { isPrimary: "desc" } }, alternatives: { orderBy: { rank: "asc" }, include: { alternative: { select: { id: true, slug: true, name: true, equipment: true, category: true } } } } },
  });
  if (!ex) return null;
  return {
    ...ex,
    isCustom: ex.ownerId != null,
    primaryMuscles: ex.primaryMuscles as string[], secondaryMuscles: ex.secondaryMuscles as string[], equipment: ex.equipment as string[],
    instructions: ex.instructions as string[], commonMistakes: ex.commonMistakes as string[], tips: ex.tips as string[],
    alternatives: ex.alternatives.map((a) => ({ ...a.alternative, equipment: a.alternative.equipment as string[] })),
  };
}

export async function getAlternativesForUser(userId: string, exerciseId: string, limit = 8) {
  const [lib, ctx, curated, target] = await Promise.all([
    getLibrary(), getUserContext(userId),
    db.exerciseAlternative.findMany({ where: { exerciseId }, orderBy: { rank: "asc" }, select: { alternativeId: true } }),
    db.exercise.findFirst({ where: { id: exerciseId, ...visibleTo(userId) }, select: LIB_SELECT }),
  ]);
  if (!target) return [];
  return rankAlternatives(toLib(target) as ExerciseLite, lib, {
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
