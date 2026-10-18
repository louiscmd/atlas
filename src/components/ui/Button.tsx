import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg" | "xl";

const base = "inline-flex items-center justify-center gap-2 font-semibold rounded-[var(--radius-btn)] transition-[background,color,transform,opacity] duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none whitespace-nowrap";
const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-contrast hover:bg-accent-hover",
  secondary: "bg-surface-2 text-fg hover:bg-surface-3 border border-line",
  outline: "border border-line-strong text-fg hover:bg-surface-2",
  ghost: "text-fg-2 hover:text-fg hover:bg-surface-2",
  danger: "bg-danger-soft text-danger hover:bg-danger hover:text-white",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-[0.8125rem]",
  md: "h-11 px-4 text-[0.9375rem]",
  lg: "h-12 px-5 text-base",
  xl: "h-14 px-6 text-[1.0625rem]", // workout mode: large touch targets
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", full = false, className?: string) {
  return cn(base, variants[variant], sizes[size], full && "w-full", className);
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; full?: boolean; loading?: boolean; icon?: ReactNode };

export const Button = forwardRef<HTMLButtonElement, Props>(function Button({ variant = "primary", size = "md", full, loading, icon, className, children, disabled, ...rest }, ref) {
  return (
    <button ref={ref} className={buttonClass(variant, size, full, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

export function ButtonLink({ href, variant = "primary", size = "md", full, className, children, icon, prefetch }: { href: string; variant?: Variant; size?: Size; full?: boolean; className?: string; children: ReactNode; icon?: ReactNode; prefetch?: boolean }) {
  return (
    <Link href={href} prefetch={prefetch} className={buttonClass(variant, size, full, className)}>
      {icon}
      {children}
    </Link>
  );
}

export function IconButton({ label, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button aria-label={label} title={label} className={cn("inline-flex size-10 items-center justify-center rounded-[var(--radius-btn)] text-fg-2 hover:bg-surface-2 hover:text-fg transition-colors disabled:opacity-40", className)} {...rest}>
      {children}
    </button>
  );
}
