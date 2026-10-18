import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function PageHeader({ title, subtitle, action, back }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <header className="mb-6">
      {back && (
        <Link href={back.href} className="t-small -ml-1 mb-3 inline-flex items-center gap-1 rounded-lg px-1 py-1 text-fg-2 hover:text-fg">
          <ChevronLeft className="size-4" aria-hidden />{back.label}
        </Link>
      )}
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="t-h1">{title}</h1>
          {subtitle && <p className="t-body mt-1 text-fg-2">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}
