"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Dumbbell, Home, LineChart, Salad, User } from "lucide-react";
import { cn } from "@/lib/cn";
import { Logo } from "./Logo";

export const NAV = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/workout", label: "Workout", icon: Dumbbell },
  { href: "/nutrition", label: "Nutrition", icon: Salad },
  { href: "/progress", label: "Progress", icon: LineChart },
  { href: "/profile", label: "Profile", icon: User },
] as const;

const isActive = (path: string, href: string) => path === href || path.startsWith(href + "/");

export function Sidebar({ unread }: { unread: number }) {
  const path = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-bg px-3 py-5 md:flex">
      <Link href="/home" className="mb-8 px-3"><Logo /></Link>
      <nav aria-label="Primary" className="flex flex-1 flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(path, href);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined}
              className={cn("flex h-11 items-center gap-3 rounded-xl px-3 font-medium transition-colors", active ? "bg-surface-2 text-fg" : "text-fg-2 hover:bg-surface hover:text-fg")}>
              <Icon className={cn("size-5", active && "text-accent")} aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
      <Link href="/notifications" className="flex h-11 items-center gap-3 rounded-xl px-3 font-medium text-fg-2 hover:bg-surface hover:text-fg">
        <span className="relative"><Bell className="size-5" aria-hidden />{unread > 0 && <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-accent ring-2 ring-bg" />}</span>
        Notifications {unread > 0 && <span className="ml-auto text-xs text-fg-3">{unread}</span>}
      </Link>
    </aside>
  );
}

export function BottomNav() {
  const path = usePathname();
  if (path.startsWith("/workout/session/")) return null; // focused workout mode
  return (
    <nav aria-label="Primary" className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 backdrop-blur md:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(path, href);
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined} className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium", active ? "text-fg" : "text-fg-3")}>
                <Icon className={cn("size-[22px]", active && "text-accent")} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function MobileTopBar({ unread }: { unread: number }) {
  const path = usePathname();
  if (path.startsWith("/workout/session/")) return null;
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line/60 bg-bg/90 px-4 backdrop-blur md:hidden">
      <Link href="/home" aria-label="Home"><Logo /></Link>
      <Link href="/notifications" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} className="relative rounded-xl p-2 text-fg-2 hover:bg-surface">
        <Bell className="size-5" />
        {unread > 0 && <span className="absolute right-1.5 top-1.5 size-2.5 rounded-full bg-accent ring-2 ring-bg" />}
      </Link>
    </header>
  );
}

/** Section sub-navigation (Workout / Nutrition / Progress). */
export function SubNav({ items }: { items: { href: string; label: string; exact?: boolean }[] }) {
  const path = usePathname();
  if (path.startsWith("/workout/session/")) return null; // focused workout mode
  return (
    <nav aria-label="Section" className="no-scrollbar -mx-4 mb-6 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="flex w-max gap-1 rounded-2xl border border-line bg-surface p-1">
        {items.map((it) => {
          const active = it.exact ? path === it.href : isActive(path, it.href);
          return (
            <li key={it.href}>
              <Link href={it.href} aria-current={active ? "page" : undefined}
                className={cn("flex h-9 items-center rounded-xl px-3.5 text-[0.8125rem] font-semibold transition-colors", active ? "bg-surface-3 text-fg" : "text-fg-2 hover:text-fg")}>
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
