import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, X } from "lucide-react";
import { requireOnboardedUser } from "@/lib/server/auth";
import { getProgram } from "@/lib/server/services/plans";
import { getUserContext } from "@/lib/server/services/profile";
import { EQUIPMENT, WEEKDAYS, WEEKDAYS_SHORT, labelOf } from "@/lib/domain/enums";
import { PageHeader } from "@/components/app/PageHeader";
import { Badge, Card } from "@/components/ui/Card";
import { Notice } from "@/components/ui/States";
import { cn } from "@/lib/cn";
import { StartProgramButton } from "./StartProgramButton";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getProgram((await params).slug);
  return { title: p?.name ?? "Program" };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireOnboardedUser();
  const p = await getProgram((await params).slug);
  if (!p) notFound();
  const ctx = await getUserContext(user.id);
  const equipment = p.equipment as string[];
  const have = new Set([...ctx.equipment, "bodyweight"]);
  const missing = equipment.filter((e) => !have.has(e));
  return (
    <>
      <PageHeader back={{ href: "/workout/programs", label: "Programs" }} title={p.name} subtitle={p.goal} />
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <Card className="p-5">
            <p className="t-body text-fg-2">{p.description}</p>
            <div className="mt-5 grid grid-cols-7 gap-1.5" aria-label="Weekly calendar">
              {WEEKDAYS_SHORT.map((w, i) => { const d = p.days.find((x) => x.weekday === i); return (
                <div key={w} className={cn("rounded-xl border p-2 text-center", d ? "border-accent/50 bg-accent-soft" : "border-line bg-surface-2")}><p className="text-[11px] font-semibold text-fg-3">{w}</p><p className="mt-1 truncate text-[11px] font-medium">{d ? d.name.split(" ")[0] : "Rest"}</p></div>
              ); })}
            </div>
          </Card>
          {p.days.map((d) => (
            <Card key={d.id} className="overflow-hidden">
              <div className="border-b border-line px-5 py-4"><p className="t-caption">{WEEKDAYS[d.weekday]}</p><h2 className="t-h3 mt-1">{d.name} <span className="font-normal text-fg-2">· {d.focus}</span></h2>{d.warmup && <p className="t-small mt-2 text-fg-3">Warm-up: {d.warmup}</p>}</div>
              <table className="w-full text-left">
                <thead className="t-caption"><tr><th className="px-5 py-2 font-semibold">Exercise</th><th className="px-2 py-2 font-semibold">Sets × reps</th><th className="hidden px-2 py-2 font-semibold sm:table-cell">Rest</th><th className="px-5 py-2 font-semibold">RIR</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {d.exercises.map((e) => (
                    <tr key={e.id} className="t-small">
                      <td className="px-5 py-3"><Link href={`/workout/exercises/${e.exercise.slug}`} className="font-medium text-fg hover:text-accent">{e.exercise.name}</Link>{e.notes && <span className="block text-fg-3">{e.notes}</span>}</td>
                      <td className="tabular px-2 py-3 text-fg-2">{e.sets} × {e.repMin === e.repMax ? e.repMin : `${e.repMin}–${e.repMax}`}</td>
                      <td className="tabular hidden px-2 py-3 text-fg-2 sm:table-cell">{e.restSec ? `${e.restSec}s` : "—"}</td>
                      <td className="tabular px-5 py-3 text-fg-2">{e.rir ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ))}
        </div>
        <div className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <Card className="space-y-4 p-5">
            <dl className="t-small grid grid-cols-2 gap-3">
              <div><dt className="text-fg-3">Difficulty</dt><dd className="font-semibold capitalize">{p.difficulty}</dd></div>
              <div><dt className="text-fg-3">Days / week</dt><dd className="font-semibold">{p.daysPerWeek}</dd></div>
              <div><dt className="text-fg-3">Session</dt><dd className="font-semibold">~{p.sessionMinutes} min</dd></div>
              <div><dt className="text-fg-3">Category</dt><dd className="font-semibold capitalize">{p.category.replace("_", " ")}</dd></div>
            </dl>
            <div><p className="t-small mb-2 text-fg-3">Equipment</p><div className="flex flex-wrap gap-1.5">{equipment.length ? equipment.map((e) => <Badge key={e} tone={have.has(e) ? "neutral" : "warning"}>{labelOf(EQUIPMENT, e)}</Badge>) : <Badge>Bodyweight only</Badge>}</div></div>
            {missing.length > 0 && <Notice tone="warning">You don't have: {missing.map((m) => labelOf(EQUIPMENT, m)).join(", ")}. You can still start it and replace exercises.</Notice>}
            <StartProgramButton slug={p.slug} name={p.name} />
            <p className="t-small text-fg-3">Creates your own copy — the template is never changed.</p>
          </Card>
          <Card className="p-5"><h2 className="t-h3 mb-2">Progression</h2><p className="t-small text-fg-2">{p.progression}</p>{p.deload && <><h3 className="mt-4 font-semibold">Deload</h3><p className="t-small mt-1 text-fg-2">{p.deload}</p></>}</Card>
          <Card className="p-5">
            <h2 className="t-h3 mb-3">Who it's for</h2>
            <ul className="t-small space-y-2">{(p.whoFor as string[]).map((w) => <li key={w} className="flex gap-2 text-fg-2"><Check className="size-4 shrink-0 text-success" />{w}</li>)}</ul>
            <h2 className="t-h3 mb-3 mt-5">Not ideal for</h2>
            <ul className="t-small space-y-2">{(p.whoNotFor as string[]).map((w) => <li key={w} className="flex gap-2 text-fg-2"><X className="size-4 shrink-0 text-fg-3" />{w}</li>)}</ul>
          </Card>
          <p className="t-small text-fg-3">Programs are general training templates, not medically or professionally certified prescriptions.</p>
        </div>
      </div>
    </>
  );
}
