import { requireOnboardedUser } from "@/lib/server/auth";
import { getUserContext } from "@/lib/server/services/profile";
import { favoriteFoods, recentFoods } from "@/lib/server/services/nutrition";
import { db } from "@/lib/server/db";
import { localDate } from "@/lib/dates";
import { PageHeader } from "@/components/app/PageHeader";
import { AddFood } from "./AddFood";
export const metadata = { title: "Add food" };

export default async function Page({ searchParams }: { searchParams: Promise<{ date?: string; meal?: string }> }) {
  const user = await requireOnboardedUser();
  const ctx = await getUserContext(user.id);
  const sp = await searchParams;
  const [recent, favorites, mine] = await Promise.all([
    recentFoods(user.id), favoriteFoods(user.id),
    db.food.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 30, include: { nutrition: true } }),
  ]);
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: ctx.tz, hour: "numeric", hour12: false }).format(new Date()));
  const defaultMeal = sp.meal ?? (hour < 10 ? "breakfast" : hour < 15 ? "lunch" : hour < 21 ? "dinner" : "snack");
  return (
    <>
      <PageHeader back={{ href: `/nutrition${sp.date ? `?date=${sp.date}` : ""}`, label: "Nutrition" }} title="Add food" />
      <AddFood date={sp.date ?? localDate(ctx.tz)} defaultMeal={defaultMeal} recent={recent} favorites={favorites} mine={mine} favoriteIds={favorites.map((f) => f.id)} />
    </>
  );
}
