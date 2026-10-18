import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/server/auth";
import { getUserContext } from "@/lib/server/services/profile";
import { strengthOverview } from "@/lib/server/services/progress";
import { getExerciseDetail } from "@/lib/server/services/exercises";
import { formatDay, localDate } from "@/lib/dates";
import { fmtWeight, toDisplayWeight, weightUnit } from "@/lib/units";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/Stat";
import { EmptyState } from "@/components/ui/States";
import { BarChart, LineChart } from "@/components/ui/Charts";
import { ButtonLink } from "@/components/ui/Button";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireOnboardedUser();
  const ex = await getExerciseDetail((await params).slug);
  if (!ex) notFound();
  const [ctx, list] = await Promise.all([getUserContext(user.id), strengthOverview(user.id)]);
  const s = list.find((x) => x.exerciseId === ex.id);
  const u = ctx.unit, wu = weightUnit(u);
  return (
    <>
      <PageHeader back={{ href: "/progress/strength", label: "Strength" }} title={ex.name} subtitle="Performance over time" action={<ButtonLink href={`/workout/exercises/${ex.slug}`} variant="secondary" size="sm">Technique</ButtonLink>} />
      {!s ? <EmptyState title="Not logged yet" body="Log this exercise in a workout to start tracking it." /> : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Est. 1RM" value={toDisplayWeight(s.bestE1rm, u)} unit={wu} sub={s.change ? `${s.change > 0 ? "+" : ""}${s.change}% since first session` : undefined} />
            <StatCard label="Best weight" value={toDisplayWeight(s.bestWeight, u)} unit={wu} />
            <StatCard label="Best reps" value={s.bestReps} />
            <StatCard label="Sessions" value={s.sessions} sub={`Total volume ${fmtWeight(Math.round(s.totalVolume), u)}`} />
          </div>
          <Card className="p-5"><h2 className="t-h3 mb-3">Estimated 1RM</h2><LineChart label="e1RM" unit={` ${wu}`} points={s.points.map((p) => ({ x: formatDay(localDate(ctx.tz, p.date), { month: "short", day: "numeric" }), y: toDisplayWeight(p.e1rm, u) }))} /></Card>
          <Card className="p-5"><h2 className="t-h3 mb-3">Volume per session</h2><BarChart label="Volume" unit={` ${wu}`} points={s.points.map((p) => ({ x: formatDay(localDate(ctx.tz, p.date), { month: "short", day: "numeric" }), y: Math.round(toDisplayWeight(p.volume, u)) }))} /></Card>
        </div>
      )}
    </>
  );
}
