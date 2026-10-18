import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, elevated, ...rest }: HTMLAttributes<HTMLDivElement> & { elevated?: boolean }) {
  return <div className={cn("rounded-[var(--radius-card)] border border-line bg-surface", elevated && "shadow-[var(--shadow-float)]", className)} {...rest} />;
}

export function CardHeader({ title, subtitle, action, className }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-3 px-5 pt-5", className)}>
      <div className="min-w-0">
        <h2 className="t-h3 truncate">{title}</h2>
        {subtitle && <p className="t-small mt-0.5 text-fg-2">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Section({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("space-y-3", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3">
          {title && <h2 className="t-h2">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Badge({ tone = "neutral", children, className }: { tone?: "neutral" | "accent" | "success" | "warning" | "danger"; children: ReactNode; className?: string }) {
  const tones = { neutral: "bg-surface-2 text-fg-2 border-line", accent: "bg-accent-soft text-accent border-transparent", success: "bg-success-soft text-success border-transparent", warning: "bg-warning-soft text-warning border-transparent", danger: "bg-danger-soft text-danger border-transparent" };
  return <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[0.6875rem] font-semibold tracking-wide", tones[tone], className)}>{children}</span>;
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-line", className)} />;
}
