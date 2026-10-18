"use client";
import { useOptimistic, useTransition } from "react";
import { Droplets, Undo2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/Progress";
import { useToast } from "@/components/ui/Toast";
import { water } from "./actions";

export function WaterCard({ date, totalMl, targetMl }: { date: string; totalMl: number; targetMl: number }) {
  const [shown, add] = useOptimistic(totalMl, (s, d: number) => Math.max(0, s + d));
  const [, start] = useTransition();
  const toast = useToast();
  const log = (ml: number) => start(async () => { add(ml); const r = await water({ type: "add", date, amountMl: ml }); if (!r.ok) toast(r.error, "error"); });
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="t-h3 flex items-center gap-2"><Droplets className="size-5 text-accent" />Water</h2>
        <p className="tabular"><span className="t-stat text-xl">{(shown / 1000).toFixed(2)}</span><span className="t-small text-fg-2"> / {(targetMl / 1000).toFixed(1)} L</span></p>
      </div>
      <ProgressBar value={shown} max={targetMl} label="Water" tone="success" showOver={false} />
      <div className="mt-4 grid grid-cols-5 gap-2">
        {[250, 500, 750, 1000].map((ml) => <Button key={ml} variant="secondary" size="sm" onClick={() => log(ml)}>+{ml >= 1000 ? "1 L" : `${ml}ml`}</Button>)}
        <Button variant="ghost" size="sm" aria-label="Undo last water entry" disabled={shown === 0} onClick={() => start(async () => { const r = await water({ type: "undo", date }); if (!r.ok) toast(r.error, "error"); })}><Undo2 className="size-4" /></Button>
      </div>
    </Card>
  );
}
