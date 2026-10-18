"use server";
import { requireUser } from "@/lib/server/auth";
import { run } from "@/lib/server/action";
import { OnboardingSchema, saveOnboarding, type OnboardingInput } from "@/lib/server/services/profile";
import { track } from "@/lib/server/analytics";

export async function completeOnboarding(input: OnboardingInput) {
  const user = await requireUser();
  return run(async () => {
    await saveOnboarding(user.id, OnboardingSchema.parse(input));
    await track(user.id, "onboarding_completed");
  });
}
