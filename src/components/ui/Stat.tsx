import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Stat({ label, value, unit, sub, className, size = "md" }: { label: string; value: ReactNode; unit?: string; sub?: ReactNode; className?: string; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "text-xl", md: "text-[1.75rem]", lg: "text-[2.5rem]" };
  return (
    <div className={cn("min-w-0", className)}>
      <p className="t-caption">{label}</p>
      <p className="mt-1.5 flex items-baseline gap-1">
        <span className={cn("t-stat", sizes[size])}>{value}</span>
        {unit && <span className="text-sm font-medium text-fg-2">{unit}</span>}
      </p>
      {sub && <div className="t-small mt-1 text-fg-2">{sub}</div>}
    </div>
  );
}

export function StatCard(props: Parameters<typeof Stat>[0] & { icon?: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
      {props.icon && <div className="mb-3 text-fg-3">{props.icon}</div>}
      <Stat {...props} />
    </div>
  );
}
