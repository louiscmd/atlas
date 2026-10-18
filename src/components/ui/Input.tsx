"use client";
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

const field = "w-full rounded-[var(--radius-btn)] border border-line bg-surface-2 px-3.5 text-[0.9375rem] text-fg placeholder:text-fg-3 transition-colors hover:border-line-strong focus:border-accent focus:outline-none focus:ring-0 disabled:opacity-60 aria-[invalid=true]:border-danger";

export function Field({ label, hint, error, children, id, className }: { label: ReactNode; hint?: ReactNode; error?: string | null; children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => ReactNode; id?: string; className?: string }) {
  const auto = useId();
  const fid = id ?? auto;
  const desc = error ? `${fid}-err` : hint ? `${fid}-hint` : undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={fid} className="block text-[0.8125rem] font-medium text-fg-2">{label}</label>
      {children({ id: fid, "aria-describedby": desc, "aria-invalid": error ? true : undefined })}
      {error ? <p id={`${fid}-err`} role="alert" className="t-small text-danger">{error}</p> : hint ? <p id={`${fid}-hint`} className="t-small text-fg-3">{hint}</p> : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { suffix?: ReactNode }>(function Input({ className, suffix, ...rest }, ref) {
  if (!suffix) return <input ref={ref} className={cn(field, "h-11", className)} {...rest} />;
  return (
    <div className="relative">
      <input ref={ref} className={cn(field, "h-11 pr-12", className)} {...rest} />
      <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-[0.8125rem] text-fg-3">{suffix}</span>
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cn(field, "min-h-28 py-3 leading-relaxed", className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...rest }, ref) {
  return <select ref={ref} className={cn(field, "h-11 appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9", className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2374747f' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} {...rest}>{children}</select>;
});

/** Large numeric stepper used in workout mode (weight/reps). */
export function Stepper({ label, value, onChange, step = 1, min = 0, max = 9999, decimals = 0, suffix, size = "lg" }: { label: string; value: number | null; onChange: (v: number | null) => void; step?: number; min?: number; max?: number; decimals?: number; suffix?: string; size?: "md" | "lg" }) {
  const id = useId();
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v * 10 ** decimals) / 10 ** decimals));
  const h = size === "lg" ? "h-14" : "h-11";
  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={id} className="t-caption block">{label}</label>
      <div className={cn("flex items-stretch overflow-hidden rounded-[var(--radius-btn)] border border-line bg-surface-2 focus-within:border-accent", h)}>
        <button type="button" aria-label={`Decrease ${label}`} onClick={() => onChange(clamp((value ?? 0) - step))} className="flex w-10 shrink-0 items-center justify-center text-fg-2 hover:bg-surface-3 active:bg-surface-3 sm:w-12"><Minus className="size-5" /></button>
        <div className="relative flex min-w-0 flex-1 items-center">
          <input id={id} inputMode="decimal" type="number" step={step} value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : clamp(Number(e.target.value)))} className={cn("t-stat w-full min-w-0 bg-transparent text-center text-fg focus:outline-none", size === "lg" ? "text-xl sm:text-2xl" : "text-lg")} />
          {suffix && <span className="pointer-events-none absolute right-2 text-xs text-fg-3">{suffix}</span>}
        </div>
        <button type="button" aria-label={`Increase ${label}`} onClick={() => onChange(clamp((value ?? 0) + step))} className="flex w-10 shrink-0 items-center justify-center text-fg-2 hover:bg-surface-3 active:bg-surface-3 sm:w-12"><Plus className="size-5" /></button>
      </div>
    </div>
  );
}

/** Selectable chip (checkbox or radio semantics). */
export function Chip({ selected, onClick, children, role = "checkbox", className, disabled }: { selected: boolean; onClick: () => void; children: ReactNode; role?: "checkbox" | "radio"; className?: string; disabled?: boolean }) {
  return (
    <button type="button" role={role} aria-checked={selected} disabled={disabled} onClick={onClick}
      className={cn("inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-[0.875rem] font-medium transition-colors disabled:opacity-50", selected ? "border-accent bg-accent-soft text-fg" : "border-line bg-surface-2 text-fg-2 hover:border-line-strong hover:text-fg", className)}>
      {children}
    </button>
  );
}

/** Large option card for onboarding-style single/multi choice. */
export function OptionCard({ selected, onClick, title, hint, role = "radio", icon }: { selected: boolean; onClick: () => void; title: ReactNode; hint?: ReactNode; role?: "radio" | "checkbox"; icon?: ReactNode }) {
  return (
    <button type="button" role={role} aria-checked={selected} onClick={onClick}
      className={cn("flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors", selected ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-line-strong")}>
      {icon && <span className="text-fg-2">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        {hint && <span className="t-small block text-fg-2">{hint}</span>}
      </span>
      <span aria-hidden className={cn("flex size-5 shrink-0 items-center justify-center border-2", role === "radio" ? "rounded-full" : "rounded-md", selected ? "border-accent bg-accent" : "border-line-strong")}>
        {selected && <span className={cn("bg-accent-contrast", role === "radio" ? "size-2 rounded-full" : "size-2 rounded-[2px]")} />}
      </span>
    </button>
  );
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <label htmlFor={id} className="font-medium">{label}</label>
        {description && <p className="t-small text-fg-3">{description}</p>}
      </div>
      <button id={id} type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", checked ? "bg-accent" : "bg-surface-3")}>
        <span className={cn("absolute left-0 top-1 size-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-6" : "translate-x-1")} />
      </button>
    </div>
  );
}
