"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RefreshCw, Sparkles } from "lucide-react";
import type { WorkoutPlanDraft } from "@/lib/domain/schemas";
import { Button } from "@/components/ui/Button";
import { Badge, Card } from "@/components/ui/Card";
import { Notice } from "@/components/ui/States";
import { AILoading } from "@/components/ui/AILoading";
import { useToast } from "@/components/ui/Toast";
import { WEEKDAYS } from "@/lib/domain/enums";
import { generatePlanDraft, saveGeneratedPlan, searchLibrary } from "../actions";

export function GenerateFlow() {
  const [draft, setDraft] = useState<{ data: WorkoutPlanDraft; source: string; notice: string | null; warnings: string[] } | null>(null);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [loading, startGen] = useTransition();
  const [saving, startSave] = useTransition();
  const toast = useToast();
  const router = useRouter();
  useEffect(() => { searchLibrary().then((r) => r.ok && setNames(new Map(r.data.map((e) => [e.id, e.name])))); }, []);

  const generate = () => startGen(async () => {
    const r = await generatePlanDraft();
    if (!r.ok) return toast(r.error, "error");
    setDraft(r.data);
  });

  if (loading) return <AILoading steps={["Reviewing your goals and schedule…", "Balancing weekly volume and recovery…", "Selecting exercises for your equipment…", "Setting reps, rest and progression…", "Checking the plan against safety rules…"]} />;
  if (!draft) return <Button size="xl" full onClick={generate} icon={<Sparkles className="size-5" />}>Build my weekly plan</Button>;

  const p = draft.data;
  return (
    <div className="space-y-4">
      {draft.notice && <Notice icon={<AlertTriangle className="size-5" />}>{draft.notice}</Notice>}
      {draft.warnings.map((w) => <Notice key={w} tone="warning" icon={<AlertTriangle className="size-5" />}>{w}</Notice>)}
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3"><h2 className="t-h2">{p.name}</h2><Badge tone={draft.source === "ai" ? "accent" : "neutral"}>{draft.source === "ai" ? "AI designed" : "Rules engine"}</Badge></div>
        <p className="t-small mt-1 text-fg-2"><span className="capitalize">{p.difficulty}</span> · {p.days.length} days/week · ~{p.sessionMinutes} min</p>
        <p className="t-small mt-3 text-fg-2">{p.rationale}</p>
      </Card>
      {[...p.days].sort((a, b) => a.weekday - b.weekday).map((d) => (
        <Card key={d.weekday} className="p-5">
          <p className="t-caption">{WEEKDAYS[d.weekday]}</p>
          <h3 className="t-h3 mt-1">{d.name} <span className="font-normal text-fg-2">· {d.focus}</span></h3>
          <ol className="mt-3 space-y-2">
            {d.exercises.map((e) => (
              <li key={e.order} className="flex justify-between gap-3 text-[0.9375rem]">
                <span>{names.get(e.exerciseId) ?? "…"}{e.notes && <span className="t-small block text-fg-3">{e.notes}</span>}</span>
                <span className="t-small tabular shrink-0 text-fg-2">{e.sets} × {e.repMin === e.repMax ? e.repMin : `${e.repMin}–${e.repMax}`} · {e.restSec}s{e.rirTarget != null ? ` · RIR ${e.rirTarget}` : ""}</span>
              </li>
            ))}
          </ol>
        </Card>
      ))}
      <p className="t-small text-fg-3"><b className="text-fg-2">Progression: </b>{p.progression} You can edit any exercise, set or day after saving.</p>
      <div className="sticky bottom-20 z-10 flex gap-3 rounded-2xl border border-line bg-surface p-3 shadow-[var(--shadow-float)] md:bottom-4">
        <Button variant="secondary" onClick={generate} icon={<RefreshCw className="size-4" />}>Regenerate</Button>
        <Button full size="lg" loading={saving} onClick={() => startSave(async () => {
          const r = await saveGeneratedPlan(p);
          if (!r.ok) return toast(r.error, "error");
          toast("Plan saved — it's now your active plan");
          router.push("/workout/plan");
        })}>Use this plan</Button>
      </div>
    </div>
  );
}
