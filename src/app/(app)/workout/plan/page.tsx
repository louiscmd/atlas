import { ClipboardList, FileUp, LayoutGrid, Sparkles } from "lucide-react";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/server/auth";
import { getActivePlan, listPlans } from "@/lib/server/services/plans";
import { PageHeader } from "@/components/app/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PlanEditor } from "./PlanEditor";
import { OtherPlans } from "./OtherPlans";

export const metadata = { title: "My plan" };

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const user = await requireOnboardedUser();
  const [plan, all] = await Promise.all([getActivePlan(user.id), listPlans(user.id)]);
  const welcome = (await searchParams).welcome;
  const others = all.filter((p) => !p.isActive).map((p) => ({ id: p.id, name: p.name, source: p.source, days: p._count.days, updatedAt: p.updatedAt.toISOString() }));

  if (!plan) {
    const options = [
      { href: "/workout/import", icon: FileUp, title: "Import my current program", body: "Type or paste what you already do. We'll turn it into a structured plan you can review." },
      { href: "/workout/generate", icon: Sparkles, title: "Build my weekly plan", body: "We'll design a plan around your goal, schedule, equipment and priorities." },
      { href: "/workout/programs", icon: LayoutGrid, title: "Choose a program", body: "Start one of 20 proven programs — your copy is fully editable." },
    ];
    return (
      <>
        <PageHeader title={welcome ? "You're all set. How do you want to start?" : "My plan"} subtitle="Pick one — you can always switch later." />
        <div className="grid gap-3 md:grid-cols-3">
          {options.map(({ href, icon: Icon, title, body }) => (
            <Link key={href} href={href} className="anim-rise group rounded-[var(--radius-card)] border border-line bg-surface p-6 transition-colors hover:border-accent/60">
              <span className="mb-5 flex size-11 items-center justify-center rounded-xl bg-accent-soft text-accent"><Icon className="size-5" /></span>
              <h2 className="t-h3">{title}</h2>
              <p className="t-small mt-2 text-fg-2">{body}</p>
            </Link>
          ))}
        </div>
        {others.length > 0 && <div className="mt-8"><OtherPlans plans={others} /></div>}
      </>
    );
  }

  return (
    <>
      <PageHeader title="My plan" subtitle="Edit anything — changes apply to your future workouts." action={<ButtonLink href="/workout/generate" variant="secondary" size="sm" icon={<Sparkles className="size-4" />}>New plan</ButtonLink>} />
      <PlanEditor plan={JSON.parse(JSON.stringify(plan))} />
      {plan.originalText && (
        <Card className="mt-6 p-5">
          <details>
            <summary className="flex cursor-pointer items-center gap-2 font-semibold"><ClipboardList className="size-4 text-fg-2" />Your original routine (preserved)</summary>
            <pre className="t-small mt-3 whitespace-pre-wrap rounded-xl bg-surface-2 p-4 font-mono text-fg-2">{plan.originalText}</pre>
          </details>
        </Card>
      )}
      {others.length > 0 && <div className="mt-8"><OtherPlans plans={others} /></div>}
    </>
  );
}
