"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { startProgram } from "../../actions";

export function StartProgramButton({ slug, name }: { slug: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <>
      <Button size="lg" full onClick={() => setOpen(true)}>Start Program</Button>
      <ConfirmDialog open={open} onClose={() => setOpen(false)} loading={pending} title={`Start ${name}?`} confirmLabel="Start program"
        body="A personal copy becomes your active plan. Your current plan is kept under “Other plans”."
        onConfirm={() => start(async () => {
          const r = await startProgram(slug);
          if (!r.ok) { setOpen(false); return toast(r.error, "error"); }
          toast(`${name} started`);
          router.push("/workout/plan");
        })} />
    </>
  );
}
