import { requireOnboardedUser } from "@/lib/server/auth";
import { getUserContext } from "@/lib/server/services/profile";
import { listMeals } from "@/lib/server/services/nutrition";
import { localDate } from "@/lib/dates";
import { PageHeader } from "@/components/app/PageHeader";
import { Meals } from "./Meals";
export const metadata = { title: "Meals" };
export default async function Page() {
  const user = await requireOnboardedUser();
  const [ctx, meals] = await Promise.all([getUserContext(user.id), listMeals(user.id)]);
  return (
    <>
      <PageHeader title="Saved meals" subtitle="Build meals you eat often and log them in one tap." />
      <Meals date={localDate(ctx.tz)} meals={meals.map((m) => ({ id: m.id, name: m.name, totals: m.totals, items: m.items.map((i) => ({ foodId: i.foodId, servings: i.servings, name: i.food.name, servingLabel: i.food.servingLabel ?? `${i.food.servingSize} ${i.food.servingUnit}`, calories: (i.food.nutrition?.calories ?? 0) * i.servings, protein: (i.food.nutrition?.protein ?? 0) * i.servings })) }))} />
    </>
  );
}
