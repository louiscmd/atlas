"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { startWorkout } from "./actions";

export function StartWorkoutButton({ dayId, label = "Start Workout", variant = "primary", className }: { dayId: string | null; label?: string; variant?: "primary" | "secondary"; className?: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  return (
    <Button size={variant === "primary" ? "xl" : "md"} full={variant === "primary"} variant={variant} className={className} loading={pending} icon={<Play className="size-5" />}
      onClick={() => start(async () => {
        const r = await startWorkout(dayId);
        if (!r.ok) return toast(r.error, "error");
        router.push(`/workout/session/${r.data}`);
      })}>
      {label}
    </Button>
  );
}
