import { requireOnboardedUser } from "@/lib/server/auth";
import { getUserContext } from "@/lib/server/services/profile";
import { getTarget } from "@/lib/server/services/nutrition";
import { db } from "@/lib/server/db";
import { features } from "@/lib/server/env";
import { PageHeader } from "@/components/app/PageHeader";
import { ProfileSections } from "./ProfileSections";
export const metadata = { title: "Profile" };

export default async function Page() {
  const user = await requireOnboardedUser();
  const [ctx, target, accounts, sub] = await Promise.all([getUserContext(user.id), getTarget(user.id), db.account.findMany({ where: { userId: user.id }, select: { provider: true } }), db.subscription.findUnique({ where: { userId: user.id } })]);
  const p = ctx.profile!, g = ctx.goals!;
  return (
    <>
      <PageHeader title="Profile" subtitle={user.email} />
      <ProfileSections
        email={user.email} verified={!!user.emailVerifiedAt} googleEnabled={features.google} aiEnabled={features.ai}
        personal={{ firstName: p.firstName, age: ctx.age, sex: p.sex ?? "other", heightCm: p.heightCm ?? 175, unitSystem: p.unitSystem, timezone: p.timezone, activityLevel: p.activityLevel }}
        training={{ primaryGoal: g.primaryGoal, secondaryGoal: g.secondaryGoal, goalWeightKg: g.goalWeightKg, experience: p.experience ?? "beginner", daysPerWeek: g.daysPerWeek, sessionLength: g.sessionLength, availableDays: ctx.availableDays, trainingLocation: g.trainingLocation, musclePriorities: ctx.musclePriorities }}
        equipment={ctx.equipment}
        restrictions={ctx.restrictions.map((r) => ({ id: r.id, type: r.type, note: r.note, exercise: r.exercise ? { name: r.exercise.name, slug: r.exercise.slug } : null }))}
        notifications={(ctx.preferences?.notifications ?? {}) as Record<string, boolean>}
        prefs={{ theme: (ctx.preferences?.theme ?? "dark") as "dark" | "light", analyticsOptIn: ctx.preferences?.analyticsOptIn ?? true, weightIncrementKg: ctx.preferences?.weightIncrementKg ?? 2.5 }}
        target={target ? { calories: target.calories, proteinG: target.proteinG } : null}
        providers={accounts.map((a) => a.provider)} plan={sub?.plan ?? "free"}
      />
    </>
  );
}
