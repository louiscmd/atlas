import { requireOnboardedUser } from "@/lib/server/auth";
import { getUserLibrary } from "@/lib/server/services/exercises";
import { getUserContext } from "@/lib/server/services/profile";
import { PageHeader } from "@/components/app/PageHeader";
import { Vault } from "./Vault";
export const metadata = { title: "Exercise Vault" };
export default async function Page() {
  const user = await requireOnboardedUser();
  const [lib, ctx] = await Promise.all([getUserLibrary(user.id), getUserContext(user.id)]);
  const customCount = lib.filter((e) => e.ownerId).length;
  return (
    <>
      <PageHeader title="Exercise Vault" subtitle={`${lib.length - customCount} exercises with technique guides and alternatives${customCount ? `, plus ${customCount} of your own` : ""}.`} />
      <Vault exercises={lib.map(({ id, slug, name, category, primaryMuscles, equipment, difficulty, movementType, ownerId }) => ({ id, slug, name, category, primaryMuscles, equipment, difficulty, movementType, isCustom: ownerId != null }))} myEquipment={ctx.equipment} />
    </>
  );
}
