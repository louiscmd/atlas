"use client";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "success" | "error" | "info";
type ToastItem = { id: number; message: string; tone: Tone; action?: { label: string; onClick: () => void } };
const Ctx = createContext<(message: string, tone?: Tone, action?: ToastItem["action"]) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((message: string, tone: Tone = "success", action?: ToastItem["action"]) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s.slice(-2), { id, message, tone, action }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), tone === "error" ? 6000 : 3500);
  }, []);
  const Icon = { success: CheckCircle2, error: AlertCircle, info: Info };
  return (
    <Ctx.Provider value={push}>
      {children}
      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6">
        {items.map((t) => {
          const I = Icon[t.tone];
          return (
            <div key={t.id} className="anim-sheet pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border border-line bg-surface-2 px-4 py-3 shadow-[var(--shadow-float)]">
              <I className={cn("size-5 shrink-0", t.tone === "success" ? "text-success" : t.tone === "error" ? "text-danger" : "text-fg-2")} aria-hidden />
              <p className="t-small flex-1 text-fg">{t.message}</p>
              {t.action && <button className="t-small font-semibold text-accent" onClick={t.action.onClick}>{t.action.label}</button>}
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}
export const useToast = () => useContext(Ctx);
