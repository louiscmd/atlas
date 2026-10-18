import Link from "next/link";
import { ChevronRight, History, Trophy } from "lucide-react";
import { requireOnboardedUser } from "@/lib/server/auth";
import { listHistory } from "@/lib/server/services/workouts";
import { getUserContext } from "@/lib/server/services/profile";
import { formatDuration } from "@/lib/dates";
import { fmtWeight } from "@/lib/units";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/ui/States";
import { Badge } from "@/components/ui/Card";
import { StartWorkoutButton } from "../StartWorkoutButton";
export const metadata = { title: "Workout history" };

export default async function Page() {
  const user = await requireOnboardedUser();
  const [items, ctx] = await Promise.all([listHistory(user.id, 60), getUserContext(user.id)]);
  return (
    <>
      <PageHeader title="Workout history" subtitle={items.length ? `${items.length} completed workout${items.length > 1 ? "s" : ""}` : undefined} />
      {items.length === 0 ? (
        <EmptyState icon={<History className="size-6" />} title="No workouts yet" body="Your first workout will appear here." actions={<StartWorkoutButton dayId={null} variant="primary" label="Start Workout" />} />
      ) : (
        <ul className="space-y-2">
          {items.map((s) => (
            <li key={s.id}>
              <Link href={`/workout/history/${s.id}`} className="flex items-center gap-4 rounded-2xl border border-line bg-surface px-4 py-4 transition-colors hover:bg-surface-2">
                <div className="w-12 shrink-0 text-center"><p className="t-caption">{s.completedAt!.toLocaleDateString("en-US", { month: "short", timeZone: ctx.tz })}</p><p className="t-stat text-xl">{s.completedAt!.toLocaleDateString("en-US", { day: "numeric", timeZone: ctx.tz })}</p></div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-semibold">{s.name}{s._count.records > 0 && <Badge tone="accent"><Trophy className="size-3" />{s._count.records} PR</Badge>}</p>
                  <p className="t-small tabular text-fg-2">{formatDuration(s.durationSec ?? 0)} · {s._count.sets} sets · {fmtWeight(Math.round(s.totalVolume), ctx.unit)}</p>
                  <p className="t-small truncate text-fg-3">{s.exercises.filter((e) => e.status !== "skipped").map((e) => e.exerciseName).join(", ")}</p>
                </div>
                <ChevronRight className="size-4 text-fg-3" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
