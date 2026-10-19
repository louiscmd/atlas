import Link from "next/link";
import { notFound } from "next/navigation";
import { Trophy } from "lucide-react";
import { requireOnboardedUser } from "@/lib/server/auth";
import { getSession } from "@/lib/server/services/workouts";
import { getUserContext } from "@/lib/server/services/profile";
import { NotFoundError } from "@/lib/server/services/plans";
import { PR_LABEL } from "@/lib/engines/records";
import { estimate1RM } from "@/lib/engines/performance";
import { formatDuration, localDate } from "@/lib/dates";
import { ChangeDate } from "./ChangeDate";
import { fmtWeight, toDisplayWeight, weightUnit } from "@/lib/units";
import { PageHeader } from "@/components/app/PageHeader";
import { Badge, Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/Stat";

export const metadata = { title: "Workout summary" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ completed?: string }> }) {
  const user = await requireOnboardedUser();
  const { id } = await params;
  const justCompleted = (await searchParams).completed === "1";
  const s = await getSession(user.id, id).catch((e) => { if (e instanceof NotFoundError) notFound(); throw e; });
  const ctx = await getUserContext(user.id);
  const u = weightUnit(ctx.unit);
  return (
    <>
      {justCompleted && (
        <div className="anim-rise mb-6 flex items-center gap-4 rounded-[var(--radius-card)] border border-accent/40 bg-accent-soft p-5">
          <span className="anim-pop flex size-14 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-contrast"><Trophy className="size-7" /></span>
          <div><p className="t-caption text-accent">Workout complete</p><p className="t-h3 mt-0.5">{s.records.length ? `Great session — ${s.records.length} new PR${s.records.length > 1 ? "s" : ""}!` : "Great session. It's logged."}</p></div>
        </div>
      )}
      <PageHeader back={{ href: "/workout/history", label: "History" }} title={s.name} subtitle={(s.completedAt ?? s.startedAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: ctx.tz })}
        action={s.status === "completed" && s.completedAt ? <ChangeDate sessionId={s.id} current={localDate(ctx.tz, s.completedAt)} today={localDate(ctx.tz)} /> : undefined} />
      <div className="mb-5 grid grid-cols-3 gap-3">
        <StatCard size="sm" label="Duration" value={formatDuration(s.durationSec ?? 0)} />
        <StatCard size="sm" label="Sets" value={s.exercises.reduce((n, e) => n + e.sets.length, 0)} />
        <StatCard size="sm" label="Volume" value={Math.round(toDisplayWeight(s.totalVolume, ctx.unit)).toLocaleString()} unit={u} />
      </div>
      {s.records.length > 0 && (
        <Card className="anim-pr mb-5 border-accent/50 p-5">
          <p className="mb-3 flex items-center gap-2"><Badge tone="accent">NEW PR</Badge><span className="font-semibold">{s.records.length} personal record{s.records.length > 1 ? "s" : ""}</span></p>
          <ul className="t-small space-y-1.5">{s.records.map((r) => <li key={r.id} className="flex items-center gap-2"><Trophy className="size-4 text-accent" /><b>{r.exercise.name}</b><span className="text-fg-2">— {PR_LABEL[r.type as keyof typeof PR_LABEL]}: {r.type === "most_reps" ? `${r.reps} reps @ ${fmtWeight(r.weightKg ?? 0, ctx.unit)}` : r.type === "best_session_volume" ? fmtWeight(r.value, ctx.unit) : fmtWeight(r.value, ctx.unit)}</span></li>)}</ul>
        </Card>
      )}
      <div className="space-y-3">
        {s.exercises.map((e) => (
          <Card key={e.id} className="p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <Link href={`/workout/exercises/${e.exercise.slug}`} className="t-h3 hover:text-accent">{e.exerciseName}</Link>
              {e.status === "skipped" ? <Badge>Skipped</Badge> : e.sets.length > 0 && <span className="t-small text-fg-3">Best e1RM {fmtWeight(Math.max(...e.sets.map((x) => estimate1RM(x.weightKg, x.reps))), ctx.unit)}</span>}
            </div>
            {e.replacedFrom && <p className="t-small -mt-2 mb-2 text-fg-3">Replaced {e.replacedFrom}</p>}
            {e.sets.length > 0 && <ol className="t-small tabular grid gap-1 sm:grid-cols-2">{e.sets.map((x) => <li key={x.id} className="flex justify-between rounded-lg bg-surface-2 px-3 py-2"><span className="text-fg-3">Set {x.setNumber}</span><span className="font-medium">{toDisplayWeight(x.weightKg, ctx.unit)} {u} × {x.reps}{x.rir != null ? ` · RIR ${x.rir}` : ""}</span></li>)}</ol>}
            {e.notes && <p className="t-small mt-3 text-fg-2">📝 {e.notes}</p>}
          </Card>
        ))}
      </div>
      {s.notes && <Card className="mt-3 p-5"><p className="t-caption mb-1">Notes</p><p className="text-fg-2">{s.notes}</p></Card>}
    </>
  );
}
