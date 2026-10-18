import { requireOnboardedUser } from "@/lib/server/auth";
import { getUserContext } from "@/lib/server/services/profile";
import { features } from "@/lib/server/env";
import { localDate } from "@/lib/dates";
import { PageHeader } from "@/components/app/PageHeader";
import { Scanner } from "./Scanner";
export const metadata = { title: "Food scanner" };
export default async function Page() {
  const user = await requireOnboardedUser();
  const ctx = await getUserContext(user.id);
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: ctx.tz, hour: "numeric", hour12: false }).format(new Date()));
  return (
    <>
      <PageHeader title="Scan food" subtitle="Photograph a meal or a nutrition label. You can correct everything before logging." />
      <Scanner aiEnabled={features.ai || features.visionDevSample} devSample={features.visionDevSample} date={localDate(ctx.tz)} defaultMeal={hour < 10 ? "breakfast" : hour < 15 ? "lunch" : hour < 21 ? "dinner" : "snack"} />
    </>
  );
}
