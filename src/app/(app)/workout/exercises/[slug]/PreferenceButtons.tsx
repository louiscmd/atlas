"use client";
import { useState, useTransition } from "react";
import { Ban, Star, ThumbsDown } from "lucide-react";
import { Chip } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { setExercisePreference } from "../../actions";

type Pref = "cannot_do" | "dislike" | "prioritize" | null;
export function PreferenceButtons({ exerciseId, current }: { exerciseId: string; current: Pref }) {
  const [pref, setPref] = useState<Pref>(current);
  const [, start] = useTransition();
  const toast = useToast();
  const set = (p: Pref) => {
    const next = pref === p ? null : p;
    setPref(next);
    start(async () => { const r = await setExercisePreference(exerciseId, next); if (!r.ok) { toast(r.error, "error"); setPref(pref); } else toast(next ? "Preference saved — future plans will respect it" : "Preference cleared"); });
  };
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <h2 className="t-h3 mb-3">Your preference</h2>
      <div className="flex flex-wrap gap-2">
        <Chip role="radio" selected={pref === "prioritize"} onClick={() => set("prioritize")}><Star className="size-4" />Prioritize</Chip>
        <Chip role="radio" selected={pref === "dislike"} onClick={() => set("dislike")}><ThumbsDown className="size-4" />Dislike</Chip>
        <Chip role="radio" selected={pref === "cannot_do"} onClick={() => set("cannot_do")}><Ban className="size-4" />Can't do</Chip>
      </div>
    </div>
  );
}
