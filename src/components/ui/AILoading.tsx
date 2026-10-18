"use client";
import { useEffect, useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";

/** Meaningful staged progress for AI work so the UI never looks frozen. */
export function AILoading({ steps, title, intervalMs = 2200 }: { steps: string[]; title?: string; intervalMs?: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => Math.min(steps.length - 1, x + 1)), intervalMs);
    return () => clearInterval(t);
  }, [steps.length, intervalMs]);
  return (
    <div role="status" aria-live="polite" className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><Sparkles className="size-5" /></span>
        <p className="t-h3">{title ?? steps[i]}</p>
      </div>
      <ol className="space-y-3">
        {steps.map((s, idx) => (
          <li key={s} className={cn("flex items-center gap-3 t-small transition-opacity", idx > i ? "opacity-40" : "opacity-100")}>
            {idx < i ? <Check className="size-4 text-success" /> : idx === i ? <Loader2 className="size-4 animate-spin text-accent" /> : <span className="size-4 rounded-full border border-line-strong" />}
            <span className={idx === i ? "text-fg" : "text-fg-2"}>{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
