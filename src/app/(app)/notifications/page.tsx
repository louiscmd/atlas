import Link from "next/link";
import { Bell } from "lucide-react";
import { requireOnboardedUser } from "@/lib/server/auth";
import { listNotifications, markAllRead } from "@/lib/server/services/notifications";
import { getUserContext } from "@/lib/server/services/profile";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/ui/States";
import { cn } from "@/lib/cn";
export const metadata = { title: "Notifications" };

export default async function Page() {
  const user = await requireOnboardedUser();
  const [items, ctx] = await Promise.all([listNotifications(user.id), getUserContext(user.id)]);
  await markAllRead(user.id);
  return (
    <>
      <PageHeader title="Notifications" subtitle={<Link href="/profile" className="hover:text-fg">Manage notification settings</Link>} />
      {items.length === 0 ? <EmptyState icon={<Bell className="size-6" />} title="You're all caught up" body="PRs, plan updates, protein nudges and weekly reports will show up here." /> : (
        <ul className="space-y-2">
          {items.map((n) => {
            const body = (
              <div className={cn("flex gap-3 rounded-2xl border border-line bg-surface p-4", !n.readAt && "border-accent/40")}>
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-accent")} aria-hidden />
                <div className="min-w-0 flex-1"><p className="font-semibold">{n.title}</p><p className="t-small text-fg-2">{n.body}</p></div>
                <time className="t-small shrink-0 text-fg-3">{n.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: ctx.tz })}</time>
              </div>
            );
            return <li key={n.id}>{n.href ? <Link href={n.href} className="block hover:opacity-90">{body}</Link> : body}</li>;
          })}
        </ul>
      )}
    </>
  );
}
