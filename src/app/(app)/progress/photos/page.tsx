import { requireOnboardedUser } from "@/lib/server/auth";
import { getUserContext } from "@/lib/server/services/profile";
import { listPhotos } from "@/lib/server/services/progress";
import { localDate } from "@/lib/dates";
import { PageHeader } from "@/components/app/PageHeader";
import { Photos } from "./Photos";
export const metadata = { title: "Progress photos" };
export default async function Page() {
  const user = await requireOnboardedUser();
  const [ctx, photos] = await Promise.all([getUserContext(user.id), listPhotos(user.id)]);
  return (
    <>
      <PageHeader title="Progress photos" subtitle="Private to you. Stored securely and never shared or used to train AI." />
      <Photos unit={ctx.unit} photos={photos.map((p) => ({ id: p.id, pose: p.pose, date: localDate(ctx.tz, p.takenAt), bodyWeightKg: p.bodyWeightKg, note: p.note }))} />
    </>
  );
}
