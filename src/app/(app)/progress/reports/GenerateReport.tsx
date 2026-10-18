"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AILoading } from "@/components/ui/AILoading";
import { useToast } from "@/components/ui/Toast";
import { createReport } from "../actions";

export function GenerateReport() {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const go = (which: "current" | "previous") => start(async () => {
    const r = await createReport(which);
    if (!r.ok) return toast(r.error, "error");
    router.push(`/progress/reports/${r.data}`);
  });
  if (pending) return <AILoading steps={["Gathering your week…", "Comparing with previous weeks…", "Writing your coach summary…"]} intervalMs={1500} />;
  return (
    <div className="flex flex-wrap gap-2">
      <Button icon={<Sparkles className="size-4" />} onClick={() => go("current")}>Generate this week's report</Button>
      <Button variant="secondary" onClick={() => go("previous")}>Last week</Button>
    </div>
  );
}
