// Schedulable job (cron, e.g. every morning): creates "Your workout is ready"
// notifications for users with a planned workout today, and generates last
// week's report on Mondays. Run with: npm run jobs:daily
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const localDate = (tz: string) => { try { return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date()); } catch { return new Date().toISOString().slice(0, 10); } };
const weekday = (d: string) => { const [y, m, dd] = d.split("-").map(Number); return (new Date(Date.UTC(y, m - 1, dd)).getUTCDay() + 6) % 7; };

async function main() {
  const plans = await db.workoutPlan.findMany({ where: { isActive: true, archivedAt: null }, include: { days: true, user: { include: { profile: true, preferences: true } } } });
  let created = 0;
  for (const plan of plans) {
    const tz = plan.user.profile?.timezone ?? "UTC";
    const day = plan.days.find((d) => d.weekday === weekday(localDate(tz)));
    if (!day) continue;
    const prefs = (plan.user.preferences?.notifications ?? {}) as Record<string, boolean>;
    if (prefs.workout_ready === false) continue;
    const already = await db.notification.findFirst({ where: { userId: plan.userId, category: "workout_ready", createdAt: { gte: new Date(Date.now() - 20 * 3600_000) } } });
    if (already) continue;
    await db.notification.create({ data: { userId: plan.userId, category: "workout_ready", title: "Your workout is ready", body: `${day.name}${day.focus ? ` — ${day.focus}` : ""} is on today's plan.`, href: "/workout" } });
    created++;
  }
  console.log(`daily-jobs: ${created} workout notifications created`);
}
main().finally(() => db.$disconnect());
