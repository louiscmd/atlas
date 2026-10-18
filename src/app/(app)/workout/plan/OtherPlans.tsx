"use client";
import { useTransition } from "react";
import { Archive, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { planOp } from "../actions";

const SOURCE: Record<string, string> = { imported: "Imported", generated: "Generated", program: "Program", custom: "Custom" };

export function OtherPlans({ plans }: { plans: { id: string; name: string; source: string; days: number; updatedAt: string }[] }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const act = (op: Parameters<typeof planOp>[0], msg: string) => start(async () => { const r = await planOp(op); toast(r.ok ? msg : r.error, r.ok ? "success" : "error"); });
  return (
    <section>
      <h2 className="t-h2 mb-3">Other plans</h2>
      <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
        {plans.map((p) => (
          <li key={p.id} className="flex items-center gap-3 px-5 py-4">
            <div className="min-w-0 flex-1"><p className="truncate font-semibold">{p.name}</p><p className="t-small text-fg-2">{SOURCE[p.source] ?? p.source} · {p.days} day{p.days === 1 ? "" : "s"}</p></div>
            <Button size="sm" variant="secondary" disabled={pending} onClick={() => act({ type: "activate", planId: p.id }, "Plan activated")} icon={<CheckCircle2 className="size-4" />}>Use</Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => act({ type: "archive", planId: p.id }, "Plan archived")} aria-label={`Archive ${p.name}`}><Archive className="size-4" /></Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
