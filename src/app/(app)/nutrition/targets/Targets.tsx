"use client";
import { useState, useTransition } from "react";
import { Calculator, Info } from "lucide-react";
import type { MacroTargets } from "@/lib/engines/nutrition";
import { Button } from "@/components/ui/Button";
import { Badge, Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { Notice } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { setTargets } from "../actions";

type T = { calories: number; proteinG: number; carbsG: number; fatG: number; waterMl: number; isManual: boolean };

export function Targets({ current, estimate }: { current: T | null; estimate: MacroTargets }) {
  const [f, setF] = useState(() => ({ calories: String(current?.calories ?? estimate.calories), proteinG: String(current?.proteinG ?? estimate.proteinG), carbsG: String(current?.carbsG ?? estimate.carbsG), fatG: String(current?.fatG ?? estimate.fatG), waterMl: String(current?.waterMl ?? estimate.waterMl) }));
  const [pending, start] = useTransition();
  const toast = useToast();
  const macroKcal = Number(f.proteinG) * 4 + Number(f.carbsG) * 4 + Number(f.fatG) * 9;
  const mismatch = Math.abs(macroKcal - Number(f.calories)) > 100;
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between"><h2 className="t-h3">Your targets</h2>{current && <Badge tone={current.isManual ? "neutral" : "accent"}>{current.isManual ? "Set manually" : "Calculated"}</Badge>}</div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Calories (kcal)" className="col-span-2">{(p) => <Input {...p} inputMode="numeric" value={f.calories} onChange={(e) => setF({ ...f, calories: e.target.value })} />}</Field>
          <Field label="Protein (g)">{(p) => <Input {...p} inputMode="numeric" value={f.proteinG} onChange={(e) => setF({ ...f, proteinG: e.target.value })} />}</Field>
          <Field label="Carbs (g)">{(p) => <Input {...p} inputMode="numeric" value={f.carbsG} onChange={(e) => setF({ ...f, carbsG: e.target.value })} />}</Field>
          <Field label="Fat (g)">{(p) => <Input {...p} inputMode="numeric" value={f.fatG} onChange={(e) => setF({ ...f, fatG: e.target.value })} />}</Field>
          <Field label="Water (ml)">{(p) => <Input {...p} inputMode="numeric" value={f.waterMl} onChange={(e) => setF({ ...f, waterMl: e.target.value })} />}</Field>
        </div>
        {mismatch && <p className="t-small mt-3 text-warning">Your macros add up to ~{Math.round(macroKcal)} kcal, which differs from the calorie target.</p>}
        {Number(f.calories) < 1200 && <p className="t-small mt-3 text-danger">We don't support targets below 1,200 kcal. Very low intakes should only be followed with medical supervision.</p>}
        <Button full className="mt-5" loading={pending} disabled={Number(f.calories) < 1200} onClick={() => start(async () => {
          const r = await setTargets({ calories: Number(f.calories), proteinG: Number(f.proteinG), carbsG: Number(f.carbsG), fatG: Number(f.fatG), waterMl: Number(f.waterMl) });
          toast(r.ok ? "Targets saved" : r.error, r.ok ? "success" : "error");
        })}>Save targets</Button>
      </Card>
      <Card className="p-5">
        <h2 className="t-h3 mb-2 flex items-center gap-2"><Calculator className="size-4 text-accent" />How we estimate</h2>
        <ul className="t-small space-y-1.5 text-fg-2">{estimate.explanation.map((e) => <li key={e}>• {e}</li>)}</ul>
        <p className="t-small mt-3">Suggested: <b>{estimate.calories} kcal</b> · {estimate.proteinG} g protein · {estimate.carbsG} g carbs · {estimate.fatG} g fat</p>
        <Button variant="secondary" className="mt-4" onClick={() => { setF({ calories: String(estimate.calories), proteinG: String(estimate.proteinG), carbsG: String(estimate.carbsG), fatG: String(estimate.fatG), waterMl: String(estimate.waterMl) }); start(async () => { const r = await setTargets("recalculate"); toast(r.ok ? "Targets recalculated" : r.error, r.ok ? "success" : "error"); }); }}>Use suggested targets</Button>
      </Card>
      <Notice icon={<Info className="size-5" />} title="These are estimates">Energy equations are typically within ±10–15% for most people. Watch your weight trend for 2–3 weeks and adjust by ~100–200 kcal if needed. This isn't medical advice.</Notice>
    </div>
  );
}
