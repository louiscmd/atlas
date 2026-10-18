import Link from "next/link";
import { Logo } from "@/components/app/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col px-5">
      <header className="mx-auto w-full max-w-md py-6"><Link href="/"><Logo /></Link></header>
      <main id="main" className="mx-auto w-full max-w-md flex-1 pb-16 pt-4 anim-rise">{children}</main>
    </div>
  );
}
