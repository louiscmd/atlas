import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";

export function EmptyState({ icon, title, body, actions, className }: { icon?: ReactNode; title: string; body?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-line-strong px-6 py-10 text-center", className)}>
      {icon && <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-surface-2 text-fg-2">{icon}</div>}
      <h3 className="t-h3">{title}</h3>
      {body && <p className="t-small mt-1.5 max-w-sm text-fg-2">{body}</p>}
      {actions && <div className="mt-5 flex flex-wrap justify-center gap-3">{actions}</div>}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", body = "Please try again in a moment.", actions }: { title?: string; body?: ReactNode; actions?: ReactNode }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-[var(--radius-card)] border border-line bg-surface px-6 py-10 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-danger-soft text-danger"><AlertTriangle className="size-6" /></div>
      <h3 className="t-h3">{title}</h3>
      <p className="t-small mt-1.5 max-w-sm text-fg-2">{body}</p>
      {actions && <div className="mt-5 flex flex-wrap justify-center gap-3">{actions}</div>}
    </div>
  );
}

export function Notice({ tone = "info", title, children, icon }: { tone?: "info" | "warning" | "success"; title?: string; children: ReactNode; icon?: ReactNode }) {
  const tones = { info: "bg-surface-2 border-line", warning: "bg-warning-soft border-transparent", success: "bg-success-soft border-transparent" };
  return (
    <div className={cn("flex gap-3 rounded-2xl border p-4", tones[tone])}>
      {icon && <span className={cn("mt-0.5 shrink-0", tone === "warning" ? "text-warning" : tone === "success" ? "text-success" : "text-fg-2")}>{icon}</span>}
      <div className="t-small min-w-0 text-fg-2">
        {title && <p className="mb-0.5 font-semibold text-fg">{title}</p>}
        {children}
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton", className)} />;
}

export function PageSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      {Array.from({ length: cards }).map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-[var(--radius-card)]" />)}
    </div>
  );
}
