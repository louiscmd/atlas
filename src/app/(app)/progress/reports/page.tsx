import Link from "next/link";
import { ChevronRight, FileBarChart } from "lucide-react";
import { requireOnboardedUser } from "@/lib/server/auth";
import { listReports } from "@/lib/server/services/reports";
import { addDays, formatDay } from "@/lib/dates";
import type { CoachSummary } from "@/lib/domain/schemas";
import type { WeeklyMetrics } from "@/lib/server/services/reports";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/ui/States";
import { Badge } from "@/components/ui/Card";
import { GenerateReport } from "./GenerateReport";
export const metadata = { title: "Weekly reports" };

export default async function Page() {
  const user = await requireOnboardedUser();
  const reports = await listReports(user.id);
  return (
    <>
      <PageHeader title="Weekly reports" subtitle="A concise review of each week and what to focus on next." />
      <GenerateReport />
      {reports.length === 0 ? <EmptyState className="mt-5" icon={<FileBarChart className="size-6" />} title="No reports yet" body="Generate this week's report to see how things are going. More logging = better insights." /> : (
        <ul className="mt-5 space-y-2">
          {reports.map((r) => {
            const m = r.metrics as unknown as WeeklyMetrics, c = r.coach as CoachSummary | null;
            return (
              <li key={r.id}>
                <Link href={`/progress/reports/${r.weekStart}`} className="flex items-center gap-4 rounded-2xl border border-line bg-surface px-4 py-4 hover:bg-surface-2">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-semibold">{formatDay(r.weekStart, { month: "short", day: "numeric" })} – {formatDay(addDays(r.weekStart, 6), { month: "short", day: "numeric" })}{!r.viewedAt && <Badge tone="accent">New</Badge>}{!m.isComplete && <Badge>In progress</Badge>}</p>
                    <p className="t-small truncate text-fg-2">{c?.headline}</p>
                    <p className="t-small tabular text-fg-3">{m.workoutsCompleted}/{m.workoutsPlanned || "—"} workouts · {m.prs.length} PRs{m.avgCalories ? ` · ${m.avgCalories} kcal avg` : ""}</p>
                  </div>
                  <ChevronRight className="size-4 text-fg-3" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
