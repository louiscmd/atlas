"use client";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { MEASUREMENT_TYPES } from "@/lib/domain/enums";
import { formatDay } from "@/lib/dates";
import { fromDisplayLength, fromDisplayWeight, lengthUnit, toDisplayLength, toDisplayWeight, weightUnit, type UnitSystem } from "@/lib/units";
import { addMeasurement, deleteMeasurement } from "./actions";

const today = () => new Date().toLocaleDateString("en-CA");

export function LogMeasurement({ type, unit, label, allowTypeSelect }: { type: string; unit: UnitSystem; label: string; allowTypeSelect?: boolean }) {
  const [t, setT] = useState(type);
  const [custom, setCustom] = useState("");
  const [value, setValue] = useState("");
  const [date, setDate] = useState(today());
  const [pending, start] = useTransition();
  const toast = useToast();
  const isWeight = t === "weight";
  const suffix = isWeight ? weightUnit(unit) : lengthUnit(unit);
  return (
    <Card className="p-5">
      <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={(e) => {
        e.preventDefault();
        const v = Number(value.replace(",", "."));
        if (!v) return toast("Enter a value", "error");
        start(async () => {
          const r = await addMeasurement({ type: t, value: isWeight ? fromDisplayWeight(v, unit) : fromDisplayLength(v, unit), date, customName: t === "custom" ? custom : null });
          if (!r.ok) return toast(r.error, "error");
          toast(`${isWeight ? "Weight" : "Measurement"} saved`); setValue("");
        });
      }}>
        {allowTypeSelect && (
          <div className="grid gap-3 sm:col-span-3 sm:grid-cols-2">
            <Field label="Measurement">{(p) => <Select {...p} value={t} onChange={(e) => setT(e.target.value)}>{MEASUREMENT_TYPES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}<option value="custom">Custom…</option></Select>}</Field>
            {t === "custom" && <Field label="Name">{(p) => <Input {...p} value={custom} maxLength={40} placeholder="e.g. Shoulders" onChange={(e) => setCustom(e.target.value)} />}</Field>}
          </div>
        )}
        <Field label={`${label} (${suffix})`}>{(p) => <Input {...p} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} suffix={suffix} />}</Field>
        <Field label="Date">{(p) => <Input {...p} type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />}</Field>
        <Button type="submit" loading={pending} size="lg">Save</Button>
      </form>
    </Card>
  );
}

export function EntryList({ title, entries, unit, kind }: { title: string; entries: { id: string; value: number; date: string; label?: string }[]; unit: UnitSystem; kind: "weight" | "length" }) {
  const [, start] = useTransition();
  const toast = useToast();
  if (!entries.length) return null;
  return (
    <Card className="mt-5">
      <h2 className="t-h3 px-5 pt-4">{title}</h2>
      <ul className="divide-y divide-line">
        {entries.slice(0, 60).map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
            <span className="t-small text-fg-2">{formatDay(e.date, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}{e.label ? ` · ${e.label}` : ""}</span>
            <span className="flex items-center gap-2"><span className="tabular font-semibold">{kind === "weight" ? `${toDisplayWeight(e.value, unit)} ${weightUnit(unit)}` : `${toDisplayLength(e.value, unit)} ${lengthUnit(unit)}`}</span>
              <IconButton label="Delete entry" className="size-8" onClick={() => start(async () => { const r = await deleteMeasurement(e.id); toast(r.ok ? "Entry deleted" : r.error, r.ok ? "success" : "error"); })}><Trash2 className="size-4" /></IconButton></span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
