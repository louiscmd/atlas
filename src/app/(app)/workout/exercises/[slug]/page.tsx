import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, CheckCircle2, Lightbulb, Timer, Repeat2 } from "lucide-react";
import { requireOnboardedUser } from "@/lib/server/auth";
import { getAlternativesForUser, getExerciseDetail, getExercisePerformance } from "@/lib/server/services/exercises";
import { getUserContext } from "@/lib/server/services/profile";
import { EQUIPMENT, MUSCLES, labelOf } from "@/lib/domain/enums";
import { fmtWeight } from "@/lib/units";
import { PageHeader } from "@/components/app/PageHeader";
import { Badge, Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Demo } from "./Demo";
import { PreferenceButtons } from "./PreferenceButtons";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const ex = await getExerciseDetail((await params).slug);
  return { title: ex?.name ?? "Exercise" };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireOnboardedUser();
  const ex = await getExerciseDetail((await params).slug);
  if (!ex) notFound();
  const [ctx, perf, alts] = await Promise.all([getUserContext(user.id), getExercisePerformance(user.id, ex.id), getAlternativesForUser(user.id, ex.id, 6)]);
  const pref = ctx.restrictions.find((r) => r.exerciseId === ex.id)?.type ?? null;
  const video = ex.videos[0] ?? null;
  const have = new Set([...ctx.equipment, "bodyweight"]);
  const missing = ex.equipment.filter((q) => !have.has(q));

  return (
    <>
      <PageHeader back={{ href: "/workout/exercises", label: "Exercise Vault" }} title={ex.name}
        subtitle={<span className="flex flex-wrap gap-2 pt-1"><Badge className="capitalize">{ex.difficulty}</Badge><Badge className="capitalize">{ex.movementType}</Badge>{missing.length > 0 && <Badge tone="warning">Needs {missing.map((m) => labelOf(EQUIPMENT, m)).join(", ")}</Badge>}</span>} />
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <Demo name={ex.name} video={video ? { youtubeId: video.youtubeId, title: video.title, channel: video.channel, thumbnailUrl: video.thumbnailUrl } : null} />
          <Card className="p-5">
            <h2 className="t-h3 mb-3">How to do it</h2>
            <ol className="space-y-3">{ex.instructions.map((s, i) => <li key={i} className="flex gap-3"><span className="t-stat flex size-6 shrink-0 items-center justify-center rounded-md bg-surface-2 text-xs">{i + 1}</span><span className="t-body text-fg-2">{s}</span></li>)}</ol>
          </Card>
          <div className="grid gap-5 sm:grid-cols-2">
            <Card className="p-5"><h2 className="t-h3 mb-3 flex items-center gap-2"><AlertCircle className="size-4 text-warning" />Common mistakes</h2><ul className="t-small space-y-2 text-fg-2">{ex.commonMistakes.map((m) => <li key={m}>• {m}</li>)}</ul></Card>
            <Card className="p-5"><h2 className="t-h3 mb-3 flex items-center gap-2"><Lightbulb className="size-4 text-accent" />Technique tips</h2><ul className="t-small space-y-2 text-fg-2">{ex.tips.map((m) => <li key={m}>• {m}</li>)}</ul></Card>
          </div>
        </div>
        <div className="space-y-5">
          <Card className="p-5">
            <dl className="t-small space-y-3">
              <div className="flex justify-between gap-4"><dt className="text-fg-3">Primary</dt><dd className="text-right font-medium">{ex.primaryMuscles.map((m) => labelOf(MUSCLES, m)).join(", ")}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-fg-3">Secondary</dt><dd className="text-right">{ex.secondaryMuscles.map((m) => labelOf(MUSCLES, m)).join(", ") || "—"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-fg-3">Equipment</dt><dd className="text-right">{ex.equipment.map((q) => labelOf(EQUIPMENT, q)).join(", ") || "Bodyweight"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-fg-3">Movement</dt><dd className="text-right capitalize">{ex.movementPattern.replace(/_/g, " ")}</dd></div>
              <div className="flex justify-between gap-4"><dt className="flex items-center gap-1.5 text-fg-3"><Repeat2 className="size-3.5" />Recommended reps</dt><dd className="tabular font-medium">{ex.repMin}–{ex.repMax}{ex.isTimed ? " sec/min" : ""}</dd></div>
              <div className="flex justify-between gap-4"><dt className="flex items-center gap-1.5 text-fg-3"><Timer className="size-3.5" />Recommended rest</dt><dd className="tabular font-medium">{ex.restSec ? `${ex.restSec}s` : "As needed"}</dd></div>
            </dl>
          </Card>
          <Card className="p-5">
            <h2 className="t-h3 mb-4">Your performance</h2>
            {perf ? (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <Stat size="sm" label="Best" value={`${fmtWeight(perf.best.weightKg, ctx.unit)}`} sub={`× ${perf.best.reps}`} />
                  <Stat size="sm" label="Est. 1RM" value={fmtWeight(perf.e1rm, ctx.unit)} />
                  <Stat size="sm" label="Sessions" value={perf.sessionCount} />
                </div>
                <Link href={`/progress/strength/${ex.slug}`} className="t-small mt-4 inline-block text-accent">View progression</Link>
              </>
            ) : <p className="t-small text-fg-2">You haven't logged this exercise yet.</p>}
          </Card>
          <Card className="p-5">
            <h2 className="t-h3 mb-1">Alternatives</h2>
            <p className="t-small mb-3 text-fg-3">Ranked for your equipment and preferences.</p>
            {alts.length ? <ul className="space-y-1">{alts.map((a) => <li key={a.id}><Link href={`/workout/exercises/${a.slug}`} className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-surface-2"><span className="font-medium">{a.name}</span>{a.reasons.includes("Similar movement") && <CheckCircle2 className="size-4 text-success" aria-label="Similar movement" />}</Link></li>)}</ul> : <p className="t-small text-fg-2">No alternatives available with your current equipment.</p>}
          </Card>
          <PreferenceButtons exerciseId={ex.id} current={pref as never} />
        </div>
      </div>
    </>
  );
}
