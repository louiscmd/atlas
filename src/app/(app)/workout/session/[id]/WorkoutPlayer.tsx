"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, CloudOff, History, Info, MoreHorizontal, Pencil, Plus, Repeat, SkipForward, StickyNote, Trash2, Trophy, Video, X } from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";
import { Stepper, Textarea, Chip } from "@/components/ui/Input";
import { Sheet, ConfirmDialog } from "@/components/ui/Sheet";
import { Badge } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { ExercisePicker } from "@/components/app/ExercisePicker";
import { formatDuration } from "@/lib/dates";
import { fromDisplayWeight, toDisplayWeight, weightUnit, type UnitSystem } from "@/lib/units";
import { summarizeSets } from "@/lib/engines/performance";
import { cn } from "@/lib/cn";
import type { PlayerState } from "@/lib/server/services/player";
import { finishWorkout, getSessionState, logSet, sessionOp } from "../../actions";

type Ex = PlayerState["exercises"][number];
type MEx = Omit<Ex, "sets"> & { sets: (Ex["sets"][number] & { pending: boolean })[] };
type QueuedSet = { clientId: string; sessionExerciseId: string; setNumber: number; weightKg: number; reps: number; rir: number | null; completedAt: string };

const qKey = (id: string) => `forma_set_queue_${id}`;
const loadQueue = (id: string): QueuedSet[] => { try { return JSON.parse(localStorage.getItem(qKey(id)) ?? "[]"); } catch { return []; } };
const saveQueue = (id: string, q: QueuedSet[]) => { try { localStorage.setItem(qKey(id), JSON.stringify(q)); } catch { /* storage unavailable */ } };
const uuid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

export function WorkoutPlayer({ initial, unit }: { initial: PlayerState; unit: UnitSystem }) {
  const [state, setState] = useState(initial);
  const [queue, setQueue] = useState<QueuedSet[]>([]);
  const [offline, setOffline] = useState(false);
  const [activeIdx, setActiveIdx] = useState(() => Math.max(0, initial.exercises.findIndex((e) => e.status === "pending")));
  const [rest, setRest] = useState<{ endsAt: number; total: number; exerciseId: string; label: string } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [finishOpen, setFinishOpen] = useState(false);
  const [done, setDone] = useState<{ prCount: number } | null>(null);
  const [justDone, setJustDone] = useState<string | null>(null);
  const flushing = useRef(false);
  const toast = useToast();
  const router = useRouter();
  const sid = state.id;

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  // Merge server state with locally-queued sets (offline-safe)
  const merged = useMemo(() => state.exercises.map((e) => {
    const extra = queue.filter((q) => q.sessionExerciseId === e.id && !e.sets.some((s) => s.clientId === q.clientId));
    return { ...e, sets: [...e.sets.map((s) => ({ ...s, pending: false })), ...extra.map((q) => ({ id: q.clientId, clientId: q.clientId, setNumber: q.setNumber, weightKg: q.weightKg, reps: q.reps, rir: q.rir, pending: true }))] };
  }), [state, queue]);

  const refresh = useCallback(async () => {
    try {
      const r = await getSessionState(sid);
      if (r.ok) setState(r.data);
    } catch { setOffline(true); }
  }, [sid]);

  const flush = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    let q = loadQueue(sid);
    try {
      while (q.length) {
        const item = q[0];
        const r = await logSet(item);
        if (!r.ok) toast(r.error, "error");
        q = q.slice(1);
        saveQueue(sid, q);
        setQueue(q);
      }
      setOffline(false);
      await refresh();
    } catch {
      setOffline(true); // network failure: keep the queue, retry later
    } finally {
      flushing.current = false;
    }
  }, [sid, refresh, toast]);

  useEffect(() => {
    setQueue(loadQueue(sid));
    flush();
    const on = () => flush();
    window.addEventListener("online", on);
    const t = setInterval(() => { if (loadQueue(sid).length) flush(); }, 15000);
    return () => { window.removeEventListener("online", on); clearInterval(t); };
  }, [sid, flush]);


  function completeSet(e: MEx, weightDisplay: number, reps: number, rir: number | null) {
    const item: QueuedSet = { clientId: uuid(), sessionExerciseId: e.id, setNumber: e.sets.length + 1, weightKg: fromDisplayWeight(weightDisplay, unit), reps, rir, completedAt: new Date().toISOString() };
    const q = [...loadQueue(sid), item];
    saveQueue(sid, q);
    setQueue(q);
    setJustDone(item.clientId);
    if (navigator.vibrate) navigator.vibrate(30);
    flush();
    const isLastSet = e.sets.length + 1 >= e.targetSets;
    const nextIdx = merged.findIndex((x, i) => i > activeIdx && x.status === "pending");
    const moreLater = nextIdx >= 0 || !isLastSet;
    if (moreLater && e.restSec > 0) setRest({ endsAt: Date.now() + e.restSec * 1000, total: e.restSec, exerciseId: e.exerciseId, label: isLastSet ? `Next: ${merged[nextIdx]?.name}` : `Next: set ${e.sets.length + 2}` });
    if (isLastSet && nextIdx >= 0) setTimeout(() => setActiveIdx(nextIdx), 400);
  }

  async function op(o: Parameters<typeof sessionOp>[0], success?: string) {
    try {
      const r = await sessionOp(o);
      if (!r.ok) return toast(r.error, "error");
      if (success) toast(success);
      await refresh();
    } catch { toast("You're offline — this change needs a connection.", "error"); }
  }

  const elapsed = Math.max(0, Math.floor((now - new Date(state.startedAt).getTime()) / 1000));
  const totalDone = merged.reduce((s, e) => s + e.sets.length, 0);
  const totalTarget = merged.reduce((s, e) => s + (e.status === "skipped" ? 0 : e.targetSets), 0);

  if (done) return <Completed name={state.name} elapsed={elapsed} sets={totalDone} prCount={done.prCount} sessionId={sid} volume={merged.reduce((s, e) => s + e.sets.reduce((a, x) => a + x.weightKg * x.reps, 0), 0)} unit={unit} />;

  return (
    <div className="-mx-4 -mt-5 min-h-dvh md:mx-0 md:mt-0">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur md:rounded-2xl md:border">
        <div className="flex items-center gap-3">
          <IconButton label="Leave workout (stays in progress)" onClick={() => router.push("/workout")}><X className="size-5" /></IconButton>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-semibold">{state.name}</h1>
            <p className="t-small tabular text-fg-2"><span aria-label="Elapsed time" suppressHydrationWarning>{formatDuration(elapsed)}</span> · {totalDone}/{totalTarget} sets</p>
          </div>
          <Button size="sm" onClick={() => setFinishOpen(true)}>Finish</Button>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${totalTarget ? Math.min(100, (totalDone / totalTarget) * 100) : 0}%` }} /></div>
      </header>

      {offline && (
        <div role="status" className="t-small mx-4 mt-3 flex items-center gap-2 rounded-xl bg-warning-soft px-3 py-2 text-warning">
          <CloudOff className="size-4" />Connection lost — your sets are saved on this device and will sync automatically.
        </div>
      )}

      <div className={cn("space-y-3 px-4 py-4 md:px-0", rest && "pb-72")}>
        {merged.length === 0 && (
          <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong p-8 text-center">
            <p className="t-h3">Empty workout</p>
            <p className="t-small mt-1 text-fg-2">Add your first exercise to start logging.</p>
          </div>
        )}
        {merged.map((e, i) => i === activeIdx
          ? <ActiveExercise key={e.id} e={e} unit={unit} justDone={justDone} onComplete={(w, r, rir) => completeSet(e, w, r, rir)} op={op} refresh={refresh} />
          : <CollapsedExercise key={e.id} e={e} index={i} unit={unit} onOpen={() => setActiveIdx(i)} />)}
        <AddExercise onAdd={(exerciseId) => op({ type: "add", sessionId: sid, exerciseId }, "Exercise added").then(() => setActiveIdx(merged.length))} />
      </div>

      {rest && <RestTimer rest={rest} now={now} onAdd={(s) => setRest((r) => r && { ...r, endsAt: r.endsAt + s * 1000, total: r.total + s })} onSkip={() => setRest(null)}
        onSaveDefault={(sec) => op({ type: "rest", exerciseId: rest.exerciseId, seconds: sec }, `Default rest saved: ${sec}s`)} />}

      <FinishSheet open={finishOpen} onClose={() => setFinishOpen(false)} remaining={Math.max(0, totalTarget - totalDone)} hasSets={totalDone > 0} queueLen={queue.length}
        onDiscard={async () => { await op({ type: "discard", sessionId: sid }); saveQueue(sid, []); router.push("/workout"); }}
        onFinish={async (notes) => {
          await flush();
          if (loadQueue(sid).length) return toast("Reconnect to finish — a few sets still need to sync.", "error");
          try {
            const r = await finishWorkout(sid, notes);
            if (!r.ok) return toast(r.error, "error");
            setFinishOpen(false);
            setDone(r.data);
          } catch { toast("You're offline. Your sets are safe — finish once you're back online.", "error"); }
        }} />
    </div>
  );
}

function CollapsedExercise({ e, index, unit, onOpen }: { e: MEx; index: number; unit: UnitSystem; onOpen: () => void }) {
  const complete = e.sets.length >= e.targetSets;
  return (
    <button onClick={onOpen} className={cn("flex w-full items-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4 text-left transition-colors hover:bg-surface-2", e.status === "skipped" && "opacity-60")}>
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold", complete ? "bg-success-soft text-success" : "bg-surface-2 text-fg-2")}>{complete ? <Check className="size-4" /> : index + 1}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{e.name}</span>
        <span className="t-small tabular text-fg-2">{e.status === "skipped" ? "Skipped" : e.sets.length ? summarizeSets(e.sets, (kg) => `${toDisplayWeight(kg, unit)}`) + ` ${weightUnit(unit)}` : `${e.targetSets} × ${e.repMin === e.repMax ? e.repMin : `${e.repMin}–${e.repMax}`}`}</span>
      </span>
      <span className="t-small tabular text-fg-3">{e.sets.length}/{e.targetSets}</span>
      <ChevronDown className="size-4 text-fg-3" aria-hidden />
    </button>
  );
}

function ActiveExercise({ e, unit, justDone, onComplete, op, refresh }: { e: MEx; unit: UnitSystem; justDone: string | null; onComplete: (w: number, r: number, rir: number | null) => void; op: (o: Parameters<typeof sessionOp>[0], s?: string) => Promise<unknown>; refresh: () => Promise<void> }) {
  const last = e.sets.at(-1);
  const rec = e.recommendation;
  const prevSet = e.previous?.last[e.sets.length] ?? e.previous?.last.at(-1);
  const defaultKg = last?.weightKg ?? rec?.weightKg ?? prevSet?.weightKg ?? 0;
  const [weight, setWeight] = useState<number | null>(toDisplayWeight(defaultKg, unit));
  const [reps, setReps] = useState<number | null>(last?.reps ?? rec?.repTarget ?? e.repMin);
  const [rir, setRir] = useState<number | null>(e.rirTarget);
  const [menu, setMenu] = useState(false);
  const [replace, setReplace] = useState(false);
  const [updatePlan, setUpdatePlan] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [editing, setEditing] = useState<(typeof e.sets)[number] | null>(null);
  const allDone = e.sets.length >= e.targetSets;
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, []);
  const step = unit === "imperial" ? 5 : 2.5;
  const u = weightUnit(unit);
  const fmt = (kg: number) => `${toDisplayWeight(kg, unit)} ${u}`;

  return (
    <section ref={ref} aria-label={e.name} className="anim-rise scroll-mt-24 rounded-[var(--radius-card)] border border-line-strong bg-surface">
      <div className="flex items-start justify-between gap-3 p-5 pb-3">
        <div className="min-w-0">
          {e.replacedFrom && <p className="t-small mb-1 text-fg-3">Replaces {e.replacedFrom}</p>}
          <h2 className="t-h2">{e.name}</h2>
          <p className="t-small tabular mt-1 text-fg-2">Target {e.targetSets} × {e.repMin === e.repMax ? e.repMin : `${e.repMin}–${e.repMax}`}{e.isTimed ? " (sec/min)" : ""}{e.rirTarget != null ? ` · RIR ${e.rirTarget}` : ""} · rest {e.restSec}s</p>
        </div>
        <IconButton label="Exercise options" onClick={() => setMenu(true)}><MoreHorizontal className="size-5" /></IconButton>
      </div>

      {/* Previous performance */}
      <div className="mx-5 grid grid-cols-3 gap-2 rounded-2xl bg-surface-2 p-3 text-center">
        <div><p className="t-caption">Last</p><p className="t-small tabular mt-1 font-semibold">{e.previous ? summarizeSets(e.previous.last, (kg) => `${toDisplayWeight(kg, unit)}`) : "—"}</p></div>
        <div><p className="t-caption">Best</p><p className="t-small tabular mt-1 font-semibold">{e.previous ? `${fmt(e.previous.best.weightKg)} × ${e.previous.best.reps}` : "—"}</p></div>
        <div><p className="t-caption">Est. 1RM</p><p className="t-small tabular mt-1 font-semibold">{e.previous?.e1rm ? fmt(e.previous.e1rm) : "—"}</p></div>
      </div>
      {rec && <p className="t-small mx-5 mt-3 flex gap-2 text-fg-2"><Info className="mt-0.5 size-4 shrink-0 text-accent" />{rec.reason}</p>}

      {/* Sets */}
      <ol className="mt-4 space-y-1.5 px-5" aria-label="Sets">
        {e.sets.map((s) => (
          <li key={s.clientId} className={cn("flex items-center gap-3 rounded-xl bg-success-soft/50 px-3 py-2.5", s.clientId === justDone && "anim-pop")}>
            <span className="flex size-7 items-center justify-center rounded-lg bg-success text-[12px] font-bold text-white"><Check className="size-4" /></span>
            <span className="t-small font-medium text-fg-2">Set {s.setNumber}</span>
            <span className="t-stat flex-1 text-base">{e.isTimed && s.weightKg === 0 ? `${s.reps}` : `${toDisplayWeight(s.weightKg, unit)} ${u} × ${s.reps}`}</span>
            {s.rir != null && <span className="t-small text-fg-3">RIR {s.rir}</span>}
            {s.pending ? <span className="t-small text-warning">Syncing</span> : <IconButton label={`Edit set ${s.setNumber}`} className="size-8" onClick={() => setEditing(s)}><Pencil className="size-4" /></IconButton>}
          </li>
        ))}
        {!allDone && (
          <li className="flex items-center gap-3 rounded-xl border border-accent/40 bg-accent-soft px-3 py-2.5">
            <span className="flex size-7 items-center justify-center rounded-lg bg-accent text-[12px] font-bold text-accent-contrast">{e.sets.length + 1}</span>
            <span className="t-small font-semibold">Set {e.sets.length + 1} · current</span>
            {prevSet && <span className="t-small ml-auto text-fg-2">Last time: {e.isTimed && prevSet.weightKg === 0 ? prevSet.reps : `${fmt(prevSet.weightKg)} × ${prevSet.reps}`}</span>}
          </li>
        )}
        {Array.from({ length: Math.max(0, e.targetSets - e.sets.length - 1) }).map((_, i) => (
          <li key={i} className="t-small flex items-center gap-3 rounded-xl border border-dashed border-line px-3 py-2.5 text-fg-3">
            <span className="flex size-7 items-center justify-center rounded-lg bg-surface-2 text-[12px] font-bold">{e.sets.length + i + 2}</span>Set {e.sets.length + i + 2}
          </li>
        ))}
      </ol>

      {/* Inputs */}
      {e.status === "skipped" ? (
        <div className="p-5"><Button full variant="secondary" onClick={() => op({ type: "unskip", sessionExerciseId: e.id })}>Un-skip exercise</Button></div>
      ) : (
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            {!(e.isTimed && defaultKg === 0) && <Stepper label={`Weight (${u})`} value={weight} onChange={setWeight} step={step} decimals={2} max={unit === "imperial" ? 2000 : 1000} />}
            <Stepper label={e.isTimed ? "Seconds / minutes" : "Reps"} value={reps} onChange={setReps} step={1} max={500} />
          </div>
          {!e.isTimed && (
            <div>
              <p className="t-caption mb-2">Reps in reserve (RIR)</p>
              <div role="radiogroup" aria-label="Reps in reserve" className="grid grid-cols-6 gap-1.5">
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={rir === n} onClick={() => setRir(rir === n ? null : n)}
                    className={cn("t-stat h-11 rounded-xl border text-base", rir === n ? "border-accent bg-accent-soft text-fg" : "border-line bg-surface-2 text-fg-2")}>{n}{n === 5 ? "+" : ""}</button>
                ))}
              </div>
              <p className="t-small mt-1.5 text-fg-3">How many more reps could you have done? 0 = failure.</p>
            </div>
          )}
          <Button size="xl" full disabled={reps == null || reps <= 0} onClick={() => onComplete(weight ?? 0, reps ?? 0, e.isTimed ? null : rir)} icon={<Check className="size-5" />}>
            {allDone ? "Log extra set" : "Complete Set"}
          </Button>
        </div>
      )}

      {/* Options */}
      <Sheet open={menu} onClose={() => setMenu(false)} title={e.name} size="sm">
        <div className="grid gap-2">
          <MenuItem icon={<Plus className="size-4" />} label="Add set" onClick={() => { setMenu(false); op({ type: "addSet", sessionExerciseId: e.id }); }} />
          <MenuItem icon={<Trash2 className="size-4" />} label="Remove a set" disabled={e.targetSets <= Math.max(1, e.sets.length)} onClick={() => { setMenu(false); op({ type: "removeSet", sessionExerciseId: e.id }); }} />
          <MenuItem icon={<Repeat className="size-4" />} label="Replace exercise" onClick={() => { setMenu(false); setReplace(true); }} />
          <MenuItem icon={<SkipForward className="size-4" />} label="Skip exercise" onClick={() => { setMenu(false); op({ type: "skip", sessionExerciseId: e.id }, "Exercise skipped"); }} />
          <MenuItem icon={<StickyNote className="size-4" />} label={e.notes ? "Edit note" : "Add note"} onClick={() => { setMenu(false); setNote(e.notes ?? ""); }} />
          <Link href={`/workout/exercises/${e.slug}#demo`} target="_blank" className="flex h-12 items-center gap-3 rounded-xl bg-surface-2 px-4 font-medium hover:bg-surface-3"><Video className="size-4" />Watch demonstration</Link>
          <Link href={`/progress/strength/${e.slug}`} target="_blank" className="flex h-12 items-center gap-3 rounded-xl bg-surface-2 px-4 font-medium hover:bg-surface-3"><History className="size-4" />Exercise history</Link>
        </div>
      </Sheet>
      <ExercisePicker open={replace} onClose={() => setReplace(false)} title="Replace exercise" replaceFor={{ exerciseId: e.exerciseId, name: e.name }}
        onPick={(id, name) => { setReplace(false); op({ type: "replace", sessionExerciseId: e.id, exerciseId: id, updatePlan }, `Replaced with ${name}`); }}
        footer={<label className="t-small flex items-center gap-3 text-fg-2"><input type="checkbox" checked={updatePlan} onChange={(ev) => setUpdatePlan(ev.target.checked)} className="size-4 accent-[var(--accent)]" />Also replace it in my plan for future workouts</label>} />
      <Sheet open={note != null} onClose={() => setNote(null)} title="Exercise note" size="sm" footer={<Button full onClick={() => { op({ type: "note", sessionExerciseId: e.id, notes: note ?? "" }, "Note saved"); setNote(null); }}>Save note</Button>}>
        <Textarea aria-label="Note" value={note ?? ""} maxLength={500} onChange={(ev) => setNote(ev.target.value)} placeholder="e.g. Seat height 4, felt strong" />
      </Sheet>
      {editing && <EditSet key={editing.clientId} set={editing} unit={unit} isTimed={e.isTimed} sessionExerciseId={e.id} onClose={() => setEditing(null)} op={op} refresh={refresh} />}
    </section>
  );
}

function EditSet({ set, unit, isTimed, sessionExerciseId, onClose, op, refresh }: { set: { id: string; clientId: string; setNumber: number; weightKg: number; reps: number; rir: number | null }; unit: UnitSystem; isTimed: boolean; sessionExerciseId: string; onClose: () => void; op: (o: Parameters<typeof sessionOp>[0], s?: string) => Promise<unknown>; refresh: () => Promise<void> }) {
  const [w, setW] = useState<number | null>(toDisplayWeight(set.weightKg, unit));
  const [r, setR] = useState<number | null>(set.reps);
  const [rir, setRir] = useState<number | null>(set.rir);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  return (
    <Sheet open onClose={onClose} title={`Edit set ${set.setNumber}`} size="sm"
      footer={<div className="flex gap-3">
        <Button variant="danger" onClick={async () => { setBusy(true); await op({ type: "deleteSet", setId: set.id }, "Set deleted"); onClose(); }} icon={<Trash2 className="size-4" />}>Delete</Button>
        <Button full loading={busy} onClick={async () => {
          setBusy(true);
          try {
            const res = await logSet({ clientId: set.clientId, sessionExerciseId, setNumber: set.setNumber, weightKg: fromDisplayWeight(w ?? 0, unit), reps: r ?? 0, rir });
            if (!res.ok) toast(res.error, "error"); else toast("Set updated");
            await refresh();
          } catch { toast("You're offline — editing needs a connection.", "error"); }
          onClose();
        }}>Save</Button>
      </div>}>
      <div className="grid grid-cols-2 gap-3">
        <Stepper label={`Weight (${weightUnit(unit)})`} value={w} onChange={setW} step={unit === "imperial" ? 5 : 2.5} decimals={2} size="md" />
        <Stepper label={isTimed ? "Time" : "Reps"} value={r} onChange={setR} size="md" />
      </div>
      {!isTimed && <div className="mt-4 flex flex-wrap gap-2">{[0, 1, 2, 3, 4, 5].map((n) => <Chip key={n} role="radio" selected={rir === n} onClick={() => setRir(rir === n ? null : n)}>RIR {n}</Chip>)}</div>}
    </Sheet>
  );
}

function MenuItem({ icon, label, onClick, disabled }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return <button disabled={disabled} onClick={onClick} className="flex h-12 items-center gap-3 rounded-xl bg-surface-2 px-4 text-left font-medium hover:bg-surface-3 disabled:opacity-40">{icon}{label}</button>;
}

function AddExercise({ onAdd }: { onAdd: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" full size="lg" icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>Add exercise</Button>
      <ExercisePicker open={open} onClose={() => setOpen(false)} title="Add exercise" onPick={(id) => { setOpen(false); onAdd(id); }} />
    </>
  );
}

function RestTimer({ rest, now, onAdd, onSkip, onSaveDefault }: { rest: { endsAt: number; total: number; label: string }; now: number; onAdd: (s: number) => void; onSkip: () => void; onSaveDefault: (s: number) => void }) {
  const left = Math.max(0, Math.ceil((rest.endsAt - now) / 1000));
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 250); return () => clearInterval(t); }, []);
  const precise = Math.max(0, rest.endsAt - Date.now());
  useEffect(() => {
    if (left === 0) {
      if (navigator.vibrate) navigator.vibrate([120, 80, 120]);
      const t = setTimeout(onSkip, 2500);
      return () => clearTimeout(t);
    }
  }, [left === 0]); // eslint-disable-line react-hooks/exhaustive-deps
  void tick;
  return (
    <div role="timer" aria-live="polite" aria-label="Rest timer" className="pb-safe anim-sheet fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface shadow-[var(--shadow-float)] md:inset-x-auto md:bottom-6 md:right-6 md:w-96 md:rounded-[24px] md:border">
      <div className="h-1 bg-surface-3"><div className="h-full bg-accent" style={{ width: `${(precise / (rest.total * 1000)) * 100}%` }} /></div>
      <div className="p-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="t-caption text-accent">{left === 0 ? "Rest complete" : "Rest"}</p>
            <p className="t-stat mt-1 text-[3.25rem]">{formatDuration(left)}</p>
            <p className="t-small text-fg-2">{rest.label}</p>
          </div>
          <button className="t-small text-fg-3 underline-offset-2 hover:text-fg hover:underline" onClick={() => onSaveDefault(rest.total)}>Make {rest.total}s my default</button>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Button variant="secondary" size="lg" onClick={() => onAdd(15)}>+15 sec</Button>
          <Button variant="secondary" size="lg" onClick={() => onAdd(30)}>+30 sec</Button>
          <Button size="lg" onClick={onSkip}>Skip</Button>
        </div>
      </div>
    </div>
  );
}

function FinishSheet({ open, onClose, onFinish, onDiscard, remaining, hasSets, queueLen }: { open: boolean; onClose: () => void; onFinish: (notes: string) => Promise<unknown>; onDiscard: () => Promise<unknown>; remaining: number; hasSets: boolean; queueLen: number }) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  return (
    <>
      <Sheet open={open} onClose={onClose} title="Finish workout?" description={remaining > 0 ? `${remaining} planned set${remaining > 1 ? "s" : ""} not logged — they'll be marked as skipped.` : "Every planned set is logged. Nice work."}
        footer={<div className="space-y-2"><Button full size="lg" disabled={!hasSets} loading={busy} onClick={async () => { setBusy(true); await onFinish(notes); setBusy(false); }}>Finish & save</Button><Button full variant="ghost" onClick={() => setConfirmDiscard(true)}>Discard workout</Button></div>}>
        {!hasSets && <p className="t-small mb-3 text-warning">Log at least one set to save this workout.</p>}
        {queueLen > 0 && <p className="t-small mb-3 text-warning">{queueLen} set(s) still syncing.</p>}
        <Textarea aria-label="Workout notes" placeholder="How did it feel? (optional)" value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} />
      </Sheet>
      <ConfirmDialog open={confirmDiscard} onClose={() => setConfirmDiscard(false)} danger title="Discard this workout?" body="All sets logged in this session will be deleted. This can't be undone." confirmLabel="Discard" onConfirm={async () => { setConfirmDiscard(false); await onDiscard(); }} />
    </>
  );
}

function Completed({ name, elapsed, sets, volume, prCount, sessionId, unit }: { name: string; elapsed: number; sets: number; volume: number; prCount: number; sessionId: string; unit: UnitSystem }) {
  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <div className="anim-pop mx-auto mb-6 flex size-20 items-center justify-center rounded-3xl bg-accent-soft text-accent"><Trophy className="size-10" /></div>
      <p className="t-caption text-accent">Workout complete</p>
      <h1 className="t-h1 mt-2">{name}</h1>
      <div className="mt-8 grid grid-cols-3 gap-3">
        {[["Time", formatDuration(elapsed)], ["Sets", String(sets)], ["Volume", `${Math.round(toDisplayWeight(volume, unit)).toLocaleString()} ${weightUnit(unit)}`]].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-line bg-surface p-4"><p className="t-caption">{k}</p><p className="t-stat mt-2 text-xl">{v}</p></div>
        ))}
      </div>
      {prCount > 0 && <div className="anim-pr mt-4 rounded-2xl border border-accent/50 bg-accent-soft p-4"><Badge tone="accent">NEW PR</Badge><p className="mt-2 font-semibold">{prCount} personal record{prCount > 1 ? "s" : ""} this session</p></div>}
      <div className="mt-8 grid gap-2">
        <Link href={`/workout/history/${sessionId}`} className="flex h-12 items-center justify-center rounded-[var(--radius-btn)] bg-accent font-semibold text-accent-contrast">View summary</Link>
        <Link href="/home" className="flex h-12 items-center justify-center rounded-[var(--radius-btn)] border border-line font-semibold">Back to home</Link>
      </div>
    </div>
  );
}
