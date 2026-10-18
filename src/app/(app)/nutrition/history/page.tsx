import { requireOnboardedUser } from "@/lib/server/auth";
import { getUserContext } from "@/lib/server/services/profile";
import { history } from "@/lib/server/services/nutrition";
import { formatDay } from "@/lib/dates";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/Stat";
import { EmptyState } from "@/components/ui/States";
import { BarChart } from "@/components/ui/Charts";
import { ButtonLink } from "@/components/ui/Button";
export const metadata = { title: "Nutrition history" };

export default async function Page({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const user = await requireOnboardedUser();
  const ctx = await getUserContext(user.id);
  const days = (await searchParams).range === "7" ? 7 : (await searchParams).range === "90" ? 90 : 30;
  const h = await history(user.id, ctx.tz, days);
  const pts = (k: "calories" | "protein") => h.series.map((d) => ({ x: formatDay(d.date, { month: "short", day: "numeric" }), y: d.logged ? Math.round(d[k]) : null }));
  return (
    <>
      <PageHeader title="Nutrition history" subtitle="Trends matter more than any single day." action={
        <div className="flex gap-1 rounded-xl border border-line bg-surface p-1">{[7, 30, 90].map((r) => <a key={r} href={`?range=${r}`} aria-current={r === days ? "page" : undefined} className={`t-small rounded-lg px-3 py-1.5 font-semibold ${r === days ? "bg-surface-3" : "text-fg-2"}`}>{r}d</a>)}</div>} />
      {h.loggedDays === 0 ? <EmptyState title="No nutrition logged yet" body="Once you log a few days, your averages and trends will appear here." actions={<ButtonLink href="/nutrition/add">Log food</ButtonLink>} /> : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Avg calories" value={h.averages.calories.toLocaleString()} unit="kcal" sub={h.target ? `Target ${h.target.calories}` : undefined} />
            <StatCard label="Avg protein" value={h.averages.protein} unit="g" sub={h.target ? `Target ${h.target.proteinG} g` : undefined} />
            <StatCard label="Avg carbs / fat" value={`${h.averages.carbs} / ${h.averages.fat}`} unit="g" />
            <StatCard label="Days logged" value={`${h.loggedDays}/${days}`} sub={`Protein target hit ${h.proteinHit}×`} />
          </div>
          <Card className="p-5"><h2 className="t-h3 mb-3">Calories</h2><BarChart points={pts("calories")} label="Calories" unit=" kcal" target={h.target?.calories} /></Card>
          <Card className="p-5"><h2 className="t-h3 mb-3">Protein</h2><BarChart points={pts("protein")} label="Protein" unit=" g" target={h.target?.proteinG} /></Card>
          <p className="t-small text-fg-3">Within ±10% of your calorie target on {h.withinCalories} of {h.loggedDays} logged days. Aim for consistency, not perfection — a day off target is normal.</p>
        </div>
      )}
    </>
  );
}
