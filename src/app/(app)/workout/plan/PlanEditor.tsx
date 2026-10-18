"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Copy, MoreHorizontal, Pencil, Plus, Repeat, Trash2 } from "lucide-react";
import type { PlanWithDays } from "@/lib/server/services/plans";
import { Button, IconButton } from "@/components/ui/Button";
import { Badge, Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { Sheet, ConfirmDialog } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { ExercisePicker } from "@/components/app/ExercisePicker";
import { WEEKDAYS } from "@/lib/domain/enums";
import { planOp } from "../actions";
import { StartWorkoutButton } from "../StartWorkoutButton";

type Plan = PlanWithDays;
type Day = Plan["days"][number];
type PEx = Day["exercises"][number];
const SOURCE: Record<string, string> = { imported: "My Imported Plan", generated: "Generated for you", program: "From program", custom: "Custom" };

export function PlanEditor({ plan }: { plan: Plan }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const [rename, setRename] = useState<string | null>(null);
  const act = (op: Parameters<typeof planOp>[0], msg?: string) => start(async () => {
    const r = await planOp(op);
    if (!r.ok) toast(r.error, "error"); else if (msg) toast(msg);
  });
  const scheduled = [...plan.days].sort((a, b) => (a.weekday ?? 9) - (b.weekday ?? 9) || a.order - b.order);

  return (
    <div className="space-y-4" aria-busy={pending}>
      <Card className="flex flex-wrap items-center gap-3 p-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><h2 className="t-h2 truncate">{plan.name}</h2><IconButton label="Rename plan" className="size-8" onClick={() => setRename(plan.name)}><Pencil className="size-4" /></IconButton></div>
          <p className="t-small mt-1 text-fg-2">{SOURCE[plan.source]}{plan.sourceProgram ? `: ${plan.sourceProgram.name}` : ""} · {plan.days.length} days/week{plan.sessionMinutes ? ` · ~${plan.sessionMinutes} min` : ""}</p>
        </div>
        <Badge tone="success">Active</Badge>
      </Card>
      {plan.rationale && <p className="t-small rounded-2xl border border-line bg-surface p-4 text-fg-2"><b className="text-fg">Why this plan: </b>{plan.rationale}</p>}

      {scheduled.map((d) => <DayCard key={d.id} day={d} usedWeekdays={plan.days.filter((x) => x.id !== d.id).map((x) => x.weekday)} act={act} />)}
      {plan.days.length < 7 && <Button variant="outline" full icon={<Plus className="size-4" />} onClick={() => act({ type: "addDay", planId: plan.id }, "Workout day added")}>Add workout day</Button>}
      {plan.progression && <p className="t-small text-fg-3"><b className="text-fg-2">Progression: </b>{plan.progression}</p>}

      <Sheet open={rename != null} onClose={() => setRename(null)} title="Rename plan" size="sm" footer={<Button full onClick={() => { act({ type: "rename", planId: plan.id, name: rename ?? "" }, "Plan renamed"); setRename(null); }}>Save</Button>}>
        <Input aria-label="Plan name" value={rename ?? ""} maxLength={80} onChange={(e) => setRename(e.target.value)} />
      </Sheet>
    </div>
  );
}

function DayCard({ day, usedWeekdays, act }: { day: Day; usedWeekdays: (number | null)[]; act: (op: Parameters<typeof planOp>[0], msg?: string) => void }) {
  const [menu, setMenu] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [del, setDel] = useState(false);
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <Select aria-label={`Day for ${day.name}`} value={day.weekday ?? ""} className="h-9 w-32 text-[0.8125rem]"
          onChange={(e) => act({ type: "updateDay", dayId: day.id, weekday: e.target.value === "" ? null : Number(e.target.value) }, "Schedule updated")}>
          <option value="">Flexible</option>
          {WEEKDAYS.map((w, i) => <option key={w} value={i} disabled={usedWeekdays.includes(i)}>{w}</option>)}
        </Select>
        <div className="min-w-0 flex-1"><h3 className="t-h3 truncate">{day.name}</h3>{day.focus && <p className="t-small truncate text-fg-2">{day.focus}</p>}</div>
        <IconButton label={`Options for ${day.name}`} onClick={() => setMenu(true)}><MoreHorizontal className="size-5" /></IconButton>
      </div>
      {day.exercises.length === 0 ? <p className="t-small px-5 py-6 text-center text-fg-2">No exercises yet — add your first one.</p> : (
        <ol className="divide-y divide-line">{day.exercises.map((e, i) => <ExerciseRow key={e.id} e={e} first={i === 0} last={i === day.exercises.length - 1} act={act} />)}</ol>
      )}
      <div className="p-3"><Button variant="ghost" full size="sm" icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>Add exercise</Button></div>

      <Sheet open={menu} onClose={() => setMenu(false)} title={day.name} size="sm">
        <div className="grid gap-2">
          {day.exercises.length > 0 && <StartWorkoutButton dayId={day.id} label="Start this workout now" />}
          <button className="flex h-12 items-center gap-3 rounded-xl bg-surface-2 px-4 font-medium hover:bg-surface-3" onClick={() => { setMenu(false); setName(day.name); }}><Pencil className="size-4" />Rename workout</button>
          <button className="flex h-12 items-center gap-3 rounded-xl bg-surface-2 px-4 font-medium hover:bg-surface-3" onClick={() => { setMenu(false); act({ type: "duplicateDay", dayId: day.id }, "Workout duplicated"); }}><Copy className="size-4" />Duplicate workout</button>
          <button className="flex h-12 items-center gap-3 rounded-xl bg-danger-soft px-4 font-medium text-danger" onClick={() => { setMenu(false); setDel(true); }}><Trash2 className="size-4" />Delete workout</button>
        </div>
      </Sheet>
      <Sheet open={name != null} onClose={() => setName(null)} title="Rename workout" size="sm" footer={<Button full onClick={() => { act({ type: "updateDay", dayId: day.id, name: name ?? "" }, "Renamed"); setName(null); }}>Save</Button>}>
        <Input aria-label="Workout name" value={name ?? ""} maxLength={60} onChange={(e) => setName(e.target.value)} />
      </Sheet>
      <ConfirmDialog open={del} onClose={() => setDel(false)} danger title={`Delete ${day.name}?`} body="Past workouts stay in your history." confirmLabel="Delete" onConfirm={() => { setDel(false); act({ type: "deleteDay", dayId: day.id }, "Workout deleted"); }} />
      <ExercisePicker open={adding} onClose={() => setAdding(false)} title={`Add to ${day.name}`} onPick={(id, n) => { setAdding(false); act({ type: "addExercise", dayId: day.id, exerciseId: id }, `${n} added`); }} />
    </Card>
  );
}

function ExerciseRow({ e, first, last, act }: { e: PEx; first: boolean; last: boolean; act: (op: Parameters<typeof planOp>[0], msg?: string) => void }) {
  const [edit, setEdit] = useState(false);
  const [replace, setReplace] = useState(false);
  const [f, setF] = useState({ sets: e.sets, repMin: e.repMin, repMax: e.repMax, restSec: e.restSec, rirTarget: e.rirTarget });
  return (
    <li className="flex items-center gap-2 px-5 py-3">
      <div className="flex flex-col">
        <IconButton label={`Move ${e.exercise.name} up`} className="size-7" disabled={first} onClick={() => act({ type: "moveExercise", id: e.id, direction: "up" })}><ArrowUp className="size-3.5" /></IconButton>
        <IconButton label={`Move ${e.exercise.name} down`} className="size-7" disabled={last} onClick={() => act({ type: "moveExercise", id: e.id, direction: "down" })}><ArrowDown className="size-3.5" /></IconButton>
      </div>
      <button className="min-w-0 flex-1 text-left" onClick={() => setEdit(true)}>
        <span className="block truncate font-semibold">{e.exercise.name}</span>
        <span className="t-small tabular text-fg-2">{e.sets} × {e.repMin === e.repMax ? e.repMin : `${e.repMin}–${e.repMax}`} · rest {e.restSec}s{e.rirTarget != null ? ` · RIR ${e.rirTarget}` : ""}</span>
      </button>
      <IconButton label={`Replace ${e.exercise.name}`} onClick={() => setReplace(true)}><Repeat className="size-4" /></IconButton>
      <IconButton label={`Edit ${e.exercise.name}`} onClick={() => setEdit(true)}><Pencil className="size-4" /></IconButton>

      <Sheet open={edit} onClose={() => setEdit(false)} title={e.exercise.name} size="sm"
        footer={<div className="flex gap-3"><Button variant="danger" onClick={() => { setEdit(false); act({ type: "removeExercise", id: e.id }, "Exercise removed"); }} icon={<Trash2 className="size-4" />}>Remove</Button><Button full onClick={() => { setEdit(false); act({ type: "updateExercise", id: e.id, ...f }, "Saved"); }}>Save</Button></div>}>
        <div className="grid grid-cols-2 gap-3">
          {([["sets", "Sets"], ["repMin", "Min reps"], ["repMax", "Max reps"], ["restSec", "Rest (sec)"]] as const).map(([k, label]) => (
            <label key={k} className="space-y-1.5"><span className="t-small block text-fg-2">{label}</span><Input inputMode="numeric" value={f[k]} onChange={(ev) => setF({ ...f, [k]: Number(ev.target.value.replace(/\D/g, "")) || 0 })} /></label>
          ))}
          <label className="col-span-2 space-y-1.5"><span className="t-small block text-fg-2">Target RIR</span>
            <Select value={f.rirTarget ?? ""} onChange={(ev) => setF({ ...f, rirTarget: ev.target.value === "" ? null : Number(ev.target.value) })}><option value="">None</option>{[0, 1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}</Select>
          </label>
        </div>
        <Link href={`/workout/exercises/${e.exercise.slug}`} className="t-small mt-4 inline-block text-accent">View exercise details</Link>
      </Sheet>
      <ExercisePicker open={replace} onClose={() => setReplace(false)} title="Replace exercise" replaceFor={{ exerciseId: e.exercise.id, name: e.exercise.name }} onPick={(id, n) => { setReplace(false); act({ type: "replaceExercise", id: e.id, exerciseId: id }, `Replaced with ${n}`); }} />
    </li>
  );
}
