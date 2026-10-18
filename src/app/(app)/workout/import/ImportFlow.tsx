"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
import type { ParsedWorkout } from "@/lib/domain/schemas";
import { Button } from "@/components/ui/Button";
import { Badge, Card } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Notice } from "@/components/ui/States";
import { AILoading } from "@/components/ui/AILoading";
import { ConfirmDialog } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { ExercisePicker } from "@/components/app/ExercisePicker";
import { WEEKDAYS } from "@/lib/domain/enums";
import { confirmImport, parseImport } from "../actions";

const EXAMPLE = `Monday:
Bench Press — 3 × 8
Incline Dumbbell Press — 3 × 10
Lateral Raises — 3 × 15

Wednesday legs: squat 4x6, rdl 3x8-10, leg curls 3x12, calf raises 4x15

Friday: pull ups 4x8, barbell row 3x8, face pulls 3x15, curls 3x12`;

export function ImportFlow({ aiEnabled }: { aiEnabled: boolean }) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedWorkout | null>(null);
  const [meta, setMeta] = useState<{ source: string; notice: string | null } | null>(null);
  const [name, setName] = useState("My Imported Plan");
  const [picking, setPicking] = useState<{ d: number; e: number | null } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [loading, startParse] = useTransition();
  const [saving, startSave] = useTransition();
  const toast = useToast();
  const router = useRouter();

  const parse = () => startParse(async () => {
    const r = await parseImport(text);
    if (!r.ok) return toast(r.error, "error");
    setParsed(r.data.data);
    setMeta({ source: r.data.source, notice: r.data.notice });
  });

  const upd = (fn: (p: ParsedWorkout) => void) => setParsed((p) => { if (!p) return p; const c = structuredClone(p); fn(c); return c; });
  const unmatched = parsed?.days.flatMap((d) => d.exercises).filter((e) => !e.exerciseId).length ?? 0;
  const empty = parsed ? parsed.days.every((d) => d.exercises.length === 0) : true;
  const weekdays = parsed?.days.map((d) => d.weekday).filter((w) => w != null) ?? [];
  const dupDay = new Set(weekdays).size !== weekdays.length;

  if (loading) return <AILoading steps={["Reading your routine…", "Identifying exercises…", "Matching to the exercise library…", "Structuring sets and reps…"]} intervalMs={1400} />;

  if (!parsed) {
    return (
      <Card className="space-y-4 p-5">
        <Field label="Your routine" hint="Any format works: one exercise per line, or natural language like “Monday chest, bench 3x8…”.">
          {(p) => <Textarea {...p} value={text} onChange={(e) => setText(e.target.value)} placeholder={EXAMPLE} className="min-h-64 font-mono text-[0.8125rem]" maxLength={5000} />}
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button size="lg" onClick={parse} disabled={text.trim().length < 3} icon={aiEnabled ? <Sparkles className="size-4" /> : <Wand2 className="size-4" />}>Convert to a plan</Button>
          <Button variant="ghost" onClick={() => setText(EXAMPLE)}>Use example</Button>
        </div>
        {!aiEnabled && <p className="t-small text-fg-3">AI import isn't configured on this deployment — the built-in parser handles structured lists and common shorthand.</p>}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {meta?.notice && <Notice icon={<AlertTriangle className="size-5" />} tone="warning">{meta.notice}</Notice>}
      {parsed.warnings.map((w) => <Notice key={w} tone="warning" icon={<AlertTriangle className="size-5" />}>{w}</Notice>)}
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3"><h2 className="t-h2">Review your plan</h2>{meta && <Badge tone={meta.source === "ai" ? "accent" : "neutral"}>{meta.source === "ai" ? "AI parsed" : "Parsed"}</Badge>}</div>
        <p className="t-small mt-1 text-fg-2">Check every exercise, fix anything that's off, then confirm. Nothing is saved until you do.</p>
        <Field label="Plan name" className="mt-4">{(p) => <Input {...p} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />}</Field>
      </Card>

      {parsed.days.map((d, di) => (
        <Card key={di} className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
            <Select aria-label="Workout day" value={d.weekday ?? ""} className="h-9 w-36" onChange={(e) => upd((p) => { p.days[di].weekday = e.target.value === "" ? null : Number(e.target.value); })}>
              <option value="">Flexible</option>{WEEKDAYS.map((w, i) => <option key={w} value={i}>{w}</option>)}
            </Select>
            <Input aria-label="Workout name" value={d.name} maxLength={60} onChange={(e) => upd((p) => { p.days[di].name = e.target.value; })} className="h-9 flex-1" />
            <Button variant="ghost" size="sm" aria-label="Remove day" onClick={() => upd((p) => { p.days.splice(di, 1); if (!p.days.length) p.days.push({ weekday: null, name: "Workout", exercises: [] }); })}><Trash2 className="size-4" /></Button>
          </div>
          <ul className="divide-y divide-line">
            {d.exercises.map((e, ei) => (
              <li key={ei} className="grid grid-cols-[1fr_auto] items-center gap-3 px-5 py-3 sm:grid-cols-[1fr_auto_auto]">
                <div className="min-w-0">
                  <button className="text-left font-semibold hover:text-accent" onClick={() => setPicking({ d: di, e: ei })}>{e.name}</button>
                  {!e.exerciseId ? <p className="t-small text-warning">Not matched — tap to choose the exercise</p> : e.rawText && <p className="t-small truncate text-fg-3">“{e.rawText}”</p>}
                </div>
                <div className="flex items-center gap-1.5">
                  <Input aria-label="Sets" inputMode="numeric" value={e.sets} onChange={(ev) => upd((p) => { p.days[di].exercises[ei].sets = Math.max(1, Math.min(10, Number(ev.target.value) || 1)); })} className="h-9 w-12 px-2 text-center" />
                  <span className="text-fg-3">×</span>
                  <Input aria-label="Min reps" inputMode="numeric" value={e.repMin} onChange={(ev) => upd((p) => { p.days[di].exercises[ei].repMin = Math.max(1, Math.min(100, Number(ev.target.value) || 1)); })} className="h-9 w-12 px-2 text-center" />
                  <span className="text-fg-3">–</span>
                  <Input aria-label="Max reps" inputMode="numeric" value={e.repMax} onChange={(ev) => upd((p) => { p.days[di].exercises[ei].repMax = Math.max(1, Math.min(100, Number(ev.target.value) || 1)); })} className="h-9 w-12 px-2 text-center" />
                </div>
                <Button variant="ghost" size="sm" aria-label={`Remove ${e.name}`} onClick={() => upd((p) => { p.days[di].exercises.splice(ei, 1); })}><Trash2 className="size-4" /></Button>
              </li>
            ))}
          </ul>
          <div className="p-3"><Button variant="ghost" size="sm" full icon={<Plus className="size-4" />} onClick={() => setPicking({ d: di, e: null })}>Add exercise</Button></div>
        </Card>
      ))}
      {parsed.days.length < 7 && <Button variant="outline" full icon={<Plus className="size-4" />} onClick={() => upd((p) => { p.days.push({ weekday: null, name: `Workout ${p.days.length + 1}`, exercises: [] }); })}>Add day</Button>}

      <div className="sticky bottom-20 z-10 flex gap-3 rounded-2xl border border-line bg-surface p-3 shadow-[var(--shadow-float)] md:bottom-4">
        <Button variant="secondary" onClick={() => { setParsed(null); setMeta(null); }}>Edit text</Button>
        <Button full size="lg" disabled={unmatched > 0 || empty || dupDay} onClick={() => setConfirm(true)}>
          {unmatched > 0 ? `Match ${unmatched} exercise${unmatched > 1 ? "s" : ""} first` : dupDay ? "Two days share a weekday" : "Confirm & save plan"}
        </Button>
      </div>

      <ExercisePicker open={!!picking} onClose={() => setPicking(null)} title={picking?.e == null ? "Add exercise" : "Choose the exercise"}
        onPick={(id, n) => {
          const pk = picking!;
          upd((p) => {
            if (pk.e == null) p.days[pk.d].exercises.push({ rawText: "", exerciseId: id, name: n, sets: 3, repMin: 8, repMax: 12, weightKg: null, notes: null });
            else Object.assign(p.days[pk.d].exercises[pk.e], { exerciseId: id, name: n });
          });
          setPicking(null);
        }} />
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} loading={saving} title="Save as your active plan?" confirmLabel="Save plan"
        body="This becomes your active plan. Any current plan is kept under “Other plans” — nothing is deleted, and your original text is preserved."
        onConfirm={() => startSave(async () => {
          const r = await confirmImport(parsed, text, name);
          if (!r.ok) { setConfirm(false); return toast(r.error, "error"); }
          toast("Plan imported");
          router.push("/workout/plan");
        })} />
    </div>
  );
}
