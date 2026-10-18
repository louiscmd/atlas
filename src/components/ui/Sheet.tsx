"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

/**
 * Accessible modal built on <dialog>: focus trap, Esc to close, backdrop click.
 * Renders as a bottom sheet on mobile and a centered modal on larger screens.
 */
export function Sheet({ open, onClose, title, description, children, footer, size = "md" }: { open: boolean; onClose: () => void; title: ReactNode; description?: ReactNode; children: ReactNode; footer?: ReactNode; size?: "sm" | "md" | "lg" }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  const widths = { sm: "sm:max-w-sm", md: "sm:max-w-lg", lg: "sm:max-w-2xl" };
  return (
    <dialog ref={ref} onClose={onClose} onClick={(e) => e.target === ref.current && onClose()} aria-labelledby="sheet-title"
      className={cn("m-0 mt-auto max-h-[92dvh] w-full max-w-none rounded-t-[24px] border border-line bg-surface p-0 text-fg shadow-[var(--shadow-float)] sm:m-auto sm:rounded-[24px]", widths[size], open && "anim-sheet")}>
      {open && (
        <div className="flex max-h-[92dvh] flex-col">
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-surface-3 sm:hidden" aria-hidden />
          <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-4">
            <div>
              <h2 id="sheet-title" className="t-h2">{title}</h2>
              {description && <p className="t-small mt-1 text-fg-2">{description}</p>}
            </div>
            <button onClick={onClose} aria-label="Close" className="-mr-2 rounded-lg p-2 text-fg-2 hover:bg-surface-2 hover:text-fg"><X className="size-5" /></button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
          {footer && <div className="pb-safe border-t border-line px-5 py-4">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, body, confirmLabel = "Confirm", danger, loading }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; body: ReactNode; confirmLabel?: string; danger?: boolean; loading?: boolean }) {
  return (
    <Sheet open={open} onClose={onClose} title={title} size="sm"
      footer={<div className="flex gap-3"><Button variant="secondary" full onClick={onClose}>Cancel</Button><Button variant={danger ? "danger" : "primary"} full onClick={onConfirm} loading={loading}>{confirmLabel}</Button></div>}>
      <div className="t-body text-fg-2">{body}</div>
    </Sheet>
  );
}
