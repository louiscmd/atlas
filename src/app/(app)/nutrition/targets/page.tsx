import { requireOnboardedUser } from "@/lib/server/auth";
import { getTarget } from "@/lib/server/services/nutrition";
import { getUserContext } from "@/lib/server/services/profile";
import { estimateTargets } from "@/lib/engines/nutrition";
import { db } from "@/lib/server/db";
import { PageHeader } from "@/components/app/PageHeader";
import { Targets } from "./Targets";
export const metadata = { title: "Nutrition targets" };
export default async function Page() {
  const user = await requireOnboardedUser();
  const [t, ctx, w] = await Promise.all([getTarget(user.id), getUserContext(user.id), db.progressMeasurement.findFirst({ where: { userId: user.id, type: "weight" }, orderBy: { measuredAt: "desc" } })]);
  const est = estimateTargets({ sex: ctx.profile?.sex as never, age: ctx.age, heightCm: ctx.profile?.heightCm ?? 175, weightKg: w?.value ?? ctx.profile?.startWeightKg ?? 75, activityLevel: ctx.profile?.activityLevel ?? "moderate", goal: ctx.goals?.primaryGoal ?? "general" });
  return (
    <>
      <PageHeader back={{ href: "/nutrition", label: "Nutrition" }} title="Daily targets" subtitle="Estimated from your profile — adjust them to suit you." />
      <Targets current={t ? { calories: t.calories, proteinG: t.proteinG, carbsG: t.carbsG, fatG: t.fatG, waterMl: t.waterMl, isManual: t.isManual } : null} estimate={est} />
    </>
  );
}
