import Link from "next/link";
import { Camera, ChevronLeft, ChevronRight, Info, PlusCircle, Settings2 } from "lucide-react";
import { requireOnboardedUser } from "@/lib/server/auth";
import { getUserContext } from "@/lib/server/services/profile";
import { getDay } from "@/lib/server/services/nutrition";
import { addDays, formatDay, localDate } from "@/lib/dates";
import { fmtNumber } from "@/lib/units";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { ProgressBar, ProgressRing } from "@/components/ui/Progress";
import { EmptyState } from "@/components/ui/States";
import { MealSection } from "./MealSection";
import { WaterCard } from "./WaterCard";

export const metadata = { title: "Nutrition" };

export default async function NutritionToday({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const user = await requireOnboardedUser();
  const ctx = await getUserContext(user.id);
  const today = localDate(ctx.tz);
  const sp = (await searchParams).date;
  const date = sp && /^\d{4}-\d{2}-\d{2}$/.test(sp) && sp <= today ? sp : today;
  const day = await getDay(user.id, date);
  const t = day.target;
  const isToday = date === today;
  const left = t ? Math.round(t.calories - day.totals.calories) : 0;

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Link href={`/nutrition?date=${addDays(date, -1)}`} aria-label="Previous day" className="rounded-lg p-2 text-fg-2 hover:bg-surface"><ChevronLeft className="size-5" /></Link>
          <h1 className="t-h1">{isToday ? "Today" : formatDay(date)}</h1>
          {!isToday && <Link href={`/nutrition?date=${addDays(date, 1)}`} aria-label="Next day" className="rounded-lg p-2 text-fg-2 hover:bg-surface"><ChevronRight className="size-5" /></Link>}
        </div>
        <Link href="/nutrition/targets" className="t-small inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-fg-2 hover:bg-surface"><Settings2 className="size-4" />Targets</Link>
      </header>

      {t && (
        <Card className="p-5">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <ProgressRing value={day.totals.calories} max={t.calories} size={150} stroke={12} label="Calories">
              <span className="t-stat text-[2rem]">{fmtNumber(day.totals.calories)}</span>
              <span className="t-small text-fg-3">of {fmtNumber(t.calories)} kcal</span>
            </ProgressRing>
            <div className="w-full flex-1 space-y-4">
              <p className="t-h3">{left >= 0 ? <><span className="t-stat">{fmtNumber(left)}</span> kcal remaining</> : <><span className="t-stat">{fmtNumber(-left)}</span> kcal over target</>}</p>
              {([["Protein", day.totals.protein, t.proteinG], ["Carbs", day.totals.carbs, t.carbsG], ["Fat", day.totals.fat, t.fatG]] as const).map(([k, v, max]) => (
                <div key={k}>
                  <div className="t-small mb-1.5 flex justify-between"><span className="font-medium">{k}</span><span className="tabular text-fg-2"><b className="text-fg">{Math.round(v)}</b> / {max} g{v >= max * 0.95 && v <= max * 1.1 ? " ✓" : ""}</span></div>
                  <ProgressBar value={v} max={max} label={`${k} ${Math.round(v)} of ${max} grams`} />
                </div>
              ))}
            </div>
          </div>
          <dl className="t-small mt-5 grid grid-cols-4 gap-2 border-t border-line pt-4 text-center">
            {([["Fiber", day.totals.fiber, "g"], ["Sugar", day.totals.sugar, "g"], ["Sodium", day.totals.sodiumMg, "mg"], ["Sat. fat", day.totals.satFat, "g"]] as const).map(([k, v, u]) => (
              <div key={k}><dt className="text-fg-3">{k}</dt><dd className="tabular mt-0.5 font-semibold">{Math.round(v)}{u}</dd></div>
            ))}
          </dl>
          {day.hasEstimates && <p className="t-small mt-4 flex items-center gap-2 text-fg-3"><Info className="size-4 shrink-0" />Includes estimated entries (AI scans or quick adds), marked with “≈”.</p>}
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <ButtonLink href="/nutrition/scan" size="lg" icon={<Camera className="size-5" />}>Scan Food</ButtonLink>
        <ButtonLink href={`/nutrition/add?date=${date}`} size="lg" variant="secondary" icon={<PlusCircle className="size-5" />}>Add Food</ButtonLink>
      </div>

      {day.logs.length === 0 && (
        <EmptyState title={isToday ? "You haven't logged anything today." : "Nothing logged on this day."} body="Snap a photo of your meal or search our food database." />
      )}

      <div className="space-y-3">
        {day.byMeal.map((m) => (m.key !== "supplement" || m.items.length > 0) && <MealSection key={m.key} meal={{ key: m.key, label: m.label, totals: m.totals, items: m.items.map((i) => ({ id: i.id, name: i.name, amountLabel: i.amountLabel, servings: i.servings, calories: i.calories, protein: i.protein, carbs: i.carbs, fat: i.fat, isEstimate: i.isEstimate, source: i.source })) }} date={date} />)}
      </div>
      <WaterCard date={date} totalMl={day.waterMl} targetMl={t?.waterMl ?? 2500} />
      {!day.byMeal.find((m) => m.key === "supplement")?.items.length && <p className="t-small text-center text-fg-3">Take supplements? <Link href={`/nutrition/add?date=${date}&meal=supplement`} className="text-fg-2 underline">Log them here</Link>.</p>}
    </div>
  );
}
