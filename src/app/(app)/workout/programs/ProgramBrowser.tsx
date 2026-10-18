"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Clock } from "lucide-react";
import { PROGRAM_CATEGORIES, WEEKDAYS_SHORT } from "@/lib/domain/enums";
import { Badge } from "@/components/ui/Card";
import { Chip, Toggle } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/States";
import { cn } from "@/lib/cn";

type P = { slug: string; name: string; category: string; goal: string; difficulty: string; daysPerWeek: number; sessionMinutes: number; equipment: string[]; featured: boolean; description: string; days: number[] };

export function ProgramBrowser({ programs, myEquipment }: { programs: P[]; myEquipment: string[] }) {
  const [cat, setCat] = useState<string | null>(null);
  const [days, setDays] = useState<number | null>(null);
  const [fits, setFits] = useState(false);
  const have = new Set([...myEquipment, "bodyweight"]);
  const list = useMemo(() => programs.filter((p) => (!cat || p.category === cat) && (!days || p.daysPerWeek === days) && (!fits || p.equipment.every((e) => have.has(e)))), [programs, cat, days, fits]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-4">
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
        <Chip role="radio" selected={!cat} onClick={() => setCat(null)}>All</Chip>
        {PROGRAM_CATEGORIES.map((c) => <Chip key={c.key} role="radio" selected={cat === c.key} onClick={() => setCat(cat === c.key ? null : c.key)} className="shrink-0">{c.label}</Chip>)}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="t-small text-fg-3">Days/week:</span>
        {[3, 4, 5, 6].map((n) => <Chip key={n} role="radio" selected={days === n} onClick={() => setDays(days === n ? null : n)}>{n}</Chip>)}
        <div className="ml-auto"><Toggle checked={fits} onChange={setFits} label="Fits my equipment" /></div>
      </div>
      {list.length === 0 ? <EmptyState title="No programs match these filters" body="Try another category or day count." /> : (
        <ul className="grid gap-3 md:grid-cols-2">
          {list.map((p) => (
            <li key={p.slug}>
              <Link href={`/workout/programs/${p.slug}`} className="flex h-full flex-col rounded-[var(--radius-card)] border border-line bg-surface p-5 transition-colors hover:border-line-strong">
                <div className="mb-2 flex flex-wrap gap-2"><Badge className="capitalize">{p.difficulty}</Badge>{p.featured && <Badge tone="accent">Featured</Badge>}{!p.equipment.every((e) => have.has(e)) && <Badge tone="warning">Needs equipment</Badge>}</div>
                <h2 className="t-h3">{p.name}</h2>
                <p className="t-small mt-1 text-fg-2">{p.goal}</p>
                <p className="t-small mt-3 line-clamp-2 flex-1 text-fg-3">{p.description}</p>
                <div className="t-small mt-4 flex items-center gap-4 text-fg-2"><span className="flex items-center gap-1.5"><CalendarDays className="size-4" />{p.daysPerWeek} days</span><span className="flex items-center gap-1.5"><Clock className="size-4" />~{p.sessionMinutes} min</span></div>
                <div className="mt-3 grid grid-cols-7 gap-1" aria-hidden>{WEEKDAYS_SHORT.map((w, i) => <span key={w} className={cn("h-1.5 rounded-full", p.days.includes(i) ? "bg-accent" : "bg-surface-3")} />)}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
