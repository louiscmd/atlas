import { redirect } from "next/navigation";
import { requireUser } from "@/lib/server/auth";
import { getLibrary } from "@/lib/server/services/exercises";
import { Onboarding } from "./Onboarding";

export const metadata = { title: "Your assessment" };

export default async function Page({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const user = await requireUser();
  if (user.profile?.onboardingCompletedAt && !(await searchParams).edit) redirect("/home");
  const lib = await getLibrary();
  return <Onboarding exercises={lib.map((e) => ({ id: e.id, name: e.name, category: e.category }))} />;
}
