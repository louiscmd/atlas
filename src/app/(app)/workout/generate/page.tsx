import Link from "next/link";
import { requireOnboardedUser } from "@/lib/server/auth";
import { getUserContext } from "@/lib/server/services/profile";
import { EQUIPMENT, EXPERIENCE, GOALS, MUSCLES, SESSION_LENGTHS, WEEKDAYS, labelOf } from "@/lib/domain/enums";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/Card";
import { GenerateFlow } from "./GenerateFlow";
export const metadata = { title: "Build my weekly plan" };

export default async function Page() {
  const user = await requireOnboardedUser();
  const ctx = await getUserContext(user.id);
  const rows: [string, string][] = [
    ["Goal", labelOf(GOALS, ctx.goals?.primaryGoal) + (ctx.goals?.secondaryGoal ? ` + ${labelOf(GOALS, ctx.goals.secondaryGoal)}` : "")],
    ["Experience", labelOf(EXPERIENCE, ctx.profile?.experience)],
    ["Schedule", `${ctx.goals?.daysPerWeek}×/week on ${ctx.availableDays.map((d) => WEEKDAYS[d].slice(0, 3)).join(", ") || "any day"} · ${labelOf(SESSION_LENGTHS, ctx.goals?.sessionLength)}`],
    ["Equipment", ctx.equipment.map((e) => labelOf(EQUIPMENT, e)).join(", ")],
    ["Priorities", ctx.musclePriorities.map((m) => labelOf(MUSCLES, m)).join(", ") || "Balanced"],
    ["Avoiding", `${ctx.excludedExerciseIds.length} exercise(s)`],
  ];
  return (
    <>
      <PageHeader back={{ href: "/workout/plan", label: "My plan" }} title="Build my weekly plan" subtitle="A plan designed around you, using proven programming principles." />
      <Card className="mb-5 p-5">
        <div className="mb-3 flex items-center justify-between"><h2 className="t-h3">Based on your profile</h2><Link href="/profile#training" className="t-small text-accent">Edit</Link></div>
        <dl className="t-small grid gap-x-6 gap-y-2 sm:grid-cols-2">{rows.map(([k, v]) => <div key={k} className="flex gap-2"><dt className="w-24 shrink-0 text-fg-3">{k}</dt><dd className="text-fg">{v}</dd></div>)}</dl>
      </Card>
      <GenerateFlow />
    </>
  );
}
