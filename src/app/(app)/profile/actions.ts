"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod/v4";
import { requireOnboardedUser, destroySession } from "@/lib/server/auth";
import { run } from "@/lib/server/action";
import { db } from "@/lib/server/db";
import { env } from "@/lib/server/env";
import { deleteUserAccount, updateEquipment } from "@/lib/server/services/profile";
import { setNotificationPref } from "@/lib/server/services/notifications";
import { ACTIVITY_LEVELS, EXPERIENCE, GOALS, LOCATIONS, MUSCLES, SESSION_LENGTHS, keys } from "@/lib/domain/enums";

const refresh = () => revalidatePath("/", "layout");

export async function updatePersonal(input: { firstName: string; age: number; sex: string; heightCm: number; unitSystem: string; timezone: string; activityLevel: string }) {
  const user = await requireOnboardedUser();
  return run(async () => {
    const d = z.object({ firstName: z.string().trim().min(1).max(40), age: z.number().int().min(13).max(100), sex: z.enum(["male", "female", "other"]), heightCm: z.number().min(120).max(230), unitSystem: z.enum(["metric", "imperial"]), timezone: z.string().min(1).max(64), activityLevel: z.enum(keys(ACTIVITY_LEVELS)) }).parse(input);
    try { new Intl.DateTimeFormat("en-US", { timeZone: d.timezone }); } catch { throw new Error("That time zone isn't recognized (e.g. Europe/Warsaw)"); }
    await db.userProfile.update({ where: { userId: user.id }, data: { firstName: d.firstName, birthYear: new Date().getFullYear() - d.age, sex: d.sex, heightCm: d.heightCm, unitSystem: d.unitSystem, timezone: d.timezone, activityLevel: d.activityLevel } });
    refresh();
  });
}

export async function updateTraining(input: { primaryGoal: string; secondaryGoal: string | null; goalWeightKg: number | null; experience: string; daysPerWeek: number; sessionLength: string; availableDays: number[]; trainingLocation: string; musclePriorities: string[] }) {
  const user = await requireOnboardedUser();
  return run(async () => {
    const d = z.object({ primaryGoal: z.enum(keys(GOALS)), secondaryGoal: z.enum(keys(GOALS)).nullable(), goalWeightKg: z.number().min(30).max(300).nullable(), experience: z.enum(keys(EXPERIENCE)), daysPerWeek: z.number().int().min(1).max(7), sessionLength: z.enum(keys(SESSION_LENGTHS)), availableDays: z.array(z.number().int().min(0).max(6)).max(7), trainingLocation: z.enum(keys(LOCATIONS)), musclePriorities: z.array(z.enum(keys(MUSCLES))).max(4) }).parse(input);
    await db.$transaction([
      db.userGoals.update({ where: { userId: user.id }, data: { primaryGoal: d.primaryGoal, secondaryGoal: d.secondaryGoal, goalWeightKg: d.goalWeightKg, daysPerWeek: d.daysPerWeek, sessionLength: d.sessionLength, availableDays: [...new Set(d.availableDays)].sort(), trainingLocation: d.trainingLocation, musclePriorities: d.musclePriorities } }),
      db.userProfile.update({ where: { userId: user.id }, data: { experience: d.experience } }),
    ]);
    refresh();
  });
}

export async function saveEquipment(list: string[]) {
  const user = await requireOnboardedUser();
  return run(async () => { await updateEquipment(user.id, z.array(z.string().max(20)).max(20).parse(list)); refresh(); });
}

export async function restrictionOp(op: { type: "remove"; id: string } | { type: "injury"; note: string }) {
  const user = await requireOnboardedUser();
  return run(async () => {
    if (op.type === "remove") await db.userRestrictions.deleteMany({ where: { id: z.string().max(64).parse(op.id), userId: user.id } });
    else {
      await db.userRestrictions.deleteMany({ where: { userId: user.id, type: "injury" } });
      const note = z.string().max(500).parse(op.note).trim();
      if (note) await db.userRestrictions.create({ data: { userId: user.id, type: "injury", note } });
    }
    refresh();
  });
}

export async function setNotification(category: string, enabled: boolean) {
  const user = await requireOnboardedUser();
  return run(async () => { await setNotificationPref(user.id, z.string().max(30).parse(category), !!enabled); });
}

export async function setPreferences(input: { theme?: "dark" | "light"; analyticsOptIn?: boolean; defaultRestSec?: number; weightIncrementKg?: number }) {
  const user = await requireOnboardedUser();
  return run(async () => {
    const d = z.object({ theme: z.enum(["dark", "light"]).optional(), analyticsOptIn: z.boolean().optional(), defaultRestSec: z.number().int().min(15).max(600).optional(), weightIncrementKg: z.number().min(0.5).max(10).optional() }).parse(input);
    await db.userPreferences.upsert({ where: { userId: user.id }, create: { userId: user.id, restByExercise: {}, notifications: {}, ...d }, update: d });
    if (d.theme) (await cookies()).set("forma_theme", d.theme, { path: "/", sameSite: "lax", secure: env.isProd, maxAge: 60 * 60 * 24 * 365 });
    refresh();
  });
}

/** Permanently deletes the account and all associated data, including stored photos. */
export async function deleteAccount(confirmText: string) {
  const user = await requireOnboardedUser();
  const res = await run(async () => {
    if (confirmText.trim().toUpperCase() !== "DELETE") throw new Error("Type DELETE to confirm");
    await deleteUserAccount(user.id);
  });
  if (!res.ok) return res;
  await destroySession();
  redirect("/?deleted=1");
}
