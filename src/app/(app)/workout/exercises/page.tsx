import { requireOnboardedUser } from "@/lib/server/auth";
import { getLibrary } from "@/lib/server/services/exercises";
import { getUserContext } from "@/lib/server/services/profile";
import { PageHeader } from "@/components/app/PageHeader";
import { Vault } from "./Vault";
export const metadata = { title: "Exercise Vault" };
export default async function Page() {
  const user = await requireOnboardedUser();
  const [lib, ctx] = await Promise.all([getLibrary(), getUserContext(user.id)]);
  return (
    <>
      <PageHeader title="Exercise Vault" subtitle={`${lib.length} exercises with technique guides and alternatives.`} />
      <Vault exercises={lib.map(({ id, slug, name, category, primaryMuscles, equipment, difficulty, movementType }) => ({ id, slug, name, category, primaryMuscles, equipment, difficulty, movementType }))} myEquipment={ctx.equipment} />
    </>
  );
}
