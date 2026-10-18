import { requireOnboardedUser } from "@/lib/server/auth";
import { listPrograms } from "@/lib/server/services/plans";
import { getUserContext } from "@/lib/server/services/profile";
import { PageHeader } from "@/components/app/PageHeader";
import { ProgramBrowser } from "./ProgramBrowser";
export const metadata = { title: "Programs" };
export default async function Page() {
  const user = await requireOnboardedUser();
  const [programs, ctx] = await Promise.all([listPrograms(), getUserContext(user.id)]);
  return (
    <>
      <PageHeader title="Programs" subtitle="Proven templates with real programming. Starting one creates your own editable copy." />
      <ProgramBrowser myEquipment={ctx.equipment} programs={programs.map((p) => ({ slug: p.slug, name: p.name, category: p.category, goal: p.goal, difficulty: p.difficulty, daysPerWeek: p.daysPerWeek, sessionMinutes: p.sessionMinutes, equipment: p.equipment as string[], featured: p.featured, description: p.description, days: p.days.map((d) => d.weekday) }))} />
    </>
  );
}
