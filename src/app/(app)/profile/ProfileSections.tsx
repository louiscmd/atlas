"use client";
import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { Bell, ChevronRight, Download, Dumbbell, LogOut, Moon, Salad, Shield, Sparkles, Trash2, User, Wrench, CreditCard, Link2, Ruler, Ban } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Card } from "@/components/ui/Card";
import { Chip, Field, Input, Select, Toggle } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";
import { Notice } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { ACTIVITY_LEVELS, EQUIPMENT, EXPERIENCE, GOALS, LOCATIONS, MUSCLES, NOTIFICATION_CATEGORIES, SESSION_LENGTHS, WEEKDAYS_SHORT } from "@/lib/domain/enums";
import { fromDisplayLength, fromDisplayWeight, toDisplayLength, toDisplayWeight } from "@/lib/units";
import { logOut, resendVerification } from "@/app/(auth)/actions";
import { deleteAccount, restrictionOp, saveEquipment, setNotification, setPreferences, updatePersonal, updateTraining } from "./actions";

type Props = {
  email: string; verified: boolean; googleEnabled: boolean; aiEnabled: boolean;
  personal: { firstName: string; age: number; sex: string; heightCm: number; unitSystem: string; timezone: string; activityLevel: string };
  training: { primaryGoal: string; secondaryGoal: string | null; goalWeightKg: number | null; experience: string; daysPerWeek: number; sessionLength: string; availableDays: number[]; trainingLocation: string; musclePriorities: string[] };
  equipment: string[]; restrictions: { id: string; type: string; note: string | null; exercise: { name: string; slug: string } | null }[];
  notifications: Record<string, boolean>; prefs: { theme: "dark" | "light"; analyticsOptIn: boolean; weightIncrementKg: number };
  target: { calories: number; proteinG: number } | null; providers: string[]; plan: string;
};

function Section({ id, icon, title, children, action }: { id?: string; icon: ReactNode; title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <Card id={id} className="scroll-mt-24 p-5">
      <div className="mb-4 flex items-center justify-between gap-3"><h2 className="t-h3 flex items-center gap-2"><span className="text-fg-3">{icon}</span>{title}</h2>{action}</div>
      {children}
    </Card>
  );
}

export function ProfileSections(props: Props) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const save = (fn: () => Promise<{ ok: boolean; error?: string }>, msg = "Saved") => start(async () => { const r = await fn(); toast(r.ok ? msg : (r as { error: string }).error, r.ok ? "success" : "error"); });
  const imperial = props.personal.unitSystem === "imperial";

  const [pf, setPf] = useState({ ...props.personal, height: String(toDisplayLength(props.personal.heightCm, imperial ? "imperial" : "metric")), age: String(props.personal.age) });
  const [tr, setTr] = useState({ ...props.training, goalWeight: props.training.goalWeightKg ? String(toDisplayWeight(props.training.goalWeightKg, imperial ? "imperial" : "metric")) : "" });
  const [eq, setEq] = useState(props.equipment);
  const [injury, setInjury] = useState(props.restrictions.find((r) => r.type === "injury")?.note ?? "");
  const [notif, setNotif] = useState(props.notifications);
  const [prefs, setPrefsState] = useState(props.prefs);
  const [del, setDel] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [devLink, setDevLink] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {!props.verified && (
        <Notice tone="warning" title="Verify your email">We sent a link to {props.email}. <button className="font-semibold text-fg underline" onClick={() => start(async () => { const r = await resendVerification(); toast(r?.message ?? r?.error ?? "Sent"); if (r?.devLink) setDevLink(r.devLink); })}>Resend link</button>{devLink && <> · <a className="break-all text-accent underline" href={devLink}>Open dev link</a></>}</Notice>
      )}

      <Section icon={<User className="size-4" />} title="Personal data">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="First name">{(p) => <Input {...p} value={pf.firstName} onChange={(e) => setPf({ ...pf, firstName: e.target.value })} />}</Field>
          <Field label="Age">{(p) => <Input {...p} inputMode="numeric" value={pf.age} onChange={(e) => setPf({ ...pf, age: e.target.value })} />}</Field>
          <Field label="Sex">{(p) => <Select {...p} value={pf.sex} onChange={(e) => setPf({ ...pf, sex: e.target.value })}><option value="male">Male</option><option value="female">Female</option><option value="other">Prefer not to say</option></Select>}</Field>
          <Field label={`Height (${imperial ? "in" : "cm"})`}>{(p) => <Input {...p} inputMode="decimal" value={pf.height} onChange={(e) => setPf({ ...pf, height: e.target.value })} />}</Field>
          <Field label="Units">{(p) => <Select {...p} value={pf.unitSystem} onChange={(e) => setPf({ ...pf, unitSystem: e.target.value })}><option value="metric">Metric (kg, cm)</option><option value="imperial">Imperial (lb, in)</option></Select>}</Field>
          <Field label="Time zone">{(p) => <Input {...p} value={pf.timezone} onChange={(e) => setPf({ ...pf, timezone: e.target.value })} />}</Field>
          <Field label="Daily activity" className="sm:col-span-2">{(p) => <Select {...p} value={pf.activityLevel} onChange={(e) => setPf({ ...pf, activityLevel: e.target.value })}>{ACTIVITY_LEVELS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}</Select>}</Field>
        </div>
        <Button className="mt-4" loading={pending} onClick={() => save(() => updatePersonal({ firstName: pf.firstName, age: Number(pf.age), sex: pf.sex, heightCm: Math.round(fromDisplayLength(Number(pf.height), imperial ? "imperial" : "metric") * 10) / 10, unitSystem: pf.unitSystem, timezone: pf.timezone, activityLevel: pf.activityLevel }))}>Save personal data</Button>
      </Section>

      <Section id="training" icon={<Dumbbell className="size-4" />} title="Goals & training">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Primary goal">{(p) => <Select {...p} value={tr.primaryGoal} onChange={(e) => setTr({ ...tr, primaryGoal: e.target.value })}>{GOALS.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}</Select>}</Field>
          <Field label="Secondary goal">{(p) => <Select {...p} value={tr.secondaryGoal ?? ""} onChange={(e) => setTr({ ...tr, secondaryGoal: e.target.value || null })}><option value="">None</option>{GOALS.filter((g) => g.key !== tr.primaryGoal).map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}</Select>}</Field>
          <Field label="Experience">{(p) => <Select {...p} value={tr.experience} onChange={(e) => setTr({ ...tr, experience: e.target.value })}>{EXPERIENCE.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}</Select>}</Field>
          <Field label={`Goal weight (${imperial ? "lb" : "kg"}, optional)`}>{(p) => <Input {...p} inputMode="decimal" value={tr.goalWeight} onChange={(e) => setTr({ ...tr, goalWeight: e.target.value })} />}</Field>
          <Field label="Sessions per week">{(p) => <Select {...p} value={tr.daysPerWeek} onChange={(e) => setTr({ ...tr, daysPerWeek: Number(e.target.value) })}>{[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}</option>)}</Select>}</Field>
          <Field label="Session length">{(p) => <Select {...p} value={tr.sessionLength} onChange={(e) => setTr({ ...tr, sessionLength: e.target.value })}>{SESSION_LENGTHS.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}</Select>}</Field>
          <Field label="Training location" className="sm:col-span-2">{(p) => <Select {...p} value={tr.trainingLocation} onChange={(e) => setTr({ ...tr, trainingLocation: e.target.value })}>{LOCATIONS.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}</Select>}</Field>
        </div>
        <p className="t-small mb-2 mt-4 text-fg-2">Available days</p>
        <div className="flex flex-wrap gap-1.5">{WEEKDAYS_SHORT.map((w, i) => <Chip key={w} selected={tr.availableDays.includes(i)} onClick={() => setTr({ ...tr, availableDays: tr.availableDays.includes(i) ? tr.availableDays.filter((x) => x !== i) : [...tr.availableDays, i] })}>{w}</Chip>)}</div>
        <p className="t-small mb-2 mt-4 text-fg-2">Muscle priorities (in order, up to 4)</p>
        <div className="flex flex-wrap gap-1.5">{MUSCLES.map((m) => { const idx = tr.musclePriorities.indexOf(m.key); return <Chip key={m.key} selected={idx >= 0} disabled={idx < 0 && tr.musclePriorities.length >= 4} onClick={() => setTr({ ...tr, musclePriorities: idx >= 0 ? tr.musclePriorities.filter((x) => x !== m.key) : [...tr.musclePriorities, m.key] })}>{idx >= 0 && <b className="tabular">{idx + 1}</b>}{m.label}</Chip>; })}</div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button loading={pending} onClick={() => save(() => updateTraining({ ...tr, goalWeightKg: tr.goalWeight ? fromDisplayWeight(Number(tr.goalWeight), imperial ? "imperial" : "metric") : null }))}>Save training settings</Button>
          <ButtonLink href="/workout/generate" variant="ghost" icon={<Sparkles className="size-4" />}>Rebuild my plan</ButtonLink>
        </div>
      </Section>

      <Section icon={<Wrench className="size-4" />} title="Equipment">
        <div className="flex flex-wrap gap-1.5">{EQUIPMENT.map((e) => <Chip key={e.key} selected={eq.includes(e.key)} onClick={() => setEq(eq.includes(e.key) ? eq.filter((x) => x !== e.key) : [...eq, e.key])}>{e.label}</Chip>)}</div>
        <Button className="mt-4" loading={pending} onClick={() => save(() => saveEquipment(eq), "Equipment updated — new plans and replacements will use it")}>Save equipment</Button>
      </Section>

      <Section icon={<Ban className="size-4" />} title="Exercise preferences & limitations">
        <Field label="Injuries or limitations">{(p) => <Input {...p} value={injury} maxLength={500} placeholder="e.g. Avoid deep knee flexion" onChange={(e) => setInjury(e.target.value)} />}</Field>
        <Button size="sm" variant="secondary" className="mt-2" onClick={() => save(() => restrictionOp({ type: "injury", note: injury }))}>Save note</Button>
        <ul className="mt-4 space-y-1.5">
          {props.restrictions.filter((r) => r.exercise).map((r) => (
            <li key={r.id} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2">
              <span className="t-small"><Link href={`/workout/exercises/${r.exercise!.slug}`} className="font-medium hover:text-accent">{r.exercise!.name}</Link> <Badge>{{ cannot_do: "Can't do", dislike: "Dislike", prioritize: "Prioritize" }[r.type] ?? r.type}</Badge></span>
              <button className="t-small text-fg-3 hover:text-danger" onClick={() => save(() => restrictionOp({ type: "remove", id: r.id }), "Removed")}>Remove</button>
            </li>
          ))}
        </ul>
        <p className="t-small mt-3 text-fg-3">Set preferences from any exercise's page in the <Link href="/workout/exercises" className="underline">Exercise Vault</Link>.</p>
      </Section>

      <Section icon={<Salad className="size-4" />} title="Nutrition settings" action={<ButtonLink href="/nutrition/targets" size="sm" variant="secondary">Edit targets</ButtonLink>}>
        <p className="t-small text-fg-2">{props.target ? `${props.target.calories} kcal · ${props.target.proteinG} g protein per day (estimated).` : "No targets set."}</p>
      </Section>

      <Section icon={<Bell className="size-4" />} title="Notifications">
        <div className="divide-y divide-line">{NOTIFICATION_CATEGORIES.map((c) => <Toggle key={c.key} label={c.label} description={`“${c.example}”`} checked={notif[c.key] !== false} onChange={(v) => { setNotif({ ...notif, [c.key]: v }); save(() => setNotification(c.key, v), v ? "Enabled" : "Disabled"); }} />)}</div>
        <p className="t-small mt-2 text-fg-3">Notifications appear in your in-app inbox. Push and email delivery can be enabled per deployment.</p>
      </Section>

      <Section icon={<Moon className="size-4" />} title="Appearance & workouts">
        <p className="t-small mb-2 text-fg-2">Theme</p>
        <div role="radiogroup" aria-label="Theme" className="grid max-w-sm grid-cols-2 gap-2">
          {([["light", "White", "#ffffff", "#2563eb"], ["dark", "Black", "#07090d", "#4f8ff7"]] as const).map(([t, label, bg, accent]) => (
            <button key={t} type="button" role="radio" aria-checked={prefs.theme === t}
              onClick={() => { setPrefsState({ ...prefs, theme: t }); document.documentElement.dataset.theme = t; save(() => setPreferences({ theme: t }), `${label} theme on`); }}
              className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${prefs.theme === t ? "border-accent bg-accent-soft" : "border-line bg-surface-2 hover:border-line-strong"}`}>
              <span aria-hidden className="flex size-9 items-center justify-center rounded-xl border border-line-strong" style={{ background: bg }}><span className="size-3.5 rounded-full" style={{ background: accent }} /></span>
              <span className="font-semibold">{label}</span>
            </button>
          ))}
        </div>
        <Field label="Smallest weight increment (kg)" className="mt-4 max-w-xs">{(p) => <Select {...p} value={prefs.weightIncrementKg} onChange={(e) => { const v = Number(e.target.value); setPrefsState({ ...prefs, weightIncrementKg: v }); save(() => setPreferences({ weightIncrementKg: v })); }}>{[1, 1.25, 2, 2.5, 5].map((n) => <option key={n} value={n}>{n} kg</option>)}</Select>}</Field>
      </Section>

      <Section icon={<Link2 className="size-4" />} title="Connected accounts">
        <ul className="t-small space-y-2">
          <li className="flex justify-between"><span>Google</span><span className="text-fg-2">{props.providers.includes("google") ? "Connected" : props.googleEnabled ? "Not connected" : "Unavailable on this deployment"}</span></li>
          <li className="flex justify-between"><span>Apple</span><span className="text-fg-2">Unavailable on this deployment</span></li>
        </ul>
      </Section>

      <Section icon={<CreditCard className="size-4" />} title="Subscription">
        <p className="t-small text-fg-2">You're on the <b className="text-fg capitalize">{props.plan}</b> plan. Billing isn't enabled on this deployment yet.</p>
      </Section>

      <Section id="privacy" icon={<Shield className="size-4" />} title="Privacy & data">
        <Toggle label="Share anonymous usage analytics" description="Event counts only (e.g. “workout completed”). Never your health data." checked={prefs.analyticsOptIn} onChange={(v) => { setPrefsState({ ...prefs, analyticsOptIn: v }); save(() => setPreferences({ analyticsOptIn: v })); }} />
        <div className="t-small mt-2 rounded-xl bg-surface-2 p-4 text-fg-2">
          <p className="mb-1 font-semibold text-fg">How AI uses your data</p>
          {props.aiEnabled ? "When you scan food, import a routine, generate a plan or ask the assistant, the relevant data (e.g. the photo, your goals and logged metrics) is sent to our AI provider to produce a result. Photos aren't stored, and we only keep metadata about AI requests (never the prompt content)." : "AI features are not enabled on this deployment, so no data is sent to an AI provider."}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="/api/export" className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-btn)] border border-line bg-surface-2 px-4 font-semibold hover:bg-surface-3"><Download className="size-4" />Export my data</a>
          <ButtonLink href="/progress/photos" variant="ghost" icon={<Ruler className="size-4" />}>Manage photos</ButtonLink>
          <Link href="/privacy" className="t-small inline-flex items-center gap-1 px-2 text-fg-2 hover:text-fg">Privacy policy <ChevronRight className="size-3.5" /></Link>
        </div>
      </Section>

      <div className="flex flex-wrap gap-2 pt-2">
        <form action={logOut}><Button type="submit" variant="secondary" icon={<LogOut className="size-4" />}>Log out</Button></form>
        <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={() => setDel(true)}>Delete account</Button>
      </div>

      <Sheet open={del} onClose={() => setDel(false)} title="Delete your account?" size="sm"
        footer={<Button variant="danger" full loading={pending} disabled={confirm.trim().toUpperCase() !== "DELETE"} onClick={() => start(async () => { const r = await deleteAccount(confirm); if (r && !r.ok) toast(r.error, "error"); })}>Permanently delete</Button>}>
        <p className="t-body text-fg-2">This permanently deletes your profile, plans, workout history, nutrition logs, measurements and progress photos. It can't be undone. Consider exporting your data first.</p>
        <Field label='Type "DELETE" to confirm' className="mt-4">{(p) => <Input {...p} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />}</Field>
      </Sheet>
    </div>
  );
}
