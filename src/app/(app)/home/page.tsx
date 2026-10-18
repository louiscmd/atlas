import Link from "next/link";
import { ArrowRight, Camera, Dumbbell, Flame, Moon, PlusCircle, Scale, Sparkles, Timer, Trophy } from "lucide-react";
import { requireOnboardedUser } from "@/lib/server/auth";
import { getUserContext } from "@/lib/server/services/profile";
import { estimateDayMinutes, getInProgressSession, getTodayWorkout } from "@/lib/server/services/workouts";
import { getDay } from "@/lib/server/services/nutrition";
import { weeklyStreak } from "@/lib/server/services/progress";
import { db } from "@/lib/server/db";
import { greeting, localDate } from "@/lib/dates";
import { GOALS, WEEKDAYS, labelOf } from "@/lib/domain/enums";
import { fmtNumber } from "@/lib/units";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { ProgressBar, ProgressRing } from "@/components/ui/Progress";
import { StartWorkoutButton } from "../workout/StartWorkoutButton";

export const metadata = { title: "Home" };

export default async function Home() {
  const user = await requireOnboardedUser();
  const ctx = await getUserContext(user.id);
  const [today, active, day, streak, lastPR] = await Promise.all([
    getTodayWorkout(user.id, ctx.tz), getInProgressSession(user.id), getDay(user.id, localDate(ctx.tz)),
    weeklyStreak(user.id, ctx.goals?.daysPerWeek ?? 3),
    db.personalRecord.findFirst({ where: { userId: user.id, achievedAt: { gte: new Date(Date.now() - 7 * 86400_000) } }, orderBy: { achievedAt: "desc" }, include: { exercise: { select: { name: true } } } }),
  ]);
  const t = day.target;
  const kcalLeft = t ? Math.round(t.calories - day.totals.calories) : null;
  const w = today.today;

  return (
    <div className="space-y-6">
      <header>
        <p className="t-small text-fg-2">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: ctx.tz })}</p>
        <h1 className="t-h1 mt-1">{greeting(ctx.tz)}, {ctx.profile?.firstName}</h1>
      </header>

      {/* What should I do today? */}
      {active ? (
        <Card className="anim-rise border-accent/40 p-5">
          <p className="t-caption text-accent">Workout in progress</p>
          <h2 className="t-h2 mt-1">{active.name}</h2>
          <p className="t-small mt-1 text-fg-2">Started {active.startedAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: ctx.tz })}</p>
          <ButtonLink href={`/workout/session/${active.id}`} size="lg" full className="mt-5" icon={<Timer className="size-5" />}>Resume workout</ButtonLink>
        </Card>
      ) : !today.plan ? (
        <Card className="anim-rise p-5">
          <p className="t-caption">Get started</p>
          <h2 className="t-h2 mt-1">Set up your training plan</h2>
          <p className="t-small mt-1 text-fg-2">Import what you already do, let us build a plan for your {labelOf(GOALS, ctx.goals?.primaryGoal).toLowerCase()} goal, or pick a program.</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <ButtonLink href="/workout/generate" icon={<Sparkles className="size-4" />}>Build my plan</ButtonLink>
            <ButtonLink href="/workout/import" variant="secondary">Import my routine</ButtonLink>
            <ButtonLink href="/workout/programs" variant="secondary">Browse programs</ButtonLink>
          </div>
        </Card>
      ) : w && !today.completedToday ? (
        <Card className="anim-rise p-5">
          <p className="t-caption text-accent">Today's workout</p>
          <h2 className="t-h1 mt-1">{w.name}</h2>
          <p className="t-body mt-1 text-fg-2">{w.focus || today.plan.name}</p>
          <div className="t-small mt-4 flex flex-wrap gap-x-5 gap-y-1 text-fg-2">
            <span className="inline-flex items-center gap-1.5"><Timer className="size-4" />~{estimateDayMinutes(w.exercises)} min</span>
            <span className="inline-flex items-center gap-1.5"><Dumbbell className="size-4" />{w.exercises.length} exercises</span>
            <span className="inline-flex items-center gap-1.5"><Flame className="size-4" />{labelOf(GOALS, today.plan.goal ?? ctx.goals?.primaryGoal) || today.plan.goal}</span>
          </div>
          <StartWorkoutButton dayId={w.id} className="mt-5" />
          <Link href="/workout" className="t-small mt-3 inline-flex items-center gap-1 text-fg-2 hover:text-fg">Preview exercises <ArrowRight className="size-3.5" /></Link>
        </Card>
      ) : (
        <Card className="anim-rise p-5">
          <p className="t-caption">{today.completedToday ? "Done for today" : "Rest day"}</p>
          <h2 className="t-h2 mt-1 flex items-center gap-2">{today.completedToday ? <><Trophy className="size-5 text-accent" />Workout complete</> : <><Moon className="size-5 text-fg-2" />Recover and refuel</>}</h2>
          <p className="t-small mt-1 text-fg-2">{today.next ? `Next up: ${today.next.name} on ${WEEKDAYS[today.next.weekday!]}.` : "Recovery is where progress happens."}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <StartWorkoutButton dayId={null} variant="secondary" label="Start a quick workout" />
            <ButtonLink href="/workout/plan" variant="ghost">View plan</ButtonLink>
          </div>
        </Card>
      )}

      {/* Nutrition */}
      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div><p className="t-caption">Nutrition today</p><h2 className="t-h3 mt-1">{kcalLeft == null ? "Set your targets" : kcalLeft >= 0 ? `${fmtNumber(kcalLeft)} kcal left` : `${fmtNumber(-kcalLeft)} kcal over target`}</h2></div>
          <Link href="/nutrition" className="t-small text-fg-2 hover:text-fg">Details</Link>
        </div>
        {t && (
          <div className="mt-4 flex items-center gap-6">
            <ProgressRing value={day.totals.calories} max={t.calories} size={104} label="Calories">
              <span className="t-stat text-xl">{fmtNumber(day.totals.calories)}</span>
              <span className="text-[11px] text-fg-3">/ {fmtNumber(t.calories)}</span>
            </ProgressRing>
            <div className="flex-1 space-y-3">
              {([["Protein", day.totals.protein, t.proteinG], ["Carbs", day.totals.carbs, t.carbsG], ["Fat", day.totals.fat, t.fatG]] as const).map(([k, v, max]) => (
                <div key={k}>
                  <div className="t-small mb-1 flex justify-between"><span className="text-fg-2">{k}</span><span className="tabular font-medium">{Math.round(v)} / {max} g</span></div>
                  <ProgressBar value={v} max={max} label={k} />
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Quick actions */}
      <section aria-label="Quick actions" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { href: "/nutrition/scan", label: "Scan food", icon: Camera },
          { href: "/nutrition/add", label: "Log food", icon: PlusCircle },
          { href: w ? "/workout" : "/workout/plan", label: "Start workout", icon: Dumbbell },
          { href: "/progress/weight", label: "Log weight", icon: Scale },
        ].map(({ href, label, icon: Icon }) => (
          <Link key={label} href={href} className="flex h-24 flex-col justify-between rounded-[var(--radius-card)] border border-line bg-surface p-4 transition-colors hover:bg-surface-2">
            <Icon className="size-5 text-accent" aria-hidden />
            <span className="font-semibold">{label}</span>
          </Link>
        ))}
      </section>

      {/* Progress strip */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-5">
          <p className="t-caption">This week</p>
          <p className="mt-2 flex items-baseline gap-1"><span className="t-stat text-[2rem]">{streak.thisWeek}</span><span className="text-fg-2">/ {ctx.goals?.daysPerWeek ?? 3} workouts</span></p>
          <p className="t-small mt-1 text-fg-2">{streak.streak > 0 ? `${streak.streak}-week streak of hitting your target` : "Hit your weekly target to start a streak"}</p>
        </Card>
        <Card className="p-5">
          <p className="t-caption">Latest record</p>
          {lastPR ? <><p className="t-h3 mt-2 flex items-center gap-2"><Trophy className="size-4 text-accent" />{lastPR.exercise.name}</p><p className="t-small mt-1 text-fg-2">New personal record this week</p></> : <p className="t-small mt-2 text-fg-2">Your PRs from the last 7 days will show here.</p>}
          <Link href="/progress" className="t-small mt-3 inline-flex items-center gap-1 text-fg-2 hover:text-fg">View progress <ArrowRight className="size-3.5" /></Link>
        </Card>
      </div>
    </div>
  );
}
