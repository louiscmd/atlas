"use client";
import { useState, useTransition } from "react";
import { Send, Sparkles } from "lucide-react";
import type { MealSuggestion } from "@/lib/domain/schemas";
import { Button } from "@/components/ui/Button";
import { Badge, Card } from "@/components/ui/Card";
import { Chip, Input } from "@/components/ui/Input";
import { Notice } from "@/components/ui/States";
import { AILoading } from "@/components/ui/AILoading";
import { useToast } from "@/components/ui/Toast";
import { askAssistant } from "../actions";

const PROMPTS = ["What should I eat tonight?", "I need a high-protein snack", "Quick lunch under 600 kcal", "What can I eat after training?"];

export function Assistant({ aiEnabled }: { aiEnabled: boolean }) {
  const [q, setQ] = useState("");
  const [answers, setAnswers] = useState<{ q: string; a: MealSuggestion; source: string }[]>([]);
  const [pending, start] = useTransition();
  const toast = useToast();
  const ask = (question: string) => start(async () => {
    const r = await askAssistant(question);
    if (!r.ok) return toast(r.error, "error");
    setAnswers((s) => [{ q: question, a: r.data.data, source: r.data.source }, ...s]);
    setQ("");
  });
  return (
    <div className="space-y-4">
      {!aiEnabled && <Notice title="Basic mode">AI isn't configured on this server, so suggestions come from a curated list matched to your remaining macros.</Notice>}
      <form onSubmit={(e) => { e.preventDefault(); if (q.trim()) ask(q); }} className="flex gap-2">
        <Input aria-label="Ask the nutrition assistant" placeholder="Ask anything about today's food…" value={q} maxLength={500} onChange={(e) => setQ(e.target.value)} />
        <Button type="submit" aria-label="Ask" loading={pending} icon={<Send className="size-4" />} />
      </form>
      <div className="flex flex-wrap gap-2">{PROMPTS.map((p) => <Chip key={p} selected={false} onClick={() => ask(p)} disabled={pending}>{p}</Chip>)}</div>
      {pending && <AILoading steps={["Checking what you've eaten today…", "Calculating what's left…", "Finding meals that fit…"]} intervalMs={1200} />}
      {answers.map(({ q, a, source }, i) => (
        <Card key={i} className="anim-rise p-5">
          <p className="t-small text-fg-3">{q}</p>
          <p className="t-body mt-2 flex gap-2"><Sparkles className="mt-1 size-4 shrink-0 text-accent" />{a.reply}</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {a.suggestions.map((s) => (
              <li key={s.name} className="rounded-2xl bg-surface-2 p-4">
                <p className="font-semibold">{s.name}</p>
                <p className="t-small mt-1 text-fg-2">{s.description}</p>
                <p className="t-small tabular mt-2 text-fg-3">≈ {Math.round(s.calories)} kcal · P {Math.round(s.protein)} · C {Math.round(s.carbs)} · F {Math.round(s.fat)}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-fg-3"><Badge>{source === "ai" ? "AI suggestion" : "Curated suggestion"}</Badge> Macros are approximate. Not medical or dietetic advice.</p>
        </Card>
      ))}
    </div>
  );
}
