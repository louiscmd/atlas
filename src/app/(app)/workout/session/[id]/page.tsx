import { notFound, redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/server/auth";
import { getUserContext } from "@/lib/server/services/profile";
import { getPlayerState } from "@/lib/server/services/player";
import { NotFoundError } from "@/lib/server/services/plans";
import { WorkoutPlayer } from "./WorkoutPlayer";

export const metadata = { title: "Workout" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireOnboardedUser();
  const { id } = await params;
  const ctx = await getUserContext(user.id);
  const state = await getPlayerState(user.id, id).catch((e) => { if (e instanceof NotFoundError) notFound(); throw e; });
  if (state.status === "completed") redirect(`/workout/history/${id}?completed=1`);
  return <WorkoutPlayer initial={state} unit={ctx.unit} />;
}
