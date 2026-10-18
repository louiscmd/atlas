"use client";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Camera, ImagePlus, Info, Plus, RotateCcw, ScanLine, Trash2, UtensilsCrossed } from "lucide-react";
import type { FoodScanResult, NutritionLabel } from "@/lib/domain/schemas";
import { fromPer100, sumNutrients } from "@/lib/engines/nutrition";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Card } from "@/components/ui/Card";
import { Chip, Field, Input, Select } from "@/components/ui/Input";
import { ErrorState, Notice } from "@/components/ui/States";
import { AILoading } from "@/components/ui/AILoading";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { MEAL_TYPES } from "@/lib/domain/enums";
import { cn } from "@/lib/cn";
import { createFood, logFood, logScan, searchFoods } from "../actions";

type Item = FoodScanResult["items"][number];
type Phase = { s: "idle" } | { s: "loading"; preview: string } | { s: "error"; message: string; preview?: string } | { s: "photo"; scanId: string; result: FoodScanResult; preview: string } | { s: "label"; scanId: string; label: NutritionLabel; preview: string };

/** Downscale on the device: faster uploads, lower AI cost, strips EXIF location. */
async function downscale(file: File, max = 1600): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/jpeg", 0.85));
}

export function Scanner({ aiEnabled, devSample, date, defaultMeal }: { aiEnabled: boolean; devSample: boolean; date: string; defaultMeal: string }) {
  const [mode, setMode] = useState<"photo" | "label">("photo");
  const [phase, setPhase] = useState<Phase>({ s: "idle" });
  const [hint, setHint] = useState("");
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setPhase({ s: "loading", preview });
    try {
      const blob = await downscale(file).catch(() => file);
      const body = new FormData();
      body.set("image", blob, "scan.jpg");
      body.set("kind", mode);
      if (hint) body.set("hint", hint);
      const res = await fetch("/api/food-scan", { method: "POST", body });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return setPhase({ s: "error", message: json.error ?? "We couldn't analyze that image. Try taking another photo with better lighting.", preview });
      setPhase(mode === "label" ? { s: "label", scanId: json.scanId, label: json.label, preview } : { s: "photo", scanId: json.scanId, result: json.result, preview });
    } catch {
      setPhase({ s: "error", message: "We couldn't reach the scanner. Check your connection and try again.", preview });
    }
  }

  const reset = () => { setPhase({ s: "idle" }); if (cameraRef.current) cameraRef.current.value = ""; if (uploadRef.current) uploadRef.current.value = ""; };

  if (phase.s === "loading") return (
    <div className="space-y-4">
      <div className="relative mx-auto aspect-[4/3] max-w-md overflow-hidden rounded-[var(--radius-card)] border border-line bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={phase.preview} alt="Your photo" className="size-full object-cover opacity-80" />
        <div className="scan-line" aria-hidden />
      </div>
      <AILoading steps={mode === "label" ? ["Reading the label…", "Detecting serving size…", "Extracting nutrition values…"] : ["Analyzing your meal…", "Detecting foods…", "Estimating portions…", "Calculating nutrition…"]} intervalMs={1800} />
    </div>
  );
  if (phase.s === "error") return (
    <ErrorState title="Scan didn't work" body={phase.message} actions={<><Button onClick={reset} icon={<RotateCcw className="size-4" />}>Try Again</Button><ButtonLink href={`/nutrition/add?date=${date}`} variant="secondary">Add Manually</ButtonLink></>} />
  );
  if (phase.s === "photo") return <PhotoResult scanId={phase.scanId} result={phase.result} preview={phase.preview} date={date} defaultMeal={defaultMeal} onRetake={reset} />;
  if (phase.s === "label") return <LabelResult label={phase.label} preview={phase.preview} date={date} defaultMeal={defaultMeal} onRetake={reset} />;

  return (
    <div className="space-y-5">
      <div role="radiogroup" aria-label="Scan mode" className="grid grid-cols-2 gap-2 rounded-2xl border border-line bg-surface p-1">
        {([["photo", "Meal photo", UtensilsCrossed], ["label", "Nutrition label", ScanLine]] as const).map(([k, l, I]) => (
          <button key={k} role="radio" aria-checked={mode === k} onClick={() => setMode(k)} className={cn("flex h-11 items-center justify-center gap-2 rounded-xl font-semibold transition-colors", mode === k ? "bg-surface-3 text-fg" : "text-fg-2")}><I className="size-4" />{l}</button>
        ))}
      </div>
      {devSample && <Notice tone="warning" icon={<AlertTriangle className="size-5" />} title="Development sample mode">No AI key is configured. Scans return a fixed, clearly-labelled sample so the review and logging flow can be tested — they are not an analysis of your photo.</Notice>}
      {!aiEnabled && <Notice tone="warning" icon={<AlertTriangle className="size-5" />} title="AI scanner not configured">This server has no AI key set, so photos can't be analyzed yet. You can still <Link className="font-semibold text-fg underline" href={`/nutrition/add?date=${date}`}>add food manually</Link>.</Notice>}
      <Card className="flex flex-col items-center gap-4 border-dashed px-6 py-10 text-center">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-accent-soft text-accent">{mode === "photo" ? <Camera className="size-8" /> : <ScanLine className="size-8" />}</span>
        <div>
          <h2 className="t-h3">{mode === "photo" ? "Photograph your meal" : "Photograph the nutrition label"}</h2>
          <p className="t-small mt-1 max-w-sm text-fg-2">{mode === "photo" ? "Shoot from above in good light with the whole plate in frame. Works for home cooking, restaurant food and packaged meals." : "Fill the frame with the nutrition facts panel and keep it flat and in focus."}</p>
        </div>
        {mode === "photo" && <Input aria-label="Optional note about the meal" placeholder="Optional: e.g. “cooked in olive oil”, “large bowl”" value={hint} maxLength={200} onChange={(e) => setHint(e.target.value)} className="max-w-sm" />}
        <div className="flex w-full max-w-sm flex-col gap-2">
          <Button size="xl" full icon={<Camera className="size-5" />} onClick={() => cameraRef.current?.click()} disabled={!aiEnabled}>Scan Food</Button>
          <Button variant="secondary" full icon={<ImagePlus className="size-4" />} onClick={() => uploadRef.current?.click()} disabled={!aiEnabled}>Upload a photo</Button>
        </div>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => onFile(e.target.files?.[0])} />
        <input ref={uploadRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => onFile(e.target.files?.[0])} />
      </Card>
      <p className="t-small flex gap-2 text-fg-3"><Info className="mt-0.5 size-4 shrink-0" />Photos are analyzed by our AI provider to estimate nutrition and are not stored. Results are approximate.</p>
    </div>
  );
}

const CONF_TONE = { high: "success", medium: "warning", low: "danger" } as const;

function PhotoResult({ scanId, result, preview, date, defaultMeal, onRetake }: { scanId: string; result: FoodScanResult; preview: string; date: string; defaultMeal: string; onRetake: () => void }) {
  const [title, setTitle] = useState(result.title || "My meal");
  const [items, setItems] = useState<Item[]>(result.items);
  const [meal, setMeal] = useState(defaultMeal);
  const [editing, setEditing] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const totals = useMemo(() => sumNutrients(items.map(fromPer100)), [items]);
  const upd = (i: number, patch: Partial<Item>) => setItems((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="flex gap-4 p-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Scanned meal" className="size-20 shrink-0 rounded-2xl object-cover" />
          <div className="min-w-0 flex-1">
            <Input aria-label="Meal name" value={title} onChange={(e) => setTitle(e.target.value)} className="h-10 text-lg font-semibold" />
            <p className="mt-2 flex items-center gap-2"><Badge tone={CONF_TONE[result.confidence]}>Confidence: {result.confidence}</Badge><Badge>AI estimate</Badge></p>
          </div>
        </div>
        <div className="grid grid-cols-4 border-t border-line text-center">
          {([["kcal", totals.calories], ["Protein", totals.protein], ["Carbs", totals.carbs], ["Fat", totals.fat]] as const).map(([k, v]) => (
            <div key={k} className="py-4"><p className="t-stat text-xl">≈{Math.round(v)}{k === "kcal" ? "" : "g"}</p><p className="t-small text-fg-3">{k}</p></div>
          ))}
        </div>
      </Card>
      <Notice tone={result.confidence === "low" ? "warning" : "info"} icon={<Info className="size-5" />} title={result.confidence === "low" ? "Low confidence estimate" : "Estimated nutrition"}>
        This is an estimate based on the image. Adjust the ingredients or portion sizes for a more accurate result.{result.notes ? ` ${result.notes}` : ""}
      </Notice>

      <Card>
        <h2 className="t-h3 px-5 pt-4">Detected components</h2>
        <ul className="divide-y divide-line">
          {items.map((it, i) => {
            const n = fromPer100(it);
            return (
              <li key={i} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <button className="min-w-0 text-left" onClick={() => setEditing(i)}>
                    <span className="block font-semibold">{it.name}</span>
                    <span className="t-small text-fg-3">{it.preparation ? `${it.preparation} · ` : ""}{it.confidence} confidence</span>
                  </button>
                  <span className="t-small tabular shrink-0 text-right"><b>≈{n.calories} kcal</b><span className="block text-fg-3">P {n.protein} · C {n.carbs} · F {n.fat}</span></span>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <input type="range" min={5} max={Math.max(600, it.grams * 2)} step={5} value={it.grams} aria-label={`${it.name} portion in grams`} onChange={(e) => upd(i, { grams: Number(e.target.value) })} className="h-2 flex-1 accent-[var(--accent)]" />
                  <Input aria-label={`${it.name} grams`} inputMode="numeric" value={Math.round(it.grams)} onChange={(e) => upd(i, { grams: Math.max(1, Number(e.target.value) || 1) })} className="h-9 w-20 text-center" suffix="g" />
                  <Button variant="ghost" size="sm" aria-label={`Delete ${it.name}`} onClick={() => setItems((s) => s.filter((_, j) => j !== i))}><Trash2 className="size-4" /></Button>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="p-3"><Button variant="ghost" full size="sm" icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>Add ingredient</Button></div>
      </Card>

      <div className="sticky bottom-20 z-10 space-y-3 rounded-2xl border border-line bg-surface p-3 shadow-[var(--shadow-float)] md:bottom-4">
        <div className="flex gap-2">
          <Select aria-label="Meal" value={meal} onChange={(e) => setMeal(e.target.value)} className="flex-1">{MEAL_TYPES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}</Select>
          <Button variant="secondary" onClick={onRetake} icon={<RotateCcw className="size-4" />}>Retake</Button>
        </div>
        <Button full size="lg" loading={pending} disabled={!items.length} onClick={() => start(async () => {
          const r = await logScan(scanId, { title, items, mealType: meal, date });
          if (!r.ok) return toast(r.error, "error");
          toast(`${title} logged (estimate)`);
          router.push("/nutrition");
        })}>Add meal · ≈{Math.round(totals.calories)} kcal</Button>
      </div>

      {editing != null && items[editing] && <ItemEditor item={items[editing]} onClose={() => setEditing(null)} onSave={(it) => { upd(editing, it); setEditing(null); }} />}
      {adding && <AddIngredient onClose={() => setAdding(false)} onAdd={(it) => { setItems((s) => [...s, it]); setAdding(false); }} />}
    </div>
  );
}

function ItemEditor({ item, onClose, onSave }: { item: Item; onClose: () => void; onSave: (it: Item) => void }) {
  const [f, setF] = useState(item);
  const num = (k: keyof Item) => (v: string) => setF({ ...f, [k]: Math.max(0, Number(v) || 0) });
  return (
    <Sheet open onClose={onClose} title="Edit component" size="sm" footer={<Button full onClick={() => onSave(f)}>Update</Button>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Food" className="col-span-2">{(p) => <Input {...p} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}</Field>
        <Field label="Preparation" className="col-span-2">{(p) => <Input {...p} value={f.preparation ?? ""} placeholder="e.g. grilled, fried, raw" onChange={(e) => setF({ ...f, preparation: e.target.value || null })} />}</Field>
        <Field label="Amount (g)">{(p) => <Input {...p} inputMode="numeric" value={f.grams} onChange={(e) => num("grams")(e.target.value)} />}</Field>
        <Field label="kcal / 100 g">{(p) => <Input {...p} inputMode="decimal" value={f.kcalPer100} onChange={(e) => num("kcalPer100")(e.target.value)} />}</Field>
        <Field label="Protein / 100 g">{(p) => <Input {...p} inputMode="decimal" value={f.proteinPer100} onChange={(e) => num("proteinPer100")(e.target.value)} />}</Field>
        <Field label="Carbs / 100 g">{(p) => <Input {...p} inputMode="decimal" value={f.carbsPer100} onChange={(e) => num("carbsPer100")(e.target.value)} />}</Field>
        <Field label="Fat / 100 g">{(p) => <Input {...p} inputMode="decimal" value={f.fatPer100} onChange={(e) => num("fatPer100")(e.target.value)} />}</Field>
      </div>
      <p className="t-small mt-3 text-fg-3">Totals update instantly as you change amounts.</p>
    </Sheet>
  );
}

type Found = { id: string; name: string; servingLabel: string | null; gramsPerServing: number | null; nutrition: { calories: number; protein: number; carbs: number; fat: number; fiber: number | null } | null };

/** Add an ingredient from the food database (per-100 g derived from its serving weight). */
function AddIngredient({ onClose, onAdd }: { onClose: () => void; onAdd: (it: Item) => void }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Found[]>([]);
  const [, start] = useTransition();
  return (
    <Sheet open onClose={onClose} title="Add ingredient" description="Pick from the food database. Values come from verified data where available.">
      <Input autoFocus aria-label="Search ingredient" placeholder="e.g. olive oil, avocado" value={q} onChange={(e) => { setQ(e.target.value); const v = e.target.value; if (v.length >= 2) start(async () => { const r = await searchFoods(v); if (r.ok) setRes((r.data as Found[]).filter((f) => f.gramsPerServing)); }); }} />
      <ul className="mt-3 space-y-2">
        {res.map((f) => {
          const k = 100 / f.gramsPerServing!;
          return (
            <li key={f.id}><button className="flex w-full justify-between rounded-xl bg-surface-2 px-4 py-3 text-left hover:bg-surface-3" onClick={() => onAdd({ name: f.name, grams: Math.round(f.gramsPerServing!), preparation: null, kcalPer100: Math.round((f.nutrition?.calories ?? 0) * k), proteinPer100: Math.round((f.nutrition?.protein ?? 0) * k * 10) / 10, carbsPer100: Math.round((f.nutrition?.carbs ?? 0) * k * 10) / 10, fatPer100: Math.round((f.nutrition?.fat ?? 0) * k * 10) / 10, fiberPer100: f.nutrition?.fiber == null ? null : Math.round(f.nutrition.fiber * k * 10) / 10, confidence: "high" })}>
              <span>{f.name}</span><span className="t-small text-fg-3">{f.servingLabel}</span>
            </button></li>
          );
        })}
      </ul>
    </Sheet>
  );
}

function LabelResult({ label, preview, date, defaultMeal, onRetake }: { label: NutritionLabel; preview: string; date: string; defaultMeal: string; onRetake: () => void }) {
  const [name, setName] = useState(label.productName ?? "Scanned product");
  const [amount, setAmount] = useState<"1" | "2" | "custom">("1");
  const [custom, setCustom] = useState("1");
  const [unit, setUnit] = useState<"servings" | "grams">("servings");
  const [meal, setMeal] = useState(defaultMeal);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const servings = amount === "custom" ? (unit === "grams" && label.servingGrams ? Number(custom) / label.servingGrams : Number(custom)) : Number(amount);
  const v = (x: number | null) => (x == null ? null : Math.round(x * servings * 10) / 10);
  const rows: [string, number | null, string][] = [["Calories", label.calories, "kcal"], ["Protein", label.protein, "g"], ["Carbs", label.carbs, "g"], ["Fat", label.fat, "g"], ["Fiber", label.fiber, "g"], ["Sugar", label.sugar, "g"], ["Sodium", label.sodiumMg, "mg"], ["Saturated fat", label.satFat, "g"]];
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Scanned label" className="size-20 shrink-0 rounded-2xl object-cover" />
          <div className="min-w-0 flex-1">
            <Input aria-label="Product name" value={name} onChange={(e) => setName(e.target.value)} className="h-10 font-semibold" />
            <p className="t-small mt-2 text-fg-2">Serving size: <b className="text-fg">{label.servingSizeText}</b></p>
            <p className="mt-1.5"><Badge tone={CONF_TONE[label.confidence]}>Read confidence: {label.confidence}</Badge></p>
          </div>
        </div>
      </Card>
      {label.confidence === "low" && <Notice tone="warning" icon={<AlertTriangle className="size-5" />}>Parts of the label were hard to read. Check the values against the package.</Notice>}
      <Card className="p-5">
        <h2 className="t-h3">How much did you eat?</h2>
        <div role="radiogroup" className="mt-3 flex flex-wrap gap-2">
          <Chip role="radio" selected={amount === "1"} onClick={() => setAmount("1")}>1 serving</Chip>
          <Chip role="radio" selected={amount === "2"} onClick={() => setAmount("2")}>2 servings</Chip>
          <Chip role="radio" selected={amount === "custom"} onClick={() => setAmount("custom")}>Custom amount</Chip>
        </div>
        {amount === "custom" && (
          <div className="mt-3 flex gap-2">
            <Input aria-label="Custom amount" inputMode="decimal" value={custom} onChange={(e) => setCustom(e.target.value)} className="w-28" />
            <Select aria-label="Unit" value={unit} onChange={(e) => setUnit(e.target.value as "servings")} className="w-36"><option value="servings">servings</option>{label.servingGrams && <option value="grams">grams</option>}</Select>
          </div>
        )}
        <table className="t-small mt-5 w-full">
          <thead><tr className="text-fg-3"><th className="pb-2 text-left font-medium">Nutrient</th><th className="pb-2 text-right font-medium">Per serving</th><th className="pb-2 text-right font-medium">You ate</th></tr></thead>
          <tbody className="divide-y divide-line">{rows.map(([k, per, u]) => <tr key={k}><td className="py-2">{k}</td><td className="tabular py-2 text-right text-fg-2">{per ?? "—"}{per != null ? ` ${u}` : ""}</td><td className="tabular py-2 text-right font-semibold">{v(per) ?? "—"}{per != null ? ` ${u}` : ""}</td></tr>)}</tbody>
        </table>
      </Card>
      <div className="sticky bottom-20 z-10 space-y-3 rounded-2xl border border-line bg-surface p-3 shadow-[var(--shadow-float)] md:bottom-4">
        <div className="flex gap-2">
          <Select aria-label="Meal" value={meal} onChange={(e) => setMeal(e.target.value)} className="flex-1">{MEAL_TYPES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}</Select>
          <Button variant="secondary" onClick={onRetake} icon={<RotateCcw className="size-4" />}>Retake</Button>
        </div>
        <Button full size="lg" loading={pending} disabled={!(servings > 0)} onClick={() => start(async () => {
          // Save the product as a reusable custom food, then log the amount eaten.
          const f = await createFood({ name, servingSize: label.servingGrams ?? 1, servingUnit: label.servingGrams ? "g" : "piece", servingLabel: label.servingSizeText, calories: label.calories, protein: label.protein, carbs: label.carbs, fat: label.fat, fiber: label.fiber, sugar: label.sugar, sodiumMg: label.sodiumMg, satFat: label.satFat }, "label_scan");
          if (!f.ok) return toast(f.error, "error");
          const r = await logFood({ foodId: f.data.id, servings, mealType: meal, date });
          if (!r.ok) return toast(r.error, "error");
          toast(`${name} logged and saved to My foods`);
          router.push("/nutrition");
        })}>Log {Math.round(label.calories * servings)} kcal</Button>
      </div>
    </div>
  );
}
