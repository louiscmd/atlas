import Link from "next/link";
import { ArrowRight, Check, Minus, Trophy } from "lucide-react";
import type { Challenge, ChallengeWeek } from "@/lib/engines/challenge";
import { formatDay } from "@/lib/dates";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/Progress";
import { cn } from "@/lib/cn";

const STATUS_LABEL: Record<ChallengeWeek["status"], string> = { complete: "completed", missed: "missed", current: "in progress", upcoming: "upcoming" };

function headline(c: Challenge) {
  if (c.perfect) return "All 20 weeks completed — challenge conquered!";
  if (c.finished) return `Challenge finished: ${c.completed} of ${c.total} weeks completed`;
  if (!c.current) return "Starts this week";
  const left = Math.max(0, c.goal - c.current.count);
  return c.current.status === "complete" ? `Week ${c.current.index} ticked — great work` : `Week ${c.current.index}: ${left} more workout${left === 1 ? "" : "s"} to earn this week's tick`;
}

/** Tick marker. Status is conveyed by icon + text, not colour alone. */
function Tick({ w, size = "md" }: { w: ChallengeWeek; size?: "sm" | "md" }) {
  const s = size === "sm" ? "size-4" : "size-8";
  const i = size === "sm" ? "size-2.5" : "size-4";
  if (w.status === "complete") return <span className={cn("flex items-center justify-center rounded-full bg-accent text-accent-contrast", s, size === "md" && "anim-pop")}><Check className={i} strokeWidth={3} /></span>;
  if (w.status === "missed") return <span className={cn("flex items-center justify-center rounded-full bg-surface-3 text-fg-3", s)}><Minus className={i} /></span>;
  if (w.status === "current") return <span className={cn("flex items-center justify-center rounded-full border-2 border-accent text-accent", s)}>{size === "md" && <span className="text-[11px] font-bold tabular">{w.count}</span>}</span>;
  return <span className={cn("block rounded-full border-line-strong", size === "sm" ? "border-[1.5px]" : "border-2 border-dashed", s)} />;
}

export function ChallengeCard({ c }: { c: Challenge }) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="t-caption text-accent">20-week challenge</p>
          <h2 className="t-h2 mt-1 flex items-center gap-2">{c.perfect && <Trophy className="size-5 text-accent" />}{headline(c)}</h2>
          <p className="t-small mt-1 text-fg-2">Complete {c.goal} workouts in a week (Mon–Sun) to earn its tick. Ends {formatDay(c.endsOn, { month: "short", day: "numeric", year: "numeric" })}.</p>
        </div>
        <p className="tabular text-right"><span className="t-stat text-[2rem]">{c.completed}</span><span className="text-fg-2"> / {c.total}</span><span className="t-small block text-fg-3">weeks ticked</span></p>
      </div>
      <ProgressBar className="mt-4" value={c.completed} max={c.total} label={`${c.completed} of ${c.total} weeks completed`} showOver={false} />
      <ol className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-5" aria-label="Weeks">
        {c.weeks.map((w) => (
          <li key={w.index} aria-label={`Week ${w.index}, ${STATUS_LABEL[w.status]}, ${w.count} of ${c.goal} workouts`}
            className={cn("flex flex-col items-center gap-1.5 rounded-2xl border px-1 py-3 text-center", w.status === "current" ? "border-accent bg-accent-soft" : w.status === "complete" ? "border-accent/30 bg-surface" : "border-line bg-surface-2/50")}>
            <span className="text-[11px] font-semibold text-fg-2">Week {w.index}</span>
            <Tick w={w} />
            <span className={cn("text-[11px] tabular", w.status === "upcoming" ? "text-fg-3" : "text-fg-2")}>{w.status === "upcoming" ? formatDay(w.start, { month: "short", day: "numeric" }) : `${Math.min(w.count, c.goal)}/${c.goal}`}</span>
          </li>
        ))}
      </ol>
      <p className="t-small mt-4 flex flex-wrap gap-x-4 gap-y-1 text-fg-3" aria-hidden>
        <span className="inline-flex items-center gap-1.5"><span className="flex size-3.5 items-center justify-center rounded-full bg-accent text-accent-contrast"><Check className="size-2.5" strokeWidth={3} /></span>Completed</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-3.5 rounded-full border-2 border-accent" />This week</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-3.5 rounded-full bg-surface-3" />Missed</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-3.5 rounded-full border-2 border-dashed border-line-strong" />Upcoming</span>
      </p>
    </Card>
  );
}

/** Compact version for the Home screen. */
export function ChallengeSummary({ c }: { c: Challenge }) {
  return (
    <Link href="/progress#challenge" className="block rounded-[var(--radius-card)] border border-line bg-surface p-5 transition-colors hover:bg-surface-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="t-caption text-accent">20-week challenge</p>
          <p className="t-h3 mt-1">{c.current ? `Week ${c.current.index} of ${c.total} · ${Math.min(c.current.count, c.goal)}/${c.goal} workouts` : headline(c)}</p>
        </div>
        <p className="tabular shrink-0"><span className="t-stat text-xl">{c.completed}</span><span className="t-small text-fg-2">/{c.total} ✓</span></p>
      </div>
      <ol className="mt-3 flex flex-wrap gap-1.5" aria-label={`${c.completed} of ${c.total} weeks completed`}>
        {c.weeks.map((w) => <li key={w.index} title={`Week ${w.index}: ${STATUS_LABEL[w.status]}`}><Tick w={w} size="sm" /></li>)}
      </ol>
      <span className="t-small mt-3 inline-flex items-center gap-1 text-fg-2">View challenge <ArrowRight className="size-3.5" /></span>
    </Link>
  );
}
