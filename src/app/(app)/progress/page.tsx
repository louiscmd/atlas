import Link from "next/link";
import { ArrowRight, CalendarCheck, Dumbbell, Salad, Scale, Trophy } from "lucide-react";
import { requireOnboardedUser } from "@/lib/server/auth";
import { getUserContext } from "@/lib/server/services/profile";
import { consistency, getChallenge, strengthOverview, weightSeries, weeklyStreak } from "@/lib/server/services/progress";
import { ChallengeCard } from "@/components/app/ChallengeCard";
import { history } from "@/lib/server/services/nutrition";
import { db } from "@/lib/server/db";
import { fmtWeight, toDisplayWeight, weightUnit } from "@/lib/units";
import { formatDay, localDate } from "@/lib/dates";
import { PR_LABEL } from "@/lib/engines/records";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { LineChart } from "@/components/ui/Charts";
import { cn } from "@/lib/cn";
export const metadata = { title: "Progress" };

export default async function Page() {
  const user = await requireOnboardedUser();
  const ctx = await getUserContext(user.id);
  const [w, strength, sessions, nut, streak, prs, challenge] = await Promise.all([
    weightSeries(user.id, 90), strengthOverview(user.id), consistency(user.id, 8), history(user.id, ctx.tz, 28), weeklyStreak(user.id, ctx.goals?.daysPerWeek ?? 3),
    db.personalRecord.findMany({ where: { userId: user.id }, orderBy: { achievedAt: "desc" }, take: 5, include: { exercise: { select: { name: true } } } }),
    getChallenge(user.id, ctx.tz),
  ]);
  const u = ctx.unit;
  const goalKg = ctx.goals?.goalWeightKg;
  // 8-week consistency grid
  const target = ctx.goals?.daysPerWeek ?? 3;
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const end = new Date(Date.now() - i * 7 * 86400_000);
    const start = new Date(end.getTime() - 7 * 86400_000);
    return sessions.filter((d) => d > start && d <= end).length;
  }).reverse();

  return (
    <>
      <PageHeader title="Progress" subtitle="The big picture of your training, nutrition and body." />
      <div id="challenge" className="mb-4 scroll-mt-24"><ChallengeCard c={challenge} /></div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-start justify-between"><h2 className="t-h3 flex items-center gap-2"><Scale className="size-4 text-accent" />Body weight</h2><Link href="/progress/weight" className="t-small text-fg-2 hover:text-fg">Details</Link></div>
          {w.entries.length ? (
            <>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <Stat size="sm" label="Trend" value={toDisplayWeight(w.currentTrend!, u)} unit={weightUnit(u)} />
                <Stat size="sm" label="Change" value={`${w.start != null && w.currentTrend != null ? (w.currentTrend - w.start > 0 ? "+" : "") + toDisplayWeight(w.currentTrend - w.start, u) : "—"}`} unit={weightUnit(u)} />
                <Stat size="sm" label="Goal" value={goalKg ? toDisplayWeight(goalKg, u) : "—"} unit={goalKg ? weightUnit(u) : undefined} />
              </div>
              {w.trend.length > 1 && <div className="mt-4"><LineChart height={140} label="Weight trend" points={w.trend.map((t) => ({ x: formatDay(localDate(ctx.tz, t.date), { month: "short", day: "numeric" }), y: toDisplayWeight(t.trend, u) }))} /></div>}
            </>
          ) : <p className="t-small mt-3 text-fg-2">Log your weight to see your trend.</p>}
        </Card>
        <Card className="p-5">
          <h2 className="t-h3 flex items-center gap-2"><CalendarCheck className="size-4 text-accent" />Workout consistency</h2>
          <p className="t-small mt-1 text-fg-2">{streak.streak > 0 ? `${streak.streak}-week streak` : "Hit your weekly target to build a streak"} · target {target}/week</p>
          <div className="mt-5 flex items-end gap-2" role="img" aria-label={`Workouts per week for the last 8 weeks: ${weeks.join(", ")}`}>
            {weeks.map((n, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <div className={cn("w-full rounded-t-[4px]", n >= target ? "bg-accent" : n > 0 ? "bg-accent/40" : "bg-surface-3")} style={{ height: `${Math.max(6, Math.min(1, n / Math.max(target, 1)) * 80)}px` }} />
                <span className="text-[11px] tabular text-fg-3">{n}</span>
              </div>
            ))}
          </div>
          <p className="t-small mt-2 text-fg-3">Last 8 weeks · {sessions.length} workouts</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-start justify-between"><h2 className="t-h3 flex items-center gap-2"><Dumbbell className="size-4 text-accent" />Strength</h2><Link href="/progress/strength" className="t-small text-fg-2 hover:text-fg">All exercises</Link></div>
          {strength.length ? (
            <ul className="mt-3 divide-y divide-line">
              {strength.slice(0, 4).map((s) => (
                <li key={s.exerciseId}><Link href={`/progress/strength/${s.slug}`} className="flex items-center justify-between py-2.5 hover:text-accent"><span className="font-medium">{s.name}</span><span className="t-small tabular text-fg-2">e1RM {fmtWeight(s.bestE1rm, u)} <span className={s.change > 0 ? "text-success" : s.change < 0 ? "text-danger" : ""}>{s.change > 0 ? "▲" : s.change < 0 ? "▼" : ""}{s.change ? ` ${Math.abs(s.change)}%` : ""}</span></span></Link></li>
              ))}
            </ul>
          ) : <p className="t-small mt-3 text-fg-2">Complete a workout to start tracking strength.</p>}
        </Card>
        <Card className="p-5">
          <div className="flex items-start justify-between"><h2 className="t-h3 flex items-center gap-2"><Salad className="size-4 text-accent" />Nutrition (4 weeks)</h2><Link href="/nutrition/history" className="t-small text-fg-2 hover:text-fg">History</Link></div>
          {nut.loggedDays ? (
            <div className="mt-4 grid grid-cols-3 gap-3">
              <Stat size="sm" label="Days logged" value={nut.loggedDays} unit="/ 28" />
              <Stat size="sm" label="Avg kcal" value={nut.averages.calories.toLocaleString()} />
              <Stat size="sm" label="Protein hit" value={nut.proteinHit} unit="days" />
            </div>
          ) : <p className="t-small mt-3 text-fg-2">Log meals to see nutrition consistency.</p>}
        </Card>
      </div>
      <Card className="mt-4 p-5">
        <h2 className="t-h3 flex items-center gap-2"><Trophy className="size-4 text-accent" />Recent personal records</h2>
        {prs.length ? <ul className="t-small mt-3 space-y-2">{prs.map((r) => <li key={r.id} className="flex justify-between gap-3"><span><b>{r.exercise.name}</b> <span className="text-fg-2">· {PR_LABEL[r.type as keyof typeof PR_LABEL]}</span></span><span className="tabular text-fg-3">{r.type === "most_reps" ? `${r.reps} reps` : fmtWeight(r.value, u)} · {r.achievedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: ctx.tz })}</span></li>)}</ul> : <p className="t-small mt-2 text-fg-2">PRs appear here as you beat your previous bests.</p>}
      </Card>
      <Link href="/progress/reports" className="mt-4 flex items-center justify-between rounded-[var(--radius-card)] border border-line bg-surface p-5 hover:bg-surface-2"><span><span className="t-h3 block">Weekly report</span><span className="t-small text-fg-2">Your AI coach's summary and next-week plan</span></span><ArrowRight className="size-5 text-fg-3" /></Link>
    </>
  );
}
