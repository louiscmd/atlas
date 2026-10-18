import { requireOnboardedUser } from "@/lib/server/auth";
import { features } from "@/lib/server/env";
import { PageHeader } from "@/components/app/PageHeader";
import { Assistant } from "./Assistant";
export const metadata = { title: "Nutrition assistant" };
export default async function Page() {
  await requireOnboardedUser();
  return (
    <>
      <PageHeader title="Nutrition assistant" subtitle="Meal ideas that fit what you have left today." />
      <Assistant aiEnabled={features.ai} />
    </>
  );
}
