import { requireOnboardedUser } from "@/lib/server/auth";
import { features } from "@/lib/server/env";
import { PageHeader } from "@/components/app/PageHeader";
import { ImportFlow } from "./ImportFlow";
export const metadata = { title: "Import my program" };
export default async function Page() {
  await requireOnboardedUser();
  return (
    <>
      <PageHeader back={{ href: "/workout/plan", label: "My plan" }} title="Import my current program" subtitle="Type it out or paste it from your notes. You'll review everything before it's saved." />
      <ImportFlow aiEnabled={features.ai} />
    </>
  );
}
