import "server-only";
import { db } from "../db";
import { smoothTrend, estimate1RM, totalVolume } from "@/lib/engines/performance";
import { NotFoundError } from "./plans";
import { deleteStored, saveFile } from "../storage";

export async function weightSeries(userId: string, days = 180) {
  const since = new Date(Date.now() - days * 86400_000);
  const rows = await db.progressMeasurement.findMany({ where: { userId, type: "weight", measuredAt: { gte: since } }, orderBy: { measuredAt: "asc" } });
  const all = await db.progressMeasurement.findFirst({ where: { userId, type: "weight" }, orderBy: { measuredAt: "asc" } });
  const trend = smoothTrend(rows.map((r) => ({ date: r.measuredAt, value: r.value })));
  return { entries: rows, trend, start: all?.value ?? null, current: rows.at(-1)?.value ?? null, currentTrend: trend.at(-1)?.trend ?? null };
}

export async function addMeasurement(userId: string, type: string, value: number, measuredAt?: Date, customName?: string | null, note?: string | null) {
  const allowed = ["weight", "waist", "chest", "arm", "thigh", "calf", "hips", "neck", "custom"];
  if (!allowed.includes(type)) throw new Error("Unknown measurement");
  const [lo, hi] = type === "weight" ? [25, 400] : [5, 300];
  if (!(value >= lo && value <= hi)) throw new Error(`Enter a value between ${lo} and ${hi}`);
  if (type === "custom" && !customName?.trim()) throw new Error("Name your custom measurement");
  return db.progressMeasurement.create({ data: { userId, type, value, measuredAt: measuredAt ?? new Date(), customName: type === "custom" ? customName!.trim().slice(0, 40) : null, note: note?.slice(0, 200) || null } });
}

export async function deleteMeasurement(userId: string, id: string) {
  const r = await db.progressMeasurement.deleteMany({ where: { id, userId } });
  if (!r.count) throw new NotFoundError("Entry not found");
}

export async function measurementsOverview(userId: string) {
  const rows = await db.progressMeasurement.findMany({ where: { userId, type: { not: "weight" } }, orderBy: { measuredAt: "asc" } });
  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = r.type === "custom" ? `custom:${r.customName}` : r.type;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  return [...groups.entries()].map(([key, entries]) => ({ key, type: entries[0].type, name: entries[0].customName, entries, first: entries[0].value, latest: entries.at(-1)!.value }));
}

/** Strength analytics for every exercise the user has logged. */
export async function strengthOverview(userId: string) {
  const sets = await db.workoutSet.findMany({ where: { userId, session: { status: "completed" } }, select: { exerciseId: true, weightKg: true, reps: true, sessionId: true, completedAt: true, exercise: { select: { name: true, slug: true, isTimed: true } } }, orderBy: { completedAt: "asc" } });
  const byEx = new Map<string, typeof sets>();
  for (const s of sets) byEx.set(s.exerciseId, [...(byEx.get(s.exerciseId) ?? []), s]);
  return [...byEx.entries()].map(([exerciseId, list]) => {
    const sessions = new Map<string, typeof list>();
    for (const s of list) sessions.set(s.sessionId, [...(sessions.get(s.sessionId) ?? []), s]);
    const points = [...sessions.values()].map((ss) => ({ date: ss[0].completedAt, e1rm: Math.max(...ss.map((s) => estimate1RM(s.weightKg, s.reps))), volume: totalVolume(ss), bestWeight: Math.max(...ss.map((s) => s.weightKg)), bestReps: Math.max(...ss.map((s) => s.reps)) }));
    const first = points[0], last = points.at(-1)!;
    return {
      exerciseId, name: list[0].exercise.name, slug: list[0].exercise.slug, isTimed: list[0].exercise.isTimed, sessions: points.length, points,
      bestWeight: Math.max(...points.map((p) => p.bestWeight)), bestReps: Math.max(...points.map((p) => p.bestReps)), bestE1rm: Math.max(...points.map((p) => p.e1rm)),
      totalVolume: points.reduce((s, p) => s + p.volume, 0), change: first.e1rm ? Math.round(((last.e1rm - first.e1rm) / first.e1rm) * 1000) / 10 : 0,
      lastDate: last.date,
    };
  }).sort((a, b) => +b.lastDate - +a.lastDate);
}

export async function listPhotos(userId: string) {
  return db.progressPhoto.findMany({ where: { userId }, orderBy: { takenAt: "desc" }, select: { id: true, pose: true, takenAt: true, bodyWeightKg: true, note: true } });
}

export async function addPhoto(userId: string, buf: Buffer, mimeType: string, pose: string, note: string | null) {
  if (!["front", "side", "back"].includes(pose)) throw new Error("Choose front, side or back");
  const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const storageKey = await saveFile(`photos-${userId}`, buf, ext);
  const weight = await db.progressMeasurement.findFirst({ where: { userId, type: "weight" }, orderBy: { measuredAt: "desc" } });
  return db.progressPhoto.create({ data: { userId, pose, storageKey, mimeType, bodyWeightKg: weight?.value ?? null, note: note?.slice(0, 200) || null } });
}

export async function getPhotoFile(userId: string, id: string) {
  const p = await db.progressPhoto.findFirst({ where: { id, userId } });
  if (!p) throw new NotFoundError("Photo not found");
  return p;
}

export async function deletePhoto(userId: string, id: string) {
  const p = await getPhotoFile(userId, id);
  await db.progressPhoto.delete({ where: { id } });
  await deleteStored(p.storageKey);
}

export async function consistency(userId: string, weeks = 8) {
  const since = new Date(Date.now() - weeks * 7 * 86400_000);
  const sessions = await db.workoutSession.findMany({ where: { userId, status: "completed", completedAt: { gte: since } }, select: { completedAt: true } });
  return sessions.map((s) => s.completedAt!);
}

/** Consecutive weeks (ending this week) that hit the plan's weekly target. */
export async function weeklyStreak(userId: string, daysPerWeek: number) {
  const sessions = await consistency(userId, 26);
  const weekKey = (d: Date) => { const x = new Date(d); x.setUTCHours(0, 0, 0, 0); x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); return x.toISOString().slice(0, 10); };
  const counts = new Map<string, number>();
  for (const s of sessions) counts.set(weekKey(s), (counts.get(weekKey(s)) ?? 0) + 1);
  let streak = 0;
  const cur = new Date();
  const thisWeek = weekKey(cur);
  for (let i = 0; i < 26; i++) {
    const d = new Date(cur.getTime() - i * 7 * 86400_000);
    const k = weekKey(d);
    const hit = (counts.get(k) ?? 0) >= Math.max(1, daysPerWeek);
    if (hit) streak++;
    else if (k !== thisWeek) break; // current week may still be in progress
  }
  return { streak, thisWeek: counts.get(thisWeek) ?? 0 };
}
