"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search, SlidersHorizontal } from "lucide-react";
import { CATEGORIES, EQUIPMENT, MUSCLES, labelOf } from "@/lib/domain/enums";
import { Chip, Input, Select, Toggle } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";

type Ex = { id: string; slug: string; name: string; category: string; primaryMuscles: string[]; equipment: string[]; difficulty: string; movementType: string; isCustom: boolean };

export function Vault({ exercises, myEquipment }: { exercises: Ex[]; myEquipment: string[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [muscle, setMuscle] = useState("");
  const [equip, setEquip] = useState("");
  const [diff, setDiff] = useState("");
  const [type, setType] = useState("");
  const [mine, setMine] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const have = useMemo(() => new Set([...myEquipment, "bodyweight"]), [myEquipment]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return exercises.filter((e) =>
      (!s || e.name.toLowerCase().includes(s) || e.primaryMuscles.some((m) => m.includes(s))) &&
      (!cat || e.category === cat) && (!muscle || e.primaryMuscles.includes(muscle)) && (!equip || (equip === "bodyweight" ? e.equipment.length === 0 : e.equipment.includes(equip))) &&
      (!diff || e.difficulty === diff) && (!type || e.movementType === type) && (!mine || e.equipment.every((x) => have.has(x))));
  }, [exercises, q, cat, muscle, equip, diff, type, mine, have]);
  const activeFilters = [muscle, equip, diff, type].filter(Boolean).length + (mine ? 1 : 0);
  const reset = () => { setQ(""); setCat(null); setMuscle(""); setEquip(""); setDiff(""); setType(""); setMine(false); };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-fg-3" />
          <Input type="search" aria-label="Search exercises" placeholder="Search by name or muscle…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" />
        </div>
        <Button variant="secondary" onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters} icon={<SlidersHorizontal className="size-4" />}>Filters{activeFilters ? ` (${activeFilters})` : ""}</Button>
      </div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
        <Chip role="radio" selected={!cat} onClick={() => setCat(null)}>All</Chip>
        {exercises.some((e) => e.isCustom) && <Chip role="radio" selected={cat === "custom"} onClick={() => setCat(cat === "custom" ? null : "custom")} className="shrink-0">My exercises</Chip>}
        {CATEGORIES.map((c) => <Chip key={c.key} role="radio" selected={cat === c.key} onClick={() => setCat(cat === c.key ? null : c.key)} className="shrink-0">{c.label}</Chip>)}
      </div>
      {showFilters && (
        <div className="anim-rise grid gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select aria-label="Muscle" value={muscle} onChange={(e) => setMuscle(e.target.value)}><option value="">Any muscle</option>{MUSCLES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}</Select>
          <Select aria-label="Equipment" value={equip} onChange={(e) => setEquip(e.target.value)}><option value="">Any equipment</option>{EQUIPMENT.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}</Select>
          <Select aria-label="Difficulty" value={diff} onChange={(e) => setDiff(e.target.value)}><option value="">Any difficulty</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></Select>
          <Select aria-label="Movement type" value={type} onChange={(e) => setType(e.target.value)}><option value="">Any movement</option><option value="compound">Compound</option><option value="isolation">Isolation</option><option value="cardio">Cardio</option><option value="mobility">Mobility</option></Select>
          <div className="sm:col-span-2 lg:col-span-4"><Toggle checked={mine} onChange={setMine} label="Only exercises I can do with my equipment" /></div>
        </div>
      )}
      <p className="t-small text-fg-3" aria-live="polite">{list.length} exercise{list.length === 1 ? "" : "s"}</p>
      {list.length === 0 ? <EmptyState title="No exercises match" body="Try a different search or clear your filters." actions={<Button variant="secondary" onClick={reset}>Clear filters</Button>} /> : (
        <ul className="grid gap-2 md:grid-cols-2">
          {list.slice(0, 200).map((e) => (
            <li key={e.id}>
              <Link href={`/workout/exercises/${e.slug}`} className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5 transition-colors hover:bg-surface-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{e.name}</p>
                  <p className="t-small truncate text-fg-2">{e.isCustom ? "Added from your imported routine" : `${e.primaryMuscles.map((m) => labelOf(MUSCLES, m)).join(", ")} · ${e.equipment.length ? e.equipment.map((x) => labelOf(EQUIPMENT, x)).join(", ") : "Bodyweight"}`}</p>
                </div>
                {e.isCustom ? <Badge tone="accent">Custom</Badge> : !e.equipment.every((x) => have.has(x)) && <Badge>Needs equipment</Badge>}
                <ChevronRight className="size-4 text-fg-3" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
