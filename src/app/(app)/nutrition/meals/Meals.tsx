"use client";
import { useState, useTransition } from "react";
import { Copy, MoreHorizontal, Pencil, Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Input";
import { Sheet, ConfirmDialog } from "@/components/ui/Sheet";
import { EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { MEAL_TYPES } from "@/lib/domain/enums";
import { mealOp, saveMeal, searchFoods } from "../actions";

type MealItem = { foodId: string; servings: number; name: string; servingLabel: string; calories: number; protein: number };
type Meal = { id: string; name: string; totals: { calories: number; protein: number; carbs: number; fat: number }; items: MealItem[] };

export function Meals({ meals, date }: { meals: Meal[]; date: string }) {
  const [editing, setEditing] = useState<Meal | "new" | null>(null);
  const [menu, setMenu] = useState<Meal | null>(null);
  const [logging, setLogging] = useState<Meal | null>(null);
  const [del, setDel] = useState<Meal | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const op = (o: Parameters<typeof mealOp>[0], msg: string) => start(async () => { const r = await mealOp(o); toast(r.ok ? msg : r.error, r.ok ? "success" : "error"); });

  return (
    <div className="space-y-3">
      <Button icon={<Plus className="size-4" />} onClick={() => setEditing("new")}>New meal</Button>
      {meals.length === 0 ? <EmptyState icon={<UtensilsCrossed className="size-6" />} title="No saved meals yet" body="Save your usual breakfast or post-workout meal and log it in one tap." /> : meals.map((m) => (
        <Card key={m.id} className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><h2 className="t-h3 truncate">{m.name}</h2><p className="t-small tabular text-fg-2">{Math.round(m.totals.calories)} kcal · {Math.round(m.totals.protein)} g protein · {Math.round(m.totals.carbs)} g carbs · {Math.round(m.totals.fat)} g fat</p></div>
            <IconButton label={`Options for ${m.name}`} onClick={() => setMenu(m)}><MoreHorizontal className="size-5" /></IconButton>
          </div>
          <ul className="t-small mt-3 space-y-1 text-fg-2">{m.items.map((i) => <li key={i.foodId} className="flex justify-between"><span>{i.servings !== 1 ? `${i.servings} × ` : ""}{i.name}</span><span className="tabular text-fg-3">{Math.round(i.calories)} kcal</span></li>)}</ul>
          <Button variant="secondary" full className="mt-4" onClick={() => setLogging(m)} disabled={pending}>Add entire meal to today</Button>
        </Card>
      ))}
      <Sheet open={!!menu} onClose={() => setMenu(null)} title={menu?.name ?? ""} size="sm">
        <div className="grid gap-2">
          <button className="flex h-12 items-center gap-3 rounded-xl bg-surface-2 px-4 font-medium" onClick={() => { setEditing(menu); setMenu(null); }}><Pencil className="size-4" />Edit meal</button>
          <button className="flex h-12 items-center gap-3 rounded-xl bg-surface-2 px-4 font-medium" onClick={() => { op({ type: "duplicate", mealId: menu!.id }, "Meal duplicated"); setMenu(null); }}><Copy className="size-4" />Duplicate meal</button>
          <button className="flex h-12 items-center gap-3 rounded-xl bg-danger-soft px-4 font-medium text-danger" onClick={() => { setDel(menu); setMenu(null); }}><Trash2 className="size-4" />Delete meal</button>
        </div>
      </Sheet>
      {logging && <LogMeal meal={logging} date={date} onClose={() => setLogging(null)} />}
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} danger title={`Delete ${del?.name}?`} body="Past food logs aren't affected." confirmLabel="Delete" onConfirm={() => { op({ type: "delete", mealId: del!.id }, "Meal deleted"); setDel(null); }} />
      {editing && <MealBuilder meal={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function LogMeal({ meal, date, onClose }: { meal: Meal; date: string; onClose: () => void }) {
  const [type, setType] = useState("breakfast");
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <Sheet open onClose={onClose} title={`Log ${meal.name}`} size="sm" footer={<Button full loading={pending} onClick={() => start(async () => { const r = await mealOp({ type: "log", mealId: meal.id, mealType: type, date }); toast(r.ok ? `${meal.name} added to today` : r.error, r.ok ? "success" : "error"); onClose(); })}>Add {Math.round(meal.totals.calories)} kcal</Button>}>
      <Field label="Meal">{(p) => <Select {...p} value={type} onChange={(e) => setType(e.target.value)}>{MEAL_TYPES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}</Select>}</Field>
    </Sheet>
  );
}

type Found = { id: string; name: string; servingLabel: string | null; servingSize: number; servingUnit: string; nutrition: { calories: number; protein: number } | null };

function MealBuilder({ meal, onClose }: { meal: Meal | null; onClose: () => void }) {
  const [name, setName] = useState(meal?.name ?? "");
  const [items, setItems] = useState<MealItem[]>(meal?.items ?? []);
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Found[]>([]);
  const [pending, start] = useTransition();
  const [, startSearch] = useTransition();
  const toast = useToast();
  const total = items.reduce((s, i) => s + i.calories, 0), protein = items.reduce((s, i) => s + i.protein, 0);
  const setServ = (idx: number, s: number) => setItems((arr) => arr.map((x, j) => (j === idx ? { ...x, calories: (x.calories / x.servings) * s, protein: (x.protein / x.servings) * s, servings: s } : x)));
  return (
    <Sheet open onClose={onClose} title={meal ? "Edit meal" : "New meal"} size="lg"
      footer={<div className="flex items-center gap-3"><p className="t-small tabular flex-1 text-fg-2">Total: <b className="text-fg">{Math.round(total)} kcal</b> · {Math.round(protein)} g protein</p><Button loading={pending} disabled={!name.trim() || !items.length} onClick={() => start(async () => {
        const r = await saveMeal({ name, items: items.map((i) => ({ foodId: i.foodId, servings: i.servings })) }, meal?.id);
        if (!r.ok) return toast(r.error, "error");
        toast("Meal saved"); onClose();
      })}>Save meal</Button></div>}>
      <div className="space-y-4">
        <Field label="Meal name">{(p) => <Input {...p} value={name} placeholder="e.g. My Breakfast" onChange={(e) => setName(e.target.value)} />}</Field>
        {items.length > 0 && (
          <ul className="divide-y divide-line rounded-2xl border border-line">
            {items.map((i, idx) => (
              <li key={i.foodId + idx} className="flex items-center gap-3 px-4 py-2.5">
                <span className="min-w-0 flex-1"><span className="block truncate font-medium">{i.name}</span><span className="t-small text-fg-3">{i.servingLabel}</span></span>
                <Input aria-label={`${i.name} servings`} inputMode="decimal" value={i.servings} onChange={(e) => setServ(idx, Math.max(0.05, Number(e.target.value) || 0.05))} className="h-9 w-16 text-center" />
                <span className="t-small tabular w-16 text-right">{Math.round(i.calories)} kcal</span>
                <IconButton label={`Remove ${i.name}`} className="size-8" onClick={() => setItems((a) => a.filter((_, j) => j !== idx))}><Trash2 className="size-4" /></IconButton>
              </li>
            ))}
          </ul>
        )}
        <Field label="Add foods">{(p) => <Input {...p} value={q} placeholder="Search foods…" onChange={(e) => { setQ(e.target.value); const v = e.target.value; if (v.length >= 2) startSearch(async () => { const r = await searchFoods(v); if (r.ok) setRes(r.data as Found[]); }); else setRes([]); }} />}</Field>
        <ul className="space-y-1.5">
          {res.slice(0, 8).map((f) => (
            <li key={f.id}><button className="flex w-full justify-between rounded-xl bg-surface-2 px-4 py-2.5 text-left hover:bg-surface-3" onClick={() => { setItems((a) => [...a, { foodId: f.id, servings: 1, name: f.name, servingLabel: f.servingLabel ?? `${f.servingSize} ${f.servingUnit}`, calories: f.nutrition?.calories ?? 0, protein: f.nutrition?.protein ?? 0 }]); setQ(""); setRes([]); }}>
              <span>{f.name}<span className="t-small block text-fg-3">{f.servingLabel}</span></span><span className="t-small tabular text-fg-2">{Math.round(f.nutrition?.calories ?? 0)} kcal</span>
            </button></li>
          ))}
        </ul>
      </div>
    </Sheet>
  );
}
