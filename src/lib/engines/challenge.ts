// 20-week consistency challenge: a week (Mon–Sun, user's time zone) earns a
// tick when it has at least `goal` completed workouts.
import { addDays, weekStart } from "@/lib/dates";

export const CHALLENGE_WEEKS = 20;
export const CHALLENGE_WEEKLY_GOAL = 5;

export type ChallengeWeek = {
  index: number; // 1-based
  start: string; // YYYY-MM-DD (Monday)
  end: string; // YYYY-MM-DD (Sunday)
  count: number;
  status: "complete" | "missed" | "current" | "upcoming";
};

export function computeChallenge(opts: { joinedOn: string; today: string; workoutDates: string[]; weeks?: number; goal?: number }) {
  const weeks = opts.weeks ?? CHALLENGE_WEEKS, goal = opts.goal ?? CHALLENGE_WEEKLY_GOAL;
  const first = weekStart(opts.joinedOn);
  const counts = new Map<string, number>();
  for (const d of opts.workoutDates) counts.set(weekStart(d), (counts.get(weekStart(d)) ?? 0) + 1);
  const thisWeek = weekStart(opts.today);

  const list: ChallengeWeek[] = Array.from({ length: weeks }, (_, i) => {
    const start = addDays(first, i * 7);
    const count = counts.get(start) ?? 0;
    const status: ChallengeWeek["status"] = count >= goal ? "complete" : start < thisWeek ? "missed" : start === thisWeek ? "current" : "upcoming";
    return { index: i + 1, start, end: addDays(start, 6), count, status };
  });
  const completed = list.filter((w) => w.status === "complete").length;
  const current = list.find((w) => w.start === thisWeek) ?? null;
  const lastEnd = list[list.length - 1].end;
  return {
    weeks: list, goal, total: weeks, completed,
    missed: list.filter((w) => w.status === "missed").length,
    current, // null before it starts or after it ends
    finished: opts.today > lastEnd,
    perfect: completed === weeks,
    endsOn: lastEnd,
  };
}
export type Challenge = ReturnType<typeof computeChallenge>;
