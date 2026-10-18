"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, HeartPulse, Search, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Chip, Field, Input, OptionCard, Select, Textarea } from "@/components/ui/Input";
import { Notice } from "@/components/ui/States";
import { Logo } from "@/components/app/Logo";
import { useToast } from "@/components/ui/Toast";
import { ACTIVITY_LEVELS, EQUIPMENT, EXPERIENCE, GOALS, GYM_DEFAULT_EQUIPMENT, HOME_DEFAULT_EQUIPMENT, LOCATIONS, MUSCLES, SESSION_LENGTHS, TRAINING_HISTORY, WEEKDAYS } from "@/lib/domain/enums";
import { KG_PER_LB } from "@/lib/units";
import { cn } from "@/lib/cn";
import { completeOnboarding } from "./actions";
import type { OnboardingInput } from "@/lib/server/services/profile";

type Ex = { id: string; name: string; category: string };
type Draft = Omit<OnboardingInput, "age" | "heightCm" | "weightKg" | "goalWeightKg"> & { age: string; height: string; heightFt: string; heightIn: string; weight: string; goalWeight: string };

const STORAGE = "forma_onboarding_draft";
const defaultTz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "UTC"; } };

const initial = (): Draft => ({
  firstName: "", age: "", sex: "male", height: "", heightFt: "", heightIn: "", weight: "", unitSystem: "metric", timezone: defaultTz(), country: null,
  experience: "beginner", trainingHistory: "3_12m", primaryGoal: "build_muscle", secondaryGoal: null, goalWeight: "", musclePriorities: [],
  daysPerWeek: 3, sessionLength: "45_60", availableDays: [0, 2, 4], trainingLocation: "gym", equipment: [...GYM_DEFAULT_EQUIPMENT] as never,
  activityLevel: "moderate", injuries: "", cannotDo: [], dislikes: [], prioritize: [],
});

const STEPS = ["About you", "Body", "Experience", "Goal", "Muscle priorities", "Schedule", "Equipment", "Limitations", "Daily activity", "Review"] as const;

export function Onboarding({ exercises }: { exercises: Ex[] }) {
  const [d, setD] = useState<Draft>(initial);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    try { const raw = localStorage.getItem(STORAGE); if (raw) setD({ ...initial(), ...JSON.parse(raw) }); } catch { /* storage unavailable */ }
  }, []);
  useEffect(() => { try { localStorage.setItem(STORAGE, JSON.stringify(d)); } catch { /* ignore */ } }, [d]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((s) => ({ ...s, [k]: v }));
  const imperial = d.unitSystem === "imperial";
  const heightCm = imperial ? (Number(d.heightFt) * 12 + Number(d.heightIn || 0)) * 2.54 : Number(d.height);
  const weightKg = imperial ? Number(d.weight) * KG_PER_LB : Number(d.weight);
  const goalWeightKg = d.goalWeight ? (imperial ? Number(d.goalWeight) * KG_PER_LB : Number(d.goalWeight)) : null;

  function validate(i: number) {
    const e: Record<string, string> = {};
    if (i === 0) {
      if (!d.firstName.trim()) e.firstName = "What should we call you?";
      const age = Number(d.age);
      if (!age || age < 13 || age > 100) e.age = "Enter an age between 13 and 100";
    }
    if (i === 1) {
      if (!(heightCm >= 120 && heightCm <= 230)) e.height = "Enter a realistic height";
      if (!(weightKg >= 30 && weightKg <= 300)) e.weight = "Enter a realistic weight";
      if (goalWeightKg != null && !(goalWeightKg >= 30 && goalWeightKg <= 300)) e.goalWeight = "Enter a realistic goal weight";
    }
    if (i === 5 && d.availableDays.length === 0) e.days = "Pick at least one day";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const next = () => { if (validate(step)) setStep((s) => Math.min(STEPS.length - 1, s + 1)); window.scrollTo({ top: 0 }); };
  const back = () => setStep((s) => Math.max(0, s - 1));

  function finish() {
    if (![0, 1, 5].every((i) => validate(i))) { toast("Some details need attention", "error"); return; }
    const payload: OnboardingInput = {
      ...d, age: Number(d.age), heightCm: Math.round(heightCm * 10) / 10, weightKg: Math.round(weightKg * 10) / 10, goalWeightKg: goalWeightKg ? Math.round(goalWeightKg * 10) / 10 : null,
      daysPerWeek: d.daysPerWeek, country: d.country || null, injuries: d.injuries || null,
    };
    start(async () => {
      const res = await completeOnboarding(payload);
      if (!res.ok) { toast(res.error, "error"); return; }
      try { localStorage.removeItem(STORAGE); } catch { /* ignore */ }
      router.replace("/workout/plan?welcome=1");
    });
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-5">
      <header className="flex items-center justify-between py-5">
        <Logo />
        <span className="t-small tabular text-fg-2">Step {step + 1} / {STEPS.length}</span>
      </header>
      <div className="mb-8 flex gap-1" role="progressbar" aria-label="Onboarding progress" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={STEPS.length}>
        {STEPS.map((s, i) => <span key={s} className={cn("h-1 flex-1 rounded-full transition-colors duration-300", i <= step ? "bg-accent" : "bg-surface-3")} />)}
      </div>

      <main id="main" key={step} className="anim-rise flex-1 pb-32">
        <p className="t-caption mb-2">{STEPS[step]}</p>
        {step === 0 && (
          <Q title="Let's get to know you" sub="This personalizes your plan and nutrition targets.">
            <Field label="First name" error={errors.firstName}>{(p) => <Input {...p} value={d.firstName} onChange={(e) => set("firstName", e.target.value)} autoComplete="given-name" />}</Field>
            <Field label="Age" error={errors.age}>{(p) => <Input {...p} inputMode="numeric" value={d.age} onChange={(e) => set("age", e.target.value.replace(/\D/g, ""))} />}</Field>
            <fieldset>
              <legend className="mb-2 text-[0.8125rem] font-medium text-fg-2">Sex <span className="text-fg-3">(used to estimate energy needs)</span></legend>
              <div role="radiogroup" className="flex flex-wrap gap-2">
                {(["male", "female", "other"] as const).map((s) => <Chip key={s} role="radio" selected={d.sex === s} onClick={() => set("sex", s)}>{s === "other" ? "Prefer not to say" : s[0].toUpperCase() + s.slice(1)}</Chip>)}
              </div>
            </fieldset>
            <Field label="Time zone" hint="Used for your daily logs and schedule.">{(p) => <Input {...p} value={d.timezone} onChange={(e) => set("timezone", e.target.value)} />}</Field>
          </Q>
        )}
        {step === 1 && (
          <Q title="Your body today" sub="Your starting point — you can update it anytime.">
            <div role="radiogroup" aria-label="Units" className="flex gap-2">
              <Chip role="radio" selected={!imperial} onClick={() => set("unitSystem", "metric")}>Metric (kg, cm)</Chip>
              <Chip role="radio" selected={imperial} onClick={() => set("unitSystem", "imperial")}>Imperial (lb, ft)</Chip>
            </div>
            {imperial ? (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Height (ft)" error={errors.height}>{(p) => <Input {...p} inputMode="numeric" value={d.heightFt} onChange={(e) => set("heightFt", e.target.value)} suffix="ft" />}</Field>
                <Field label="(in)">{(p) => <Input {...p} inputMode="numeric" value={d.heightIn} onChange={(e) => set("heightIn", e.target.value)} suffix="in" />}</Field>
              </div>
            ) : (
              <Field label="Height" error={errors.height}>{(p) => <Input {...p} inputMode="decimal" value={d.height} onChange={(e) => set("height", e.target.value)} suffix="cm" />}</Field>
            )}
            <Field label="Weight" error={errors.weight}>{(p) => <Input {...p} inputMode="decimal" value={d.weight} onChange={(e) => set("weight", e.target.value)} suffix={imperial ? "lb" : "kg"} />}</Field>
            <Field label="Goal weight (optional)" error={errors.goalWeight}>{(p) => <Input {...p} inputMode="decimal" value={d.goalWeight} onChange={(e) => set("goalWeight", e.target.value)} suffix={imperial ? "lb" : "kg"} />}</Field>
          </Q>
        )}
        {step === 2 && (
          <Q title="What's your training experience?">
            <div role="radiogroup" className="space-y-2">{EXPERIENCE.map((x) => <OptionCard key={x.key} selected={d.experience === x.key} onClick={() => set("experience", x.key)} title={x.label} hint={x.hint} />)}</div>
            <h3 className="t-h3 pt-4">How long have you trained consistently?</h3>
            <div role="radiogroup" className="flex flex-wrap gap-2">{TRAINING_HISTORY.map((x) => <Chip key={x.key} role="radio" selected={d.trainingHistory === x.key} onClick={() => set("trainingHistory", x.key)}>{x.label}</Chip>)}</div>
          </Q>
        )}
        {step === 3 && (
          <Q title="What are you trying to achieve?" sub="Pick your main goal. You can add a secondary one.">
            <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">{GOALS.map((g) => <OptionCard key={g.key} selected={d.primaryGoal === g.key} onClick={() => { set("primaryGoal", g.key); if (d.secondaryGoal === g.key) set("secondaryGoal", null); }} title={g.label} />)}</div>
            <Field label="Secondary goal (optional)">{(p) => (
              <Select {...p} value={d.secondaryGoal ?? ""} onChange={(e) => set("secondaryGoal", (e.target.value || null) as Draft["secondaryGoal"])}>
                <option value="">None</option>
                {GOALS.filter((g) => g.key !== d.primaryGoal).map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
              </Select>
            )}</Field>
          </Q>
        )}
        {step === 4 && (
          <Q title="Any muscles you want to prioritize?" sub="Tap in order of priority (up to 4). Your plan adds a little extra volume for these.">
            <div className="flex flex-wrap gap-2">
              {MUSCLES.map((m) => {
                const idx = d.musclePriorities.indexOf(m.key);
                return (
                  <Chip key={m.key} selected={idx >= 0} disabled={idx < 0 && d.musclePriorities.length >= 4}
                    onClick={() => set("musclePriorities", idx >= 0 ? d.musclePriorities.filter((x) => x !== m.key) : [...d.musclePriorities, m.key])}>
                    {idx >= 0 && <span className="flex size-5 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-contrast tabular">{idx + 1}</span>}
                    {m.label}
                  </Chip>
                );
              })}
            </div>
            <p className="t-small text-fg-3">No preference? Skip — we'll keep things balanced.</p>
          </Q>
        )}
        {step === 5 && (
          <Q title="When can you train?" sub="We'll space sessions to allow recovery.">
            <div>
              <p className="mb-2 text-[0.8125rem] font-medium text-fg-2">Sessions per week</p>
              <div role="radiogroup" className="grid grid-cols-7 gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={d.daysPerWeek === n} onClick={() => set("daysPerWeek", n)}
                    className={cn("t-stat h-12 rounded-xl border text-lg", d.daysPerWeek === n ? "border-accent bg-accent-soft" : "border-line bg-surface-2 text-fg-2")}>{n}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[0.8125rem] font-medium text-fg-2">Time per workout</p>
              <div role="radiogroup" className="flex flex-wrap gap-2">{SESSION_LENGTHS.map((s) => <Chip key={s.key} role="radio" selected={d.sessionLength === s.key} onClick={() => set("sessionLength", s.key)}>{s.label}</Chip>)}</div>
            </div>
            <div>
              <p className="mb-2 text-[0.8125rem] font-medium text-fg-2">Which days are available?</p>
              <ul className="space-y-1.5">
                {WEEKDAYS.map((w, i) => {
                  const on = d.availableDays.includes(i);
                  return (
                    <li key={w}>
                      <button type="button" role="checkbox" aria-label={w} aria-checked={on} onClick={() => set("availableDays", on ? d.availableDays.filter((x) => x !== i) : [...d.availableDays, i].sort())}
                        className={cn("flex h-12 w-full items-center justify-between rounded-xl border px-4", on ? "border-accent/60 bg-accent-soft" : "border-line bg-surface")}>
                        <span className="font-medium">{w}</span>
                        <span className={cn("t-small font-semibold", on ? "text-accent" : "text-fg-3")}>{on ? "Available" : "Rest"}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {errors.days && <p role="alert" className="t-small mt-2 text-danger">{errors.days}</p>}
              {d.availableDays.length > 0 && d.availableDays.length < d.daysPerWeek && <p className="t-small mt-2 text-warning">You picked {d.availableDays.length} day(s) for {d.daysPerWeek} sessions — we'll suggest a schedule you can adjust.</p>}
              {d.daysPerWeek === 7 && <p className="t-small mt-2 text-fg-2">We'll keep at least one full rest day — recovery is when you get stronger.</p>}
            </div>
          </Q>
        )}
        {step === 6 && (
          <Q title="Where do you train?">
            <div role="radiogroup" className="grid grid-cols-2 gap-2">
              {LOCATIONS.map((l) => <OptionCard key={l.key} selected={d.trainingLocation === l.key} title={l.label}
                onClick={() => { set("trainingLocation", l.key); set("equipment", (l.key === "gym" || l.key === "both" ? GYM_DEFAULT_EQUIPMENT : l.key === "home" ? HOME_DEFAULT_EQUIPMENT : ["bodyweight", "pullup_bar"]) as never); }} />)}
            </div>
            <h3 className="t-h3 pt-4">What equipment do you have?</h3>
            <p className="t-small -mt-2 text-fg-2">Your plan will never include equipment you don't have.</p>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT.map((e) => {
                const on = d.equipment.includes(e.key);
                return <Chip key={e.key} selected={on} onClick={() => set("equipment", on ? d.equipment.filter((x) => x !== e.key) : [...d.equipment, e.key])}>{on && <Check className="size-4" />}{e.label}</Chip>;
              })}
            </div>
          </Q>
        )}
        {step === 7 && (
          <Q title="Anything we should work around?" sub="Optional, but it makes your plan better.">
            <Field label="Injuries or limitations" hint="e.g. “Sore left shoulder when pressing overhead”.">{(p) => <Textarea {...p} value={d.injuries ?? ""} maxLength={500} onChange={(e) => set("injuries", e.target.value)} />}</Field>
            <Notice tone="warning" icon={<HeartPulse className="size-5" />} title="Not medical advice">For pain, recent injuries or medical conditions, please get guidance from a doctor or physiotherapist before training. Forma doesn't diagnose conditions.</Notice>
            <ExercisePicker label="Exercises I can't do" exercises={exercises} value={d.cannotDo} onChange={(v) => set("cannotDo", v)} />
            <ExercisePicker label="Exercises I dislike" exercises={exercises} value={d.dislikes} onChange={(v) => set("dislikes", v)} />
            <ExercisePicker label="Exercises I want to prioritize" exercises={exercises} value={d.prioritize} onChange={(v) => set("prioritize", v)} />
          </Q>
        )}
        {step === 8 && (
          <Q title="How active are you outside the gym?" sub="Used to estimate your daily energy needs.">
            <div role="radiogroup" className="space-y-2">
              {ACTIVITY_LEVELS.map((a) => <OptionCard key={a.key} selected={d.activityLevel === a.key} onClick={() => set("activityLevel", a.key)} title={a.label}
                hint={{ sedentary: "Desk job, little walking", light: "Some walking, on your feet occasionally", moderate: "On your feet often or ~8k+ steps", active: "Physical job or very high step count", very_active: "Hard physical labor or athlete" }[a.key]} />)}
            </div>
          </Q>
        )}
        {step === 9 && (
          <Q title={`Ready, ${d.firstName || "athlete"}?`} sub="Here's what we'll build your plan around. You can change any of this later in Profile.">
            <dl className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
              {[
                ["Goal", GOALS.find((g) => g.key === d.primaryGoal)?.label + (d.secondaryGoal ? ` + ${GOALS.find((g) => g.key === d.secondaryGoal)?.label}` : "")],
                ["Experience", EXPERIENCE.find((x) => x.key === d.experience)?.label],
                ["Schedule", `${d.daysPerWeek}× per week · ${SESSION_LENGTHS.find((s) => s.key === d.sessionLength)?.label}`],
                ["Days", d.availableDays.map((i) => WEEKDAYS[i].slice(0, 3)).join(", ")],
                ["Equipment", d.equipment.map((e) => EQUIPMENT.find((x) => x.key === e)?.label).join(", ") || "Bodyweight only"],
                ["Priorities", d.musclePriorities.map((m) => MUSCLES.find((x) => x.key === m)?.label).join(", ") || "Balanced"],
              ].map(([k, v]) => <div key={k} className="flex justify-between gap-4 px-5 py-3.5"><dt className="text-fg-2">{k}</dt><dd className="text-right font-medium">{v}</dd></div>)}
            </dl>
          </Q>
        )}
      </main>

      <footer className="pb-safe fixed inset-x-0 bottom-0 border-t border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-xl gap-3 px-5 py-4">
          {step > 0 && <Button variant="secondary" size="lg" onClick={back} aria-label="Back" icon={<ArrowLeft className="size-4" />} />}
          {step < STEPS.length - 1 ? <Button size="lg" full onClick={next}>Continue</Button> : <Button size="lg" full onClick={finish} loading={pending}>Finish & see my options</Button>}
        </div>
      </footer>
    </div>
  );
}

function Q({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5">
      <div><h1 className="t-h1">{title}</h1>{sub && <p className="t-body mt-2 text-fg-2">{sub}</p>}</div>
      {children}
    </section>
  );
}

function ExercisePicker({ label, exercises, value, onChange }: { label: string; exercises: Ex[]; value: string[]; onChange: (v: string[]) => void }) {
  const [q, setQ] = useState("");
  const results = useMemo(() => (q.trim().length < 2 ? [] : exercises.filter((e) => e.name.toLowerCase().includes(q.toLowerCase()) && !value.includes(e.id)).slice(0, 6)), [q, exercises, value]);
  const names = new Map(exercises.map((e) => [e.id, e.name]));
  return (
    <div className="space-y-2">
      <p className="text-[0.8125rem] font-medium text-fg-2">{label}</p>
      {value.length > 0 && <div className="flex flex-wrap gap-2">{value.map((id) => <span key={id} className="t-small inline-flex items-center gap-1 rounded-full bg-surface-2 py-1 pl-3 pr-1">{names.get(id)}<button type="button" aria-label={`Remove ${names.get(id)}`} onClick={() => onChange(value.filter((x) => x !== id))} className="rounded-full p-1 hover:bg-surface-3"><X className="size-3.5" /></button></span>)}</div>}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-fg-3" />
        <Input aria-label={`Search: ${label}`} placeholder="Search exercises…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" />
      </div>
      {results.length > 0 && (
        <ul className="overflow-hidden rounded-xl border border-line bg-surface">
          {results.map((r) => <li key={r.id}><button type="button" onClick={() => { onChange([...value, r.id]); setQ(""); }} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-surface-2"><span>{r.name}</span><span className="t-small capitalize text-fg-3">{r.category.replace("_", " ")}</span></button></li>)}
        </ul>
      )}
    </div>
  );
}
