import Link from "next/link";
import { ChevronRight, Dumbbell } from "lucide-react";
import { requireOnboardedUser } from "@/lib/server/auth";
import { getUserContext } from "@/lib/server/services/profile";
import { strengthOverview } from "@/lib/server/services/progress";
import { fmtWeight } from "@/lib/units";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/ui/States";
import { ButtonLink } from "@/components/ui/Button";
export const metadata = { title: "Strength" };

export default async function Page() {
  const user = await requireOnboardedUser();
  const [ctx, list] = await Promise.all([getUserContext(user.id), strengthOverview(user.id)]);
  return (
    <>
      <PageHeader title="Strength" subtitle="Estimated 1RM, best sets and volume for every exercise you've logged." />
      {list.length === 0 ? <EmptyState icon={<Dumbbell className="size-6" />} title="No strength data yet" body="Finish a workout and your progression will show up here." actions={<ButtonLink href="/workout">Go to today's workout</ButtonLink>} /> : (
        <ul className="space-y-2">
          {list.map((s) => (
            <li key={s.exerciseId}>
              <Link href={`/progress/strength/${s.slug}`} className="flex items-center gap-4 rounded-2xl border border-line bg-surface px-4 py-4 hover:bg-surface-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{s.name}</p>
                  <p className="t-small tabular text-fg-2">{s.isTimed ? `Best ${s.bestReps}` : `e1RM ${fmtWeight(s.bestE1rm, ctx.unit)} · best ${fmtWeight(s.bestWeight, ctx.unit)}`} · {s.sessions} session{s.sessions > 1 ? "s" : ""}</p>
                </div>
                {s.change !== 0 && <span className={`t-small tabular font-semibold ${s.change > 0 ? "text-success" : "text-danger"}`}>{s.change > 0 ? "▲" : "▼"} {Math.abs(s.change)}%</span>}
                <ChevronRight className="size-4 text-fg-3" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
