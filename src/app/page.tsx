import { redirect } from "next/navigation";
import { CalendarCheck, Camera, Dumbbell, LineChart, Sparkles, Timer } from "lucide-react";
import { getCurrentUser } from "@/lib/server/auth";
import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/app/Logo";

export default async function Landing({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const user = await getCurrentUser();
  const deleted = (await searchParams).deleted === "1";
  if (user) redirect(user.profile?.onboardingCompletedAt ? "/home" : "/onboarding");
  const features = [
    { icon: Sparkles, title: "A plan built for you", body: "Import your current routine or start fresh. We build a weekly plan around your goals, schedule and equipment." },
    { icon: Timer, title: "Guided workouts", body: "Log sets in seconds, rest timers start automatically, and your last performance is always on screen." },
    { icon: LineChart, title: "Progress that adapts", body: "Small, smart load increases when you've earned them. PRs, strength trends and weekly reviews." },
    { icon: Camera, title: "Snap your meal", body: "Photograph a plate or a nutrition label for an editable estimate of calories and macros." },
    { icon: CalendarCheck, title: "Know what to do today", body: "Open the app and see today's workout, what's left to eat, and the next useful step." },
    { icon: Dumbbell, title: "20 real programs", body: "Beginner to advanced, gym or home — each with real sets, reps, rest and progression." },
  ];
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <div className="flex gap-2"><ButtonLink href="/login" variant="ghost">Log in</ButtonLink><ButtonLink href="/signup">Get started</ButtonLink></div>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-5">
        {deleted && <p role="status" className="t-small mt-4 rounded-xl bg-success-soft px-4 py-3 text-success">Your account and all associated data have been permanently deleted.</p>}
        <section className="py-16 md:py-24">
          <p className="t-caption mb-4 text-accent">Training · Nutrition · Progress</p>
          <h1 className="t-display max-w-3xl">Know exactly what to do today.</h1>
          <p className="t-body mt-5 max-w-xl text-lg text-fg-2">Forma turns your goals into a weekly plan, guides every set, tracks what you eat, and adapts as you get stronger.</p>
          <div className="mt-8 flex flex-wrap gap-3"><ButtonLink href="/signup" size="lg">Create your plan</ButtonLink><ButtonLink href="/login" size="lg" variant="secondary">I have an account</ButtonLink></div>
        </section>
        <section className="grid gap-4 pb-20 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
              <Icon className="mb-4 size-6 text-accent" aria-hidden />
              <h2 className="t-h3">{title}</h2>
              <p className="t-small mt-2 text-fg-2">{body}</p>
            </div>
          ))}
        </section>
        <footer className="t-small flex flex-wrap gap-4 border-t border-line py-8 text-fg-3">
          <span>Forma is not a medical device. Consult a professional for medical advice.</span>
          <a href="/privacy" className="hover:text-fg">Privacy</a>
        </footer>
      </main>
    </div>
  );
}
