import { notFound } from "next/navigation";
import { CheckCircle2, Info, Target, TrendingUp, Trophy } from "lucide-react";
import { requireOnboardedUser } from "@/lib/server/auth";
import { getReport, type WeeklyMetrics } from "@/lib/server/services/reports";
import { getUserContext } from "@/lib/server/services/profile";
import type { CoachSummary } from "@/lib/domain/schemas";
import { PR_LABEL } from "@/lib/engines/records";
import { addDays, formatDay } from "@/lib/dates";
import { fmtWeight, toDisplayWeight, weightUnit } from "@/lib/units";
import { PageHeader } from "@/components/app/PageHeader";
import { Badge, Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/Stat";
import { Notice } from "@/components/ui/States";
import { MarkViewed } from "./MarkViewed";

export const metadata = { title: "Weekly report" };

export default async function Page({ params }: { params: Promise<{ week: string }> }) {
  const user = await requireOnboardedUser();
  const { week } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week)) notFound();
  const [r, ctx] = await Promise.all([getReport(user.id, week), getUserContext(user.id)]);
  if (!r) notFound();
  const m = r.metrics as unknown as WeeklyMetrics, c = r.coach as CoachSummary | null;
  const u = ctx.unit;
  const sec = (title: string, icon: React.ReactNode, items: string[]) => items.length > 0 && (
    <Card className="p-5"><h2 className="t-h3 mb-3 flex items-center gap-2">{icon}{title}</h2><ul className="t-body space-y-2 text-fg-2">{items.map((i) => <li key={i} className="flex gap-2"><span className="text-fg-3">•</span>{i}</li>)}</ul></Card>
  );
  return (
    <>
      <MarkViewed week={week} />
      <PageHeader back={{ href: "/progress/reports", label: "Reports" }} title={`Week of ${formatDay(week, { month: "long", day: "numeric" })}`} subtitle={`${formatDay(week, { month: "short", day: "numeric" })} – ${formatDay(addDays(week, 6), { month: "short", day: "numeric" })}${m.isComplete ? "" : " · week in progress"}`} />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Workouts" value={`${m.workoutsCompleted}/${m.workoutsPlanned || "—"}`} sub={m.missedSessions.length ? `Missed: ${m.missedSessions.join(", ")}` : m.workoutsCompleted ? "No missed sessions" : undefined} />
        <StatCard label="Avg calories" value={m.avgCalories?.toLocaleString() ?? "—"} unit={m.avgCalories ? "kcal" : undefined} sub={m.calorieTarget ? `Target ${m.calorieTarget}` : undefined} />
        <StatCard label="Avg protein" value={m.avgProtein ?? "—"} unit={m.avgProtein ? "g" : undefined} sub={m.proteinTarget ? `Hit on ${m.proteinDaysHit}/${m.nutritionDaysLogged} days` : undefined} />
        <StatCard label="Weight trend" value={m.weightChange == null ? "—" : `${m.weightChange > 0 ? "+" : ""}${toDisplayWeight(m.weightChange, u)}`} unit={m.weightChange == null ? undefined : weightUnit(u)} sub={m.weightEnd ? `Now ${fmtWeight(m.weightEnd, u)}` : "No weigh-ins"} />
      </div>
      {c && (
        <div className="space-y-4">
          <Card className="p-5"><div className="flex items-center justify-between gap-3"><h2 className="t-h2">{c.headline}</h2><Badge tone={r.coachSource === "ai" ? "accent" : "neutral"}>{r.coachSource === "ai" ? "AI coach" : "Coach summary"}</Badge></div></Card>
          {c.insufficientData && <Notice icon={<Info className="size-5" />} title="Not enough data yet">We only summarize what you've logged — there isn't enough this week for a full review.</Notice>}
          {sec("What went well", <CheckCircle2 className="size-5 text-success" />, c.wentWell)}
          {sec("What to improve", <Target className="size-5 text-warning" />, c.toImprove)}
          {sec("Next week", <TrendingUp className="size-5 text-accent" />, c.nextWeek)}
        </div>
      )}
      {(m.prs.length > 0 || m.strengthUp.length > 0) && (
        <Card className="mt-4 p-5">
          <h2 className="t-h3 mb-3 flex items-center gap-2"><Trophy className="size-5 text-accent" />Strength</h2>
          <ul className="t-small space-y-1.5 text-fg-2">
            {m.prs.map((p, i) => <li key={i}><b className="text-fg">{p.exercise}</b> — {PR_LABEL[p.type as keyof typeof PR_LABEL]}: {p.type === "most_reps" ? `${p.value} reps` : fmtWeight(p.value, u)}</li>)}
            {m.strengthUp.map((s) => <li key={s.exercise}><b className="text-fg">{s.exercise}</b> — e1RM {fmtWeight(s.from, u)} → {fmtWeight(s.to, u)}</li>)}
          </ul>
        </Card>
      )}
      <p className="t-small mt-6 text-fg-3">Summaries only use data you logged. They're general guidance, not medical advice.</p>
    </>
  );
}
