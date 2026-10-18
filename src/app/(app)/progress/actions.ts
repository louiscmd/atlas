"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import { requireOnboardedUser } from "@/lib/server/auth";
import { run } from "@/lib/server/action";
import { rateLimit } from "@/lib/server/rateLimit";
import * as p from "@/lib/server/services/progress";
import { getUserContext } from "@/lib/server/services/profile";
import { currentWeekStart } from "@/lib/server/services/reports";
import { generateWeeklyReport } from "@/lib/ai/services/coach";
import { addDays } from "@/lib/dates";
import { db } from "@/lib/server/db";
import { track } from "@/lib/server/analytics";

const refresh = () => { revalidatePath("/progress", "layout"); revalidatePath("/home"); };

export async function addMeasurement(input: { type: string; value: number; date?: string; customName?: string | null; note?: string | null }) {
  const user = await requireOnboardedUser();
  return run(async () => {
    const d = input.date ? new Date(`${z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(input.date)}T12:00:00Z`) : undefined;
    if (d && d > new Date(Date.now() + 86400_000)) throw new Error("That date is in the future");
    await p.addMeasurement(user.id, input.type, z.number().parse(input.value), d, input.customName, input.note);
    refresh();
  });
}

export async function deleteMeasurement(id: string) {
  const user = await requireOnboardedUser();
  return run(async () => { await p.deleteMeasurement(user.id, z.string().max(64).parse(id)); refresh(); });
}

export async function deletePhoto(id: string) {
  const user = await requireOnboardedUser();
  return run(async () => { await p.deletePhoto(user.id, z.string().max(64).parse(id)); refresh(); });
}

export async function createReport(which: "current" | "previous") {
  const user = await requireOnboardedUser();
  return run(async () => {
    const r = rateLimit(`report:${user.id}`, 10, 3600_000);
    if (!r.ok) throw new Error("You've generated several reports recently — try again later.");
    const ctx = await getUserContext(user.id);
    const ws = which === "current" ? currentWeekStart(ctx.tz) : addDays(currentWeekStart(ctx.tz), -7);
    await generateWeeklyReport(user.id, ctx.tz, ws);
    refresh();
    return ws;
  });
}

export async function markReportViewed(weekStart: string) {
  const user = await requireOnboardedUser();
  return run(async () => {
    const r = await db.weeklyReport.updateMany({ where: { userId: user.id, weekStart, viewedAt: null }, data: { viewedAt: new Date() } });
    if (r.count) await track(user.id, "weekly_report_viewed");
  });
}
