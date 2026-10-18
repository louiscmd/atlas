import { requireOnboardedUser } from "@/lib/server/auth";
import { getUserContext } from "@/lib/server/services/profile";
import { weightSeries } from "@/lib/server/services/progress";
import { formatDay, localDate } from "@/lib/dates";
import { toDisplayWeight, weightUnit } from "@/lib/units";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/Stat";
import { LineChart } from "@/components/ui/Charts";
import { EmptyState } from "@/components/ui/States";
import { LogMeasurement, EntryList } from "../MeasurementForms";
export const metadata = { title: "Body weight" };

export default async function Page() {
  const user = await requireOnboardedUser();
  const ctx = await getUserContext(user.id);
  const w = await weightSeries(user.id, 365);
  const u = ctx.unit, wu = weightUnit(u);
  const d = (kg: number | null | undefined) => (kg == null ? "—" : toDisplayWeight(kg, u));
  const change = w.start != null && w.currentTrend != null ? Math.round((w.currentTrend - w.start) * 10) / 10 : null;
  return (
    <>
      <PageHeader title="Body weight" subtitle="We show a smoothed trend so daily water swings don't distract you." />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Current" value={d(w.current)} unit={wu} />
        <StatCard label="Trend" value={d(w.currentTrend)} unit={wu} />
        <StatCard label="Starting" value={d(w.start)} unit={wu} />
        <StatCard label="Change" value={change == null ? "—" : `${change > 0 ? "+" : ""}${toDisplayWeight(change, u)}`} unit={wu} sub={ctx.goals?.goalWeightKg ? `Goal ${d(ctx.goals.goalWeightKg)} ${wu}` : undefined} />
      </div>
      <LogMeasurement type="weight" unit={u} label="Log weight" />
      {w.entries.length < 2 ? <EmptyState className="mt-5" title={w.entries.length ? "One entry so far" : "No weigh-ins yet"} body="Weigh in a few times a week, ideally in the morning, to see a reliable trend." /> : (
        <Card className="mt-5 p-5">
          <h2 className="t-h3 mb-3">Trend</h2>
          <LineChart label="Trend" y2Label="Weigh-in" unit={` ${wu}`} target={ctx.goals?.goalWeightKg ? toDisplayWeight(ctx.goals.goalWeightKg, u) : null}
            points={w.trend.map((t) => ({ x: formatDay(localDate(ctx.tz, t.date), { month: "short", day: "numeric" }), y: toDisplayWeight(t.trend, u), y2: toDisplayWeight(t.value, u) }))} />
        </Card>
      )}
      <EntryList title="Entries" unit={u} kind="weight" entries={[...w.entries].reverse().map((e) => ({ id: e.id, value: e.value, date: localDate(ctx.tz, e.measuredAt) }))} />
    </>
  );
}
