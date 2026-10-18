import { requireOnboardedUser } from "@/lib/server/auth";
import { getUserContext } from "@/lib/server/services/profile";
import { measurementsOverview } from "@/lib/server/services/progress";
import { MEASUREMENT_TYPES, labelOf } from "@/lib/domain/enums";
import { formatDay, localDate } from "@/lib/dates";
import { lengthUnit, toDisplayLength } from "@/lib/units";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { LineChart } from "@/components/ui/Charts";
import { LogMeasurement, EntryList } from "../MeasurementForms";
export const metadata = { title: "Measurements" };

export default async function Page() {
  const user = await requireOnboardedUser();
  const ctx = await getUserContext(user.id);
  const groups = await measurementsOverview(user.id);
  const u = ctx.unit;
  return (
    <>
      <PageHeader title="Measurements" subtitle="Tape measurements often show progress the scale misses." />
      <LogMeasurement type="waist" unit={u} label="Value" allowTypeSelect />
      {groups.length === 0 ? <EmptyState className="mt-5" title="No measurements yet" body="Measure waist, chest, arms, thighs, calves, hips or neck — or add your own." /> : (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {groups.map((g) => {
            const diff = Math.round((g.latest - g.first) * 10) / 10;
            return (
              <Card key={g.key} className="p-5">
                <div className="flex items-baseline justify-between"><h2 className="t-h3">{g.type === "custom" ? g.name : labelOf(MEASUREMENT_TYPES, g.type)}</h2><p className="tabular"><span className="t-stat text-xl">{toDisplayLength(g.latest, u)}</span> <span className="t-small text-fg-2">{lengthUnit(u)}</span></p></div>
                <p className="t-small tabular text-fg-2">{diff === 0 ? "No change" : `${diff > 0 ? "+" : ""}${toDisplayLength(diff, u)} ${lengthUnit(u)}`} since first entry · {g.entries.length} entries</p>
                {g.entries.length > 1 && <div className="mt-3"><LineChart height={120} label={g.type === "custom" ? g.name ?? "" : labelOf(MEASUREMENT_TYPES, g.type)} unit={` ${lengthUnit(u)}`} points={g.entries.map((e) => ({ x: formatDay(localDate(ctx.tz, e.measuredAt), { month: "short", day: "numeric" }), y: toDisplayLength(e.value, u) }))} /></div>}
              </Card>
            );
          })}
        </div>
      )}
      <EntryList title="All entries" unit={u} kind="length" entries={groups.flatMap((g) => g.entries.map((e) => ({ id: e.id, value: e.value, date: localDate(ctx.tz, e.measuredAt), label: g.type === "custom" ? g.name ?? "" : labelOf(MEASUREMENT_TYPES, g.type), at: +e.measuredAt }))).sort((a, b) => b.at - a.at)} />
    </>
  );
}
