import { requireOnboardedUser } from "@/lib/server/auth";
import { unreadCount } from "@/lib/server/services/notifications";
import { BottomNav, MobileTopBar, Sidebar } from "@/components/app/Nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireOnboardedUser();
  const unread = await unreadCount(user.id);
  return (
    <div className="flex min-h-dvh">
      <Sidebar unread={unread} />
      <div className="min-w-0 flex-1">
        <MobileTopBar unread={unread} />
        <main id="main" className="mx-auto w-full max-w-5xl px-4 pb-28 pt-5 md:px-8 md:pb-12 md:pt-10">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
