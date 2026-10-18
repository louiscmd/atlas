"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { MEAL_TYPES } from "@/lib/domain/enums";
import { logOp } from "./actions";

type Item = { id: string; name: string; amountLabel: string | null; servings: number; calories: number; protein: number; carbs: number; fat: number; isEstimate: boolean; source: string };

export function MealSection({ meal, date }: { meal: { key: string; label: string; totals: { calories: number; protein: number }; items: Item[] }; date: string }) {
  const [edit, setEdit] = useState<Item | null>(null);
  return (
    <Card>
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <h2 className="t-h3">{meal.label}</h2>
        <span className="t-small tabular text-fg-2">{meal.items.length ? `${Math.round(meal.totals.calories)} kcal · ${Math.round(meal.totals.protein)} g protein` : ""}</span>
      </div>
      {meal.items.length > 0 && (
        <ul className="divide-y divide-line">
          {meal.items.map((i) => (
            <li key={i.id}>
              <button onClick={() => setEdit(i)} className="anim-fade flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-surface-2">
                <span className="min-w-0 flex-1"><span className="block truncate font-medium">{i.name}</span><span className="t-small block truncate text-fg-3">{i.amountLabel}</span></span>
                <span className="t-small tabular text-right"><span className="block font-semibold">{i.isEstimate ? "≈ " : ""}{Math.round(i.calories)} kcal</span><span className="text-fg-3">P {Math.round(i.protein)} · C {Math.round(i.carbs)} · F {Math.round(i.fat)}</span></span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="px-3 pb-3 pt-1"><Link href={`/nutrition/add?date=${date}&meal=${meal.key}`} className="t-small flex h-10 items-center justify-center gap-1.5 rounded-xl font-semibold text-fg-2 hover:bg-surface-2 hover:text-fg"><Plus className="size-4" />Add to {meal.label.toLowerCase()}</Link></div>
      {edit && <EditEntry item={edit} onClose={() => setEdit(null)} mealKey={meal.key} />}
    </Card>
  );
}

function EditEntry({ item, onClose, mealKey }: { item: Item; onClose: () => void; mealKey: string }) {
  const [servings, setServings] = useState(String(Math.round(item.servings * 100) / 100));
  const [meal, setMeal] = useState(mealKey);
  const [pending, start] = useTransition();
  const toast = useToast();
  const scalable = item.source === "food" || item.source === "meal";
  const save = () => start(async () => {
    const s = Number(servings);
    if (scalable && s !== item.servings) { const r = await logOp({ type: "servings", id: item.id, servings: s }); if (!r.ok) return toast(r.error, "error"); }
    if (meal !== mealKey) { const r = await logOp({ type: "move", id: item.id, mealType: meal }); if (!r.ok) return toast(r.error, "error"); }
    toast("Entry updated"); onClose();
  });
  return (
    <Sheet open onClose={onClose} title={item.name} description={item.isEstimate ? "This entry is an estimate." : item.amountLabel ?? undefined} size="sm"
      footer={<div className="flex gap-3"><Button variant="danger" loading={pending} icon={<Trash2 className="size-4" />} onClick={() => start(async () => { const r = await logOp({ type: "delete", id: item.id }); toast(r.ok ? "Entry deleted" : r.error, r.ok ? "success" : "error"); onClose(); })}>Delete</Button><Button full loading={pending} onClick={save}>Save</Button></div>}>
      <div className="space-y-4">
        {scalable && <label className="block space-y-1.5"><span className="t-small text-fg-2">Servings</span><Input inputMode="decimal" value={servings} onChange={(e) => setServings(e.target.value)} /></label>}
        <label className="block space-y-1.5"><span className="t-small text-fg-2">Meal</span><Select value={meal} onChange={(e) => setMeal(e.target.value)}>{MEAL_TYPES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}</Select></label>
        <p className="t-small tabular text-fg-2">{Math.round(item.calories)} kcal · {Math.round(item.protein)} g protein · {Math.round(item.carbs)} g carbs · {Math.round(item.fat)} g fat</p>
      </div>
    </Sheet>
  );
}
