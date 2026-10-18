"use client";
import { useEffect, useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/States";
import { Badge } from "@/components/ui/Card";
import { EQUIPMENT, labelOf } from "@/lib/domain/enums";
import { getAlternatives, searchLibrary } from "@/app/(app)/workout/actions";

type LibItem = { id: string; name: string; category: string; equipment: string[]; primaryMuscles: string[] };
type Alt = LibItem & { reasons: string[] };

let libraryCache: LibItem[] | null = null;

/** Search the library; when `replaceFor` is set, shows ranked alternatives first. */
export function ExercisePicker({ open, onClose, onPick, title, replaceFor, footer }: { open: boolean; onClose: () => void; onPick: (id: string, name: string) => void; title: string; replaceFor?: { exerciseId: string; name: string } | null; footer?: React.ReactNode }) {
  const [q, setQ] = useState("");
  const [lib, setLib] = useState<LibItem[] | null>(libraryCache);
  const [alts, setAlts] = useState<Alt[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setQ("");
    if (!libraryCache) searchLibrary().then((r) => { if (r.ok) { libraryCache = r.data; setLib(r.data); } else setError(r.error); });
    if (replaceFor) { setAlts(null); getAlternatives(replaceFor.exerciseId).then((r) => setAlts(r.ok ? r.data : [])); }
  }, [open, replaceFor]);

  const results = useMemo(() => {
    if (!lib) return [];
    const s = q.trim().toLowerCase();
    if (!s) return replaceFor ? [] : lib.slice(0, 40);
    return lib.filter((e) => e.name.toLowerCase().includes(s) || e.primaryMuscles.some((m) => m.includes(s)) || e.category.includes(s)).slice(0, 40);
  }, [lib, q, replaceFor]);

  return (
    <Sheet open={open} onClose={onClose} title={title} description={replaceFor ? `Alternatives to ${replaceFor.name} that match your equipment and preferences.` : undefined} footer={footer}>
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-fg-3" />
        <Input autoFocus placeholder="Search exercises or muscles…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" aria-label="Search exercises" />
      </div>
      {error && <p role="alert" className="t-small text-danger">{error}</p>}
      {replaceFor && !q && (
        <div className="mb-4">
          <p className="t-caption mb-2 flex items-center gap-1.5"><Sparkles className="size-3.5 text-accent" />Recommended</p>
          {!alts ? <div className="space-y-2"><Skeleton className="h-14" /><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
            : alts.length === 0 ? <p className="t-small text-fg-2">No direct alternatives fit your equipment — search the full library below.</p>
            : <ul className="space-y-2">{alts.map((a) => <Row key={a.id} item={a} reasons={a.reasons} onPick={() => onPick(a.id, a.name)} />)}</ul>}
        </div>
      )}
      {(q || !replaceFor) && (
        !lib ? <div className="space-y-2"><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
          : results.length ? <ul className="space-y-2">{results.map((e) => <Row key={e.id} item={e} onPick={() => onPick(e.id, e.name)} />)}</ul>
          : <p className="t-small py-6 text-center text-fg-2">No exercises match “{q}”.</p>
      )}
    </Sheet>
  );
}

function Row({ item, reasons, onPick }: { item: LibItem; reasons?: string[]; onPick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onPick} className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3 text-left hover:border-line-strong">
        <span className="min-w-0">
          <span className="block font-semibold">{item.name}</span>
          <span className="t-small block truncate text-fg-3">{item.equipment.length ? item.equipment.map((q) => labelOf(EQUIPMENT, q)).join(", ") : "Bodyweight"}</span>
        </span>
        {reasons?.[0] && <Badge tone="accent">{reasons.includes("Similar movement") ? "Similar movement" : reasons[0]}</Badge>}
      </button>
    </li>
  );
}
