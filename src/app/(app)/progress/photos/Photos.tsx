"use client";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Lock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip, Input, Select } from "@/components/ui/Input";
import { ConfirmDialog, Sheet } from "@/components/ui/Sheet";
import { EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { formatDay } from "@/lib/dates";
import { fmtWeight, type UnitSystem } from "@/lib/units";
import { deletePhoto } from "../actions";
import { downscaleImage } from "@/lib/image";

type P = { id: string; pose: string; date: string; bodyWeightKg: number | null; note: string | null };

export function Photos({ photos, unit }: { photos: P[]; unit: UnitSystem }) {
  const [pose, setPose] = useState<"front" | "side" | "back">("front");
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [view, setView] = useState<P | null>(null);
  const [del, setDel] = useState<P | null>(null);
  const [cmpPose, setCmpPose] = useState("front");
  const [, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const router = useRouter();
  const byPose = useMemo(() => photos.filter((p) => p.pose === cmpPose).sort((a, b) => a.date.localeCompare(b.date)), [photos, cmpPose]);
  const [a, setA] = useState(0), [b, setB] = useState(-1);
  const first = byPose[a] ?? byPose[0], last = byPose.at(b) ?? byPose.at(-1);

  async function upload(file?: File) {
    if (!file) return;
    setUploading(true);
    const body = new FormData();
    const blob = await downscaleImage(file, 2000, 0.88).catch(() => file);
    body.set("image", blob, "photo.jpg"); body.set("pose", pose); body.set("note", note);
    try {
      const r = await fetch("/api/photos", { method: "POST", body });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) toast(j.error ?? "Upload failed", "error"); else { toast("Photo saved privately"); setNote(""); router.refresh(); }
    } catch { toast("Upload failed — check your connection.", "error"); }
    setUploading(false);
    if (input.current) input.current.value = "";
  }

  return (
    <div className="space-y-5">
      <Card className="space-y-4 p-5">
        <div role="radiogroup" aria-label="Pose" className="flex gap-2">{(["front", "side", "back"] as const).map((p) => <Chip key={p} role="radio" selected={pose === p} onClick={() => setPose(p)}>{p[0].toUpperCase() + p.slice(1)}</Chip>)}</div>
        <Input aria-label="Optional note" placeholder="Optional note (e.g. morning, fasted)" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />
        <Button size="lg" full loading={uploading} icon={<Camera className="size-5" />} onClick={() => input.current?.click()}>Add {pose} photo</Button>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" capture="user" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => upload(e.target.files?.[0])} />
        <p className="t-small flex items-center gap-2 text-fg-3"><Lock className="size-3.5" />Only you can see these. Your current body weight is saved with each photo.</p>
      </Card>

      {photos.length === 0 ? <EmptyState title="No photos yet" body="Take front, side and back photos every 2–4 weeks in similar lighting to compare over time." /> : (
        <>
          {byPose.length >= 2 && first && last && (
            <Card className="p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="t-h3">Compare</h2>
                <Select aria-label="Pose to compare" value={cmpPose} onChange={(e) => { setCmpPose(e.target.value); setA(0); setB(-1); }} className="h-9 w-32">{["front", "side", "back"].map((p) => <option key={p} value={p}>{p}</option>)}</Select></div>
              <div className="grid grid-cols-2 gap-3">
                {[{ p: first, set: setA, idx: a }, { p: last, set: setB, idx: b < 0 ? byPose.length + b : b }].map(({ p, set, idx }, i) => (
                  <figure key={i}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/photos/${p.id}`} alt={`${p.pose} photo ${p.date}`} className="aspect-[3/4] w-full rounded-2xl bg-surface-2 object-cover" />
                    <Select aria-label={i === 0 ? "Earlier photo" : "Later photo"} value={idx} onChange={(e) => set(Number(e.target.value))} className="mt-2 h-9 text-[0.8125rem]">{byPose.map((x, j) => <option key={x.id} value={j}>{formatDay(x.date, { month: "short", day: "numeric", year: "numeric" })}</option>)}</Select>
                    {p.bodyWeightKg && <figcaption className="t-small mt-1 text-fg-3">{fmtWeight(p.bodyWeightKg, unit)}</figcaption>}
                  </figure>
                ))}
              </div>
            </Card>
          )}
          <ul className="grid grid-cols-3 gap-2 md:grid-cols-4">
            {photos.map((p) => (
              <li key={p.id}><button onClick={() => setView(p)} className="block w-full overflow-hidden rounded-2xl bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/photos/${p.id}`} alt={`${p.pose} photo from ${p.date}`} loading="lazy" className="aspect-[3/4] w-full object-cover" />
                <span className="t-small block px-2 py-1.5 text-left text-fg-2">{formatDay(p.date, { month: "short", day: "numeric" })} · {p.pose}</span>
              </button></li>
            ))}
          </ul>
        </>
      )}
      <Sheet open={!!view} onClose={() => setView(null)} title={view ? `${view.pose[0].toUpperCase() + view.pose.slice(1)} · ${formatDay(view.date, { month: "long", day: "numeric", year: "numeric" })}` : ""} description={view?.bodyWeightKg ? `Body weight: ${fmtWeight(view.bodyWeightKg, unit)}${view.note ? ` · ${view.note}` : ""}` : view?.note ?? undefined}
        footer={<Button variant="danger" full icon={<Trash2 className="size-4" />} onClick={() => { setDel(view); setView(null); }}>Delete photo</Button>}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {view && <img src={`/api/photos/${view.id}`} alt="" className="w-full rounded-2xl" />}
      </Sheet>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} danger title="Delete this photo?" body="It's permanently removed from storage. This can't be undone." confirmLabel="Delete" onConfirm={() => start(async () => { const r = await deletePhoto(del!.id); toast(r.ok ? "Photo deleted" : r.error, r.ok ? "success" : "error"); setDel(null); router.refresh(); })} />
    </div>
  );
}
