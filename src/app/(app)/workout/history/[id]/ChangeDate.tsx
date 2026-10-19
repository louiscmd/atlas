"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { addDays, formatDay } from "@/lib/dates";
import { changeWorkoutDate } from "../../actions";

export function ChangeDate({ sessionId, current, today }: { sessionId: string; current: string; today: string }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(current);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const yesterday = addDays(today, -1);
  return (
    <>
      <Button variant="secondary" size="sm" icon={<CalendarClock className="size-4" />} onClick={() => { setDate(current); setOpen(true); }}>Change date</Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Change workout date" description="Logged late? Move this workout to the day you actually trained. Sets, PRs and your weekly challenge update with it." size="sm"
        footer={<Button full loading={pending} disabled={!date || date === current || date > today} onClick={() => start(async () => {
          const r = await changeWorkoutDate(sessionId, date);
          if (!r.ok) return toast(r.error, "error");
          toast(`Moved to ${formatDay(date, { weekday: "long", month: "short", day: "numeric" })}`);
          setOpen(false);
          router.refresh();
        })}>Move workout</Button>}>
        <div className="mb-4 flex gap-2">
          {current !== yesterday && <Button variant="outline" size="sm" onClick={() => setDate(yesterday)}>Yesterday</Button>}
          {current !== today && <Button variant="outline" size="sm" onClick={() => setDate(today)}>Today</Button>}
        </div>
        <Field label="Date">{(p) => <Input {...p} type="date" value={date} max={today} min={addDays(today, -365)} onChange={(e) => setDate(e.target.value)} />}</Field>
      </Sheet>
    </>
  );
}
