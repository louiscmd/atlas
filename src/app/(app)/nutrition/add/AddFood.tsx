"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Heart, Plus, Search, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Card";
import { Chip, Field, Input, Select } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { MEAL_TYPES } from "@/lib/domain/enums";
import { cn } from "@/lib/cn";
import { createFood, logFood, quickAdd, searchFoods, toggleFavorite } from "../actions";

export type FoodRow = { id: string; name: string; brand: string | null; servingSize: number; servingUnit: string; servingLabel: string | null; gramsPerServing: number | null; source: string; verified: boolean; userId: string | null; nutrition: { calories: number; protein: number; carbs: number; fat: number; fiber: number | null } | null };

export function AddFood({ date, defaultMeal, recent, favorites, mine, favoriteIds }: { date: string; defaultMeal: string; recent: FoodRow[]; favorites: FoodRow[]; mine: FoodRow[]; favoriteIds: string[] }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<FoodRow[] | null>(null);
  const [tab, setTab] = useState<"recent" | "favorites" | "mine">(recent.length ? "recent" : "favorites");
  const [picked, setPicked] = useState<FoodRow | null>(null);
  const [quick, setQuick] = useState(false);
  const [custom, setCustom] = useState(false);
  const [favs, setFavs] = useState(new Set(favoriteIds));
  const [searching, startSearch] = useTransition();
  const toast = useToast();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(timer.current);
    if (q.trim().length < 2) { setResults(null); return; }
    timer.current = setTimeout(() => startSearch(async () => { const r = await searchFoods(q); if (r.ok) setResults(r.data as FoodRow[]); }), 200);
  }, [q]);

  const list = results ?? (tab === "recent" ? recent : tab === "favorites" ? favorites : mine);
  const fav = async (f: FoodRow) => { const r = await toggleFavorite(f.id); if (r.ok) { setFavs((s) => { const n = new Set(s); if (r.data) n.add(f.id); else n.delete(f.id); return n; }); toast(r.data ? "Added to favorites" : "Removed from favorites"); } };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-fg-3" />
        <Input type="search" autoFocus aria-label="Search foods" placeholder="Search foods — e.g. chicken, oats, banana" value={q} onChange={(e) => setQ(e.target.value)} className="h-12 pl-10" />
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" icon={<Zap className="size-4" />} onClick={() => setQuick(true)}>Quick add</Button>
        <Button variant="secondary" size="sm" icon={<Plus className="size-4" />} onClick={() => setCustom(true)}>Create food</Button>
      </div>
      {!results && (
        <div role="tablist" className="flex gap-2">
          {([["recent", "Recent"], ["favorites", "Favorites"], ["mine", "My foods"]] as const).map(([k, l]) => <Chip key={k} role="radio" selected={tab === k} onClick={() => setTab(k)}>{l}</Chip>)}
        </div>
      )}
      {searching && !results ? <div className="space-y-2"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div> : list.length === 0 ? (
        <p className="t-small rounded-2xl border border-dashed border-line-strong p-6 text-center text-fg-2">
          {results ? <>No foods match “{q}”. <button className="font-semibold text-accent" onClick={() => setCustom(true)}>Create it</button> or use quick add.</> : tab === "recent" ? "Foods you log will show up here." : tab === "favorites" ? "Tap the heart on any food to save it here." : "Foods you create appear here."}
        </p>
      ) : (
        <ul className="space-y-2" aria-live="polite">
          {list.map((f) => (
            <li key={f.id} className="flex items-center gap-2 rounded-2xl border border-line bg-surface pr-2">
              <button className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left" onClick={() => setPicked(f)}>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 font-medium"><span className="truncate">{f.name}</span>{f.verified && <BadgeCheck className="size-4 shrink-0 text-success" aria-label="Verified database entry" />}</span>
                  <span className="t-small block truncate text-fg-3">{f.servingLabel ?? `${f.servingSize} ${f.servingUnit}`}{f.brand ? ` · ${f.brand}` : ""}{f.userId ? " · My food" : ""}</span>
                </span>
                <span className="t-small tabular text-right"><span className="block font-semibold">{Math.round(f.nutrition?.calories ?? 0)} kcal</span><span className="text-fg-3">{Math.round(f.nutrition?.protein ?? 0)} g protein</span></span>
              </button>
              <button aria-label={favs.has(f.id) ? `Remove ${f.name} from favorites` : `Add ${f.name} to favorites`} aria-pressed={favs.has(f.id)} onClick={() => fav(f)} className="rounded-lg p-2 text-fg-3 hover:text-accent"><Heart className={cn("size-4", favs.has(f.id) && "fill-accent text-accent")} /></button>
            </li>
          ))}
        </ul>
      )}
      {picked && <LogSheet food={picked} date={date} defaultMeal={defaultMeal} onClose={() => setPicked(null)} />}
      <QuickAddSheet open={quick} onClose={() => setQuick(false)} date={date} defaultMeal={defaultMeal} />
      <CustomFoodSheet open={custom} onClose={() => setCustom(false)} initialName={q} onCreated={(f) => { setCustom(false); setPicked(f); }} />
    </div>
  );
}

function MealSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <Select aria-label="Meal" value={value} onChange={(e) => onChange(e.target.value)}>{MEAL_TYPES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}</Select>;
}

function LogSheet({ food, date, defaultMeal, onClose }: { food: FoodRow; date: string; defaultMeal: string; onClose: () => void }) {
  const byWeight = !!food.gramsPerServing && food.servingUnit !== "g";
  const [mode, setMode] = useState<"servings" | "grams">("servings");
  const [amount, setAmount] = useState("1");
  const [meal, setMeal] = useState(defaultMeal);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const servings = mode === "grams" && food.gramsPerServing ? Number(amount) / food.gramsPerServing : Number(amount);
  const n = food.nutrition;
  const calc = useMemo(() => (k: "calories" | "protein" | "carbs" | "fat") => Math.round((n?.[k] ?? 0) * (servings || 0) * 10) / 10, [n, servings]);
  return (
    <Sheet open onClose={onClose} title={food.name} description={`${food.servingLabel ?? `${food.servingSize} ${food.servingUnit}`} per serving${food.verified ? " · database values" : ""}`} size="sm"
      footer={<Button full size="lg" loading={pending} disabled={!servings || servings <= 0} onClick={() => start(async () => {
        const r = await logFood({ foodId: food.id, servings, mealType: meal, date });
        if (!r.ok) return toast(r.error, "error");
        toast(`${food.name} logged`);
        router.push(`/nutrition?date=${date}`);
      })}>Add to {MEAL_TYPES.find((m) => m.key === meal)?.label.toLowerCase()}</Button>}>
      <div className="space-y-4">
        {(byWeight || food.servingUnit === "g") && food.gramsPerServing && (
          <div role="radiogroup" className="flex gap-2"><Chip role="radio" selected={mode === "servings"} onClick={() => { setMode("servings"); setAmount("1"); }}>Servings</Chip><Chip role="radio" selected={mode === "grams"} onClick={() => { setMode("grams"); setAmount(String(food.gramsPerServing)); }}>Grams</Chip></div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label={mode === "grams" ? "Amount (g)" : "Servings"}>{(p) => <Input {...p} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(",", "."))} />}</Field>
          <Field label="Meal">{() => <MealSelect value={meal} onChange={setMeal} />}</Field>
        </div>
        {mode === "servings" && <div className="flex gap-2">{[0.5, 1, 1.5, 2].map((s) => <Chip key={s} role="radio" selected={Number(amount) === s} onClick={() => setAmount(String(s))}>{s}×</Chip>)}</div>}
        <div className="grid grid-cols-4 gap-2 rounded-2xl bg-surface-2 p-4 text-center">
          {([["kcal", calc("calories")], ["Protein", calc("protein")], ["Carbs", calc("carbs")], ["Fat", calc("fat")]] as const).map(([k, v]) => <div key={k}><p className="t-stat text-lg">{Math.round(v)}</p><p className="t-small text-fg-3">{k}</p></div>)}
        </div>
      </div>
    </Sheet>
  );
}

function QuickAddSheet({ open, onClose, date, defaultMeal }: { open: boolean; onClose: () => void; date: string; defaultMeal: string }) {
  const [f, setF] = useState({ name: "", calories: "", protein: "", carbs: "", fat: "" });
  const [meal, setMeal] = useState(defaultMeal);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <Sheet open={open} onClose={onClose} title="Quick add" description="Log calories and macros directly. Marked as an estimate." size="sm"
      footer={<Button full loading={pending} disabled={!f.calories} onClick={() => start(async () => {
        const r = await quickAdd({ name: f.name || "Quick add", mealType: meal, date, calories: Number(f.calories) || 0, protein: Number(f.protein) || 0, carbs: Number(f.carbs) || 0, fat: Number(f.fat) || 0 });
        if (!r.ok) return toast(r.error, "error");
        toast("Logged"); onClose(); router.push(`/nutrition?date=${date}`);
      })}>Log it</Button>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name" className="col-span-2">{(p) => <Input {...p} value={f.name} placeholder="e.g. Restaurant pasta" onChange={(e) => setF({ ...f, name: e.target.value })} />}</Field>
        {(["calories", "protein", "carbs", "fat"] as const).map((k) => <Field key={k} label={k === "calories" ? "Calories (kcal)" : `${k[0].toUpperCase() + k.slice(1)} (g)`}>{(p) => <Input {...p} inputMode="decimal" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />}</Field>)}
        <Field label="Meal" className="col-span-2">{() => <MealSelect value={meal} onChange={setMeal} />}</Field>
      </div>
    </Sheet>
  );
}

export function CustomFoodSheet({ open, onClose, initialName = "", onCreated, initial, source = "custom" }: { open: boolean; onClose: () => void; initialName?: string; onCreated: (f: FoodRow) => void; initial?: Partial<Record<string, string>>; source?: "custom" | "label_scan" }) {
  const blank = { name: initialName, brand: "", servingSize: "100", servingUnit: "g", servingLabel: "", calories: "", protein: "", carbs: "", fat: "", fiber: "", sugar: "", sodiumMg: "", satFat: "" };
  const [f, setF] = useState<Record<string, string>>({ ...blank, ...initial });
  useEffect(() => { if (open) setF({ ...blank, ...initial }); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const [pending, start] = useTransition();
  const toast = useToast();
  const num = (k: string) => (f[k] === "" ? null : Number(f[k]));
  return (
    <Sheet open={open} onClose={onClose} title="Create a food" description="Enter values per serving, as on the label."
      footer={<Button full loading={pending} disabled={!f.name || f.calories === ""} onClick={() => start(async () => {
        const r = await createFood({ name: f.name, brand: f.brand || null, servingSize: Number(f.servingSize) || 1, servingUnit: f.servingUnit as "g", servingLabel: f.servingLabel || null, calories: Number(f.calories) || 0, protein: Number(f.protein) || 0, carbs: Number(f.carbs) || 0, fat: Number(f.fat) || 0, fiber: num("fiber"), sugar: num("sugar"), sodiumMg: num("sodiumMg"), satFat: num("satFat") }, source);
        if (!r.ok) return toast(r.error, "error");
        toast("Food saved"); onCreated(r.data as FoodRow);
      })}>Save food</Button>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name" className="col-span-2">{(p) => <Input {...p} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}</Field>
        <Field label="Brand (optional)" className="col-span-2">{(p) => <Input {...p} value={f.brand} onChange={(e) => setF({ ...f, brand: e.target.value })} />}</Field>
        <Field label="Serving size">{(p) => <Input {...p} inputMode="decimal" value={f.servingSize} onChange={(e) => setF({ ...f, servingSize: e.target.value })} />}</Field>
        <Field label="Unit">{(p) => <Select {...p} value={f.servingUnit} onChange={(e) => setF({ ...f, servingUnit: e.target.value })}><option value="g">grams</option><option value="ml">ml</option><option value="piece">piece</option></Select>}</Field>
        {([["calories", "Calories (kcal)"], ["protein", "Protein (g)"], ["carbs", "Carbs (g)"], ["fat", "Fat (g)"], ["fiber", "Fiber (g)"], ["sugar", "Sugar (g)"], ["sodiumMg", "Sodium (mg)"], ["satFat", "Sat. fat (g)"]] as const).map(([k, l]) => (
          <Field key={k} label={l}>{(p) => <Input {...p} inputMode="decimal" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />}</Field>
        ))}
      </div>
      {source === "label_scan" && <p className="t-small mt-4"><Badge tone="accent">From label scan</Badge> <span className="text-fg-3">Check values against the package.</span></p>}
    </Sheet>
  );
}
