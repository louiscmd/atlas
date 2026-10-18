import Link from "next/link";
import { CalendarDays, Dumbbell, Moon, Timer, Trophy } from "lucide-react";
import { requireOnboardedUser } from "@/lib/server/auth";
import { getUserContext } from "@/lib/server/services/profile";
import { estimateDayMinutes, getInProgressSession, getTodayWorkout } from "@/lib/server/services/workouts";
import { WEEKDAYS, WEEKDAYS_SHORT } from "@/lib/domain/enums";
import { localDate, weekdayOf } from "@/lib/dates";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { PageHeader } from "@/components/app/PageHeader";
import { cn } from "@/lib/cn";
import { StartWorkoutButton } from "./StartWorkoutButton";

export const metadata = { title: "Today's workout" };

export default async function TodayPage() {
  const user = await requireOnboardedUser();
  const ctx = await getUserContext(user.id);
  const [t, active] = await Promise.all([getTodayWorkout(user.id, ctx.tz), getInProgressSession(user.id)]);
  const todayWd = weekdayOf(localDate(ctx.tz));

  if (!t.plan) {
    return (
      <>
        <PageHeader title="Today" />
        <EmptyState icon={<Dumbbell className="size-6" />} title="No training plan yet" body="Your workouts will appear here once you have a plan." actions={<><ButtonLink href="/workout/generate">Build my weekly plan</ButtonLink><ButtonLink href="/workout/import" variant="secondary">Import my routine</ButtonLink><ButtonLink href="/workout/programs" variant="ghost">Browse programs</ButtonLink></>} />
        <div className="mt-6 text-center"><StartWorkoutButton dayId={null} variant="secondary" label="Start an empty workout" /></div>
      </>
    );
  }
  const day = t.today;
  return (
    <>
      <PageHeader title={day ? `${WEEKDAYS[todayWd]} — ${day.name}` : "Rest day"} subtitle={day ? day.focus : t.next ? `Next: ${t.next.name} on ${WEEKDAYS[t.next.weekday!]}` : "Enjoy the recovery."} />

      {/* Week strip */}
      <ol className="mb-6 grid grid-cols-7 gap-1.5" aria-label="This week">
        {WEEKDAYS_SHORT.map((w, i) => {
          const d = t.plan!.days.find((x) => x.weekday === i);
          return (
            <li key={w} className={cn("rounded-xl border px-1 py-2.5 text-center", i === todayWd ? "border-accent bg-accent-soft" : "border-line bg-surface")}>
              <p className="text-[11px] font-semibold text-fg-3">{w}</p>
              <p className={cn("mt-1 truncate text-[11px] font-medium", d ? "text-fg" : "text-fg-3")}>{d ? d.name.split(" ")[0] : "Rest"}</p>
            </li>
          );
        })}
      </ol>

      {active && (
        <Card className="mb-5 flex items-center justify-between gap-4 border-accent/40 p-4">
          <div><p className="font-semibold">{active.name} is in progress</p><p className="t-small text-fg-2">Pick up where you left off.</p></div>
          <ButtonLink href={`/workout/session/${active.id}`} icon={<Timer className="size-4" />}>Resume</ButtonLink>
        </Card>
      )}

      {day ? (
        <Card className="p-5">
          <div className="t-small mb-5 flex flex-wrap gap-x-5 gap-y-1 text-fg-2">
            <span className="inline-flex items-center gap-1.5"><Timer className="size-4" />Estimated duration: <b className="text-fg">{estimateDayMinutes(day.exercises)} min</b></span>
            <span className="inline-flex items-center gap-1.5"><Dumbbell className="size-4" />{day.exercises.length} exercises</span>
          </div>
          {day.warmup && <p className="t-small mb-4 rounded-xl bg-surface-2 p-3 text-fg-2"><b className="text-fg">Warm-up:</b> {day.warmup}</p>}
          <ol className="mb-6 divide-y divide-line">
            {day.exercises.map((e, i) => (
              <li key={e.id} className="flex items-center gap-4 py-3">
                <span className="t-stat flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-sm text-fg-2">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <Link href={`/workout/exercises/${e.exercise.slug}`} className="font-semibold hover:text-accent">{e.exercise.name}</Link>
                  <p className="t-small tabular text-fg-2">{e.sets} × {e.repMin === e.repMax ? e.repMin : `${e.repMin}–${e.repMax}`}{e.exercise.isTimed ? " s/min" : ""} · rest {Math.round(e.restSec / 15) * 15}s{e.rirTarget != null ? ` · RIR ${e.rirTarget}` : ""}</p>
                </div>
              </li>
            ))}
          </ol>
          {t.completedToday ? <p className="flex items-center justify-center gap-2 font-semibold text-success"><Trophy className="size-5" />Completed today — great work.</p> : !active && <StartWorkoutButton dayId={day.id} />}
        </Card>
      ) : (
        <EmptyState icon={<Moon className="size-6" />} title="No workout scheduled today" body="Rest days help you recover and come back stronger. Want to train anyway?" actions={<><StartWorkoutButton dayId={null} variant="secondary" label="Start a quick workout" /><ButtonLink href="/workout/plan" variant="ghost" icon={<CalendarDays className="size-4" />}>View plan</ButtonLink></>} />
      )}
    </>
  );
}
