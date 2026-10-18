// Seed program library. Every program contains real weekly programming.
// Row format: [exerciseSlug, sets, repMin, repMax, restSec, rir, notes?]
// Weekday: 0=Mon .. 6=Sun.

type Row = [string, number, number, number, number, number | null, string?];
export type SeedDay = { weekday: number; name: string; focus: string; warmup: string; rows: Row[] };
export type SeedProgram = {
  slug: string;
  name: string;
  category: string;
  goal: string;
  difficulty: string;
  daysPerWeek: number;
  sessionMinutes: number;
  equipment: string[];
  description: string;
  progression: string;
  deload: string;
  whoFor: string[];
  whoNotFor: string[];
  featured?: boolean;
  days: SeedDay[];
};

const GYM = ["barbell", "dumbbells", "bench", "squat_rack", "cable", "machines", "pullup_bar"];
const WU_GENERAL = "5 min easy cardio, then 2 light ramp-up sets for the first exercise.";
const WU_LOWER = "5 min bike, 10 bodyweight squats, 8 hip hinges, then ramp-up sets.";
const WU_UPPER = "5 min row, band pull-aparts ×15, push-ups ×10, then ramp-up sets.";
const DOUBLE_PROG = "Double progression: when you hit the top of the rep range on all sets at the target RIR, add the smallest available load (≈2.5 kg upper / 5 kg lower) next session.";
const LINEAR = "Linear progression on main lifts: add 2.5 kg (upper) or 5 kg (lower) each session while all sets are completed. If you miss reps two sessions in a row, reduce the load 10% and build back.";
const DELOAD_6 = "Every 6–8 weeks, or when performance stalls for 2 weeks: one week with half the sets at the same loads.";

export const PROGRAMS: SeedProgram[] = [
  // 1
  {
    slug: "beginner-full-body-3", name: "Beginner Full Body", category: "beginner", goal: "General strength and muscle development", difficulty: "beginner",
    daysPerWeek: 3, sessionMinutes: 50, equipment: GYM, featured: true,
    description: "Three full-body sessions built around the fundamental movement patterns: squat, hinge, push and pull. Two alternating workouts (A/B) keep it simple while giving every muscle group practice and stimulus three times per week.",
    progression: LINEAR, deload: "Not usually needed in the first 8–12 weeks. Take an easier week if joints feel beat up or sleep is poor.",
    whoFor: ["New lifters or those returning after a long break", "People who can train 3 non-consecutive days", "Anyone wanting to learn the main lifts"],
    whoNotFor: ["Experienced lifters needing more volume", "People who prefer training 5+ days per week"],
    days: [
      { weekday: 0, name: "Full Body A", focus: "Squat / Push / Pull", warmup: WU_LOWER, rows: [
        ["back-squat", 3, 5, 8, 150, 2], ["dumbbell-bench-press", 3, 8, 10, 120, 2], ["lat-pulldown", 3, 8, 12, 90, 2], ["dumbbell-romanian-deadlift", 2, 10, 12, 90, 2], ["plank", 3, 30, 45, 45, null]] },
      { weekday: 2, name: "Full Body B", focus: "Hinge / Press / Row", warmup: WU_LOWER, rows: [
        ["trap-bar-deadlift", 3, 5, 8, 150, 2], ["dumbbell-shoulder-press", 3, 8, 10, 90, 2], ["seated-cable-row", 3, 8, 12, 90, 2], ["goblet-squat", 2, 10, 12, 90, 2], ["dead-bug", 3, 8, 10, 45, null]] },
      { weekday: 4, name: "Full Body A", focus: "Squat / Push / Pull", warmup: WU_LOWER, rows: [
        ["back-squat", 3, 5, 8, 150, 2], ["dumbbell-bench-press", 3, 8, 10, 120, 2], ["lat-pulldown", 3, 8, 12, 90, 2], ["lying-leg-curl", 2, 10, 15, 60, 2], ["dumbbell-curl", 2, 10, 12, 60, 2]] },
    ],
  },
  // 2
  {
    slug: "beginner-upper-lower-4", name: "Beginner Upper/Lower", category: "beginner", goal: "Build a foundation of strength and muscle", difficulty: "beginner",
    daysPerWeek: 4, sessionMinutes: 55, equipment: GYM,
    description: "A four-day split that trains each muscle twice per week with moderate volume. Machines and dumbbells keep technique demands manageable while the main lifts build strength.",
    progression: DOUBLE_PROG, deload: DELOAD_6,
    whoFor: ["Beginners ready for four sessions a week", "People who like a predictable weekly schedule"],
    whoNotFor: ["Those who can only train 2–3 days", "Advanced lifters"],
    days: [
      { weekday: 0, name: "Upper A", focus: "Chest / Back / Shoulders / Arms", warmup: WU_UPPER, rows: [
        ["dumbbell-bench-press", 3, 6, 10, 120, 2], ["seated-cable-row", 3, 8, 12, 90, 2], ["dumbbell-shoulder-press", 2, 8, 12, 90, 2], ["lat-pulldown", 2, 10, 12, 90, 2], ["triceps-pushdown", 2, 10, 15, 60, 2], ["dumbbell-curl", 2, 10, 15, 60, 2]] },
      { weekday: 1, name: "Lower A", focus: "Quads / Hamstrings / Calves", warmup: WU_LOWER, rows: [
        ["goblet-squat", 3, 8, 12, 120, 2], ["dumbbell-romanian-deadlift", 3, 8, 12, 90, 2], ["leg-press", 2, 10, 15, 90, 2], ["lying-leg-curl", 2, 10, 15, 60, 2], ["standing-calf-raise", 3, 10, 15, 60, 1]] },
      { weekday: 3, name: "Upper B", focus: "Back / Chest / Shoulders / Arms", warmup: WU_UPPER, rows: [
        ["lat-pulldown", 3, 8, 12, 90, 2], ["machine-chest-press", 3, 8, 12, 90, 2], ["chest-supported-row", 3, 8, 12, 90, 2], ["lateral-raise", 3, 12, 15, 60, 2], ["hammer-curl", 2, 10, 15, 60, 2], ["overhead-cable-extension", 2, 10, 15, 60, 2]] },
      { weekday: 4, name: "Lower B", focus: "Glutes / Quads / Core", warmup: WU_LOWER, rows: [
        ["leg-press", 3, 8, 12, 120, 2], ["dumbbell-hip-thrust", 3, 10, 12, 90, 2], ["reverse-lunge", 2, 10, 12, 75, 2], ["leg-extension", 2, 12, 15, 60, 2], ["dead-bug", 3, 8, 10, 45, null]] },
    ],
  },
  // 3
  {
    slug: "hypertrophy-full-body-3", name: "Hypertrophy Full Body", category: "hypertrophy", goal: "Muscle growth", difficulty: "intermediate",
    daysPerWeek: 3, sessionMinutes: 65, equipment: GYM, featured: true,
    description: "Each session hits every major muscle group with a mix of compound and isolation work. Three different days rotate exercises so weekly volume lands around 10–14 sets per muscle without excessive fatigue.",
    progression: DOUBLE_PROG, deload: DELOAD_6,
    whoFor: ["Lifters with 6+ months of experience", "Busy people who want efficient hypertrophy training"],
    whoNotFor: ["Pure strength athletes peaking a lift", "Complete beginners (start with Beginner Full Body)"],
    days: [
      { weekday: 0, name: "Full Body 1", focus: "Squat emphasis", warmup: WU_LOWER, rows: [
        ["back-squat", 3, 6, 10, 150, 2], ["incline-dumbbell-press", 3, 8, 12, 120, 2], ["seated-cable-row", 3, 10, 12, 90, 2], ["lying-leg-curl", 3, 10, 15, 60, 1], ["lateral-raise", 3, 12, 20, 60, 1], ["triceps-pushdown", 2, 10, 15, 60, 1]] },
      { weekday: 2, name: "Full Body 2", focus: "Hinge emphasis", warmup: WU_LOWER, rows: [
        ["romanian-deadlift", 3, 6, 10, 150, 2], ["lat-pulldown", 3, 8, 12, 90, 2], ["machine-chest-press", 3, 8, 12, 90, 2], ["bulgarian-split-squat", 2, 8, 12, 90, 2], ["face-pull", 3, 12, 20, 60, 1], ["incline-dumbbell-curl", 3, 10, 15, 60, 1]] },
      { weekday: 4, name: "Full Body 3", focus: "Press emphasis", warmup: WU_UPPER, rows: [
        ["barbell-bench-press", 3, 6, 10, 150, 2], ["chest-supported-row", 3, 8, 12, 90, 2], ["hack-squat", 3, 8, 12, 120, 2], ["seated-leg-curl", 2, 10, 15, 60, 1], ["cable-lateral-raise", 3, 12, 20, 60, 1], ["standing-calf-raise", 3, 10, 15, 60, 1]] },
    ],
  },
  // 4
  {
    slug: "upper-lower-hypertrophy-4", name: "Upper/Lower Hypertrophy", category: "hypertrophy", goal: "Muscle growth", difficulty: "intermediate",
    daysPerWeek: 4, sessionMinutes: 70, equipment: GYM, featured: true,
    description: "A classic four-day upper/lower split. One heavier and one higher-rep day for each half of the body gives every muscle two quality sessions per week and room to recover.",
    progression: DOUBLE_PROG, deload: DELOAD_6,
    whoFor: ["Intermediate lifters focused on size", "People with 4 training days available"],
    whoNotFor: ["Those with less than 60 minutes per session"],
    days: [
      { weekday: 0, name: "Upper — Heavy", focus: "Chest / Back / Shoulders", warmup: WU_UPPER, rows: [
        ["barbell-bench-press", 4, 5, 8, 150, 2], ["barbell-row", 4, 6, 10, 120, 2], ["overhead-press", 3, 6, 10, 120, 2], ["pull-up", 3, 6, 10, 120, 2], ["skull-crusher", 2, 8, 12, 75, 1], ["barbell-curl", 2, 8, 12, 75, 1]] },
      { weekday: 1, name: "Lower — Heavy", focus: "Quads / Hamstrings", warmup: WU_LOWER, rows: [
        ["back-squat", 4, 5, 8, 180, 2], ["romanian-deadlift", 3, 6, 10, 150, 2], ["leg-press", 3, 10, 12, 120, 2], ["lying-leg-curl", 3, 10, 12, 60, 1], ["standing-calf-raise", 4, 8, 12, 60, 1]] },
      { weekday: 3, name: "Upper — Volume", focus: "Back / Chest / Arms", warmup: WU_UPPER, rows: [
        ["incline-dumbbell-press", 3, 8, 12, 120, 2], ["lat-pulldown", 3, 10, 12, 90, 2], ["chest-supported-row", 3, 10, 12, 90, 1], ["cable-fly", 2, 12, 15, 60, 1], ["lateral-raise", 4, 12, 20, 60, 1], ["overhead-cable-extension", 3, 10, 15, 60, 1], ["incline-dumbbell-curl", 3, 10, 15, 60, 1]] },
      { weekday: 4, name: "Lower — Volume", focus: "Glutes / Quads / Core", warmup: WU_LOWER, rows: [
        ["hack-squat", 3, 8, 12, 120, 2], ["hip-thrust", 3, 8, 12, 120, 2], ["bulgarian-split-squat", 3, 8, 12, 90, 2], ["leg-extension", 3, 12, 15, 60, 1], ["seated-leg-curl", 3, 10, 15, 60, 1], ["cable-crunch", 3, 10, 15, 60, 1]] },
    ],
  },
  // 5
  {
    slug: "push-pull-legs-6", name: "Push/Pull/Legs", category: "hypertrophy", goal: "Muscle growth", difficulty: "advanced",
    daysPerWeek: 6, sessionMinutes: 70, equipment: GYM,
    description: "Push, pull and legs run twice per week. The first rotation is heavier; the second uses more volume and isolation. High frequency and volume for experienced lifters who recover well.",
    progression: DOUBLE_PROG, deload: "Every 5–6 weeks: one week at half the sets. Six-day splits accumulate fatigue quickly — deload sooner if sleep or performance drops.",
    whoFor: ["Advanced lifters with consistent recovery", "People who enjoy training almost daily"],
    whoNotFor: ["Beginners", "Anyone with high life stress or limited sleep", "People who often miss sessions"],
    days: [
      { weekday: 0, name: "Push — Heavy", focus: "Chest / Shoulders / Triceps", warmup: WU_UPPER, rows: [
        ["barbell-bench-press", 4, 5, 8, 150, 2], ["overhead-press", 3, 6, 10, 120, 2], ["incline-dumbbell-press", 3, 8, 12, 90, 2], ["lateral-raise", 3, 12, 20, 60, 1], ["triceps-pushdown", 3, 10, 15, 60, 1]] },
      { weekday: 1, name: "Pull — Heavy", focus: "Back / Biceps", warmup: WU_UPPER, rows: [
        ["deadlift", 3, 3, 6, 180, 2], ["pull-up", 4, 6, 10, 120, 2], ["barbell-row", 3, 6, 10, 120, 2], ["face-pull", 3, 12, 20, 60, 1], ["barbell-curl", 3, 8, 12, 60, 1]] },
      { weekday: 2, name: "Legs — Heavy", focus: "Quads / Hamstrings / Calves", warmup: WU_LOWER, rows: [
        ["back-squat", 4, 5, 8, 180, 2], ["romanian-deadlift", 3, 8, 10, 150, 2], ["leg-press", 3, 10, 12, 120, 2], ["lying-leg-curl", 3, 10, 15, 60, 1], ["standing-calf-raise", 4, 8, 12, 60, 1]] },
      { weekday: 3, name: "Push — Volume", focus: "Chest / Shoulders / Triceps", warmup: WU_UPPER, rows: [
        ["incline-barbell-bench-press", 3, 8, 12, 120, 2], ["machine-chest-press", 3, 10, 12, 90, 1], ["cable-fly", 3, 12, 15, 60, 1], ["cable-lateral-raise", 4, 12, 20, 60, 1], ["overhead-cable-extension", 3, 10, 15, 60, 1]] },
      { weekday: 4, name: "Pull — Volume", focus: "Back / Rear delts / Biceps", warmup: WU_UPPER, rows: [
        ["lat-pulldown", 3, 10, 12, 90, 1], ["chest-supported-row", 3, 10, 12, 90, 1], ["single-arm-cable-pulldown", 2, 12, 15, 60, 1], ["reverse-pec-deck", 3, 12, 20, 60, 1], ["incline-dumbbell-curl", 3, 10, 15, 60, 1], ["hammer-curl", 2, 10, 15, 60, 1]] },
      { weekday: 5, name: "Legs — Volume", focus: "Glutes / Quads / Core", warmup: WU_LOWER, rows: [
        ["hack-squat", 3, 10, 12, 120, 2], ["hip-thrust", 3, 10, 12, 90, 2], ["walking-lunge", 2, 12, 16, 90, 2], ["leg-extension", 3, 12, 15, 60, 1], ["seated-leg-curl", 3, 12, 15, 60, 1], ["hanging-knee-raise", 3, 10, 15, 60, 1]] },
    ],
  },
  // 6
  {
    slug: "ppl-upper-lower-5", name: "PPL + Upper/Lower", category: "hypertrophy", goal: "Muscle growth", difficulty: "intermediate",
    daysPerWeek: 5, sessionMinutes: 65, equipment: GYM,
    description: "Push, pull and legs early in the week, then an upper and a lower day to finish. Every muscle is trained about twice per week across five sessions, with a rest day mid-week.",
    progression: DOUBLE_PROG, deload: DELOAD_6,
    whoFor: ["Intermediate lifters with 5 days available", "People who want PPL with better frequency"],
    whoNotFor: ["Beginners", "People who can't commit to 5 sessions"],
    days: [
      { weekday: 0, name: "Push", focus: "Chest / Shoulders / Triceps", warmup: WU_UPPER, rows: [
        ["barbell-bench-press", 4, 6, 10, 150, 2], ["dumbbell-shoulder-press", 3, 8, 12, 90, 2], ["cable-fly", 3, 12, 15, 60, 1], ["lateral-raise", 3, 12, 20, 60, 1], ["triceps-pushdown", 3, 10, 15, 60, 1]] },
      { weekday: 1, name: "Pull", focus: "Back / Biceps", warmup: WU_UPPER, rows: [
        ["pull-up", 4, 6, 10, 120, 2], ["barbell-row", 3, 6, 10, 120, 2], ["straight-arm-pulldown", 2, 12, 15, 60, 1], ["face-pull", 3, 12, 20, 60, 1], ["dumbbell-curl", 3, 10, 12, 60, 1]] },
      { weekday: 2, name: "Legs", focus: "Quads / Hamstrings / Calves", warmup: WU_LOWER, rows: [
        ["back-squat", 4, 6, 8, 180, 2], ["romanian-deadlift", 3, 8, 10, 150, 2], ["leg-extension", 3, 12, 15, 60, 1], ["lying-leg-curl", 3, 10, 15, 60, 1], ["standing-calf-raise", 3, 10, 15, 60, 1]] },
      { weekday: 4, name: "Upper", focus: "Chest / Back / Arms", warmup: WU_UPPER, rows: [
        ["incline-dumbbell-press", 3, 8, 12, 120, 2], ["seated-cable-row", 3, 10, 12, 90, 1], ["machine-shoulder-press", 2, 10, 12, 90, 1], ["lat-pulldown", 3, 10, 12, 90, 1], ["overhead-cable-extension", 2, 10, 15, 60, 1], ["hammer-curl", 2, 10, 15, 60, 1]] },
      { weekday: 5, name: "Lower", focus: "Glutes / Quads / Core", warmup: WU_LOWER, rows: [
        ["leg-press", 3, 10, 12, 120, 2], ["hip-thrust", 3, 8, 12, 120, 2], ["bulgarian-split-squat", 2, 10, 12, 90, 2], ["seated-leg-curl", 3, 10, 15, 60, 1], ["cable-crunch", 3, 10, 15, 60, 1]] },
    ],
  },
  // 7
  {
    slug: "general-strength-4", name: "General Strength", category: "strength", goal: "Increase strength on the main lifts", difficulty: "intermediate",
    daysPerWeek: 4, sessionMinutes: 70, equipment: ["barbell", "dumbbells", "bench", "squat_rack", "cable", "pullup_bar", "machines"], featured: true,
    description: "Squat, bench, deadlift and overhead press each get a dedicated heavy day plus lighter exposure elsewhere in the week. Low-rep compound work with longer rests, backed by targeted accessories.",
    progression: "Main lifts: add 2.5 kg per week to the top sets while all reps are completed at RIR ≥1. Accessories use double progression. When a main lift stalls two weeks in a row, drop 10% and rebuild.",
    deload: "Every 4th week: keep loads at ~85% of your recent working weights with fewer sets.",
    whoFor: ["Lifters with solid technique on the barbell lifts", "People who want measurable strength gains"],
    whoNotFor: ["Beginners still learning the lifts", "Those without a rack and barbell"],
    days: [
      { weekday: 0, name: "Squat Day", focus: "Squat strength", warmup: WU_LOWER, rows: [
        ["back-squat", 5, 3, 5, 210, 2, "Work up to 5 heavy sets"], ["romanian-deadlift", 3, 6, 8, 150, 2], ["bulgarian-split-squat", 3, 8, 10, 90, 2], ["plank", 3, 30, 45, 45, null]] },
      { weekday: 1, name: "Bench Day", focus: "Bench press strength", warmup: WU_UPPER, rows: [
        ["barbell-bench-press", 5, 3, 5, 210, 2], ["barbell-row", 4, 6, 8, 120, 2], ["close-grip-bench-press", 3, 6, 8, 120, 2], ["pull-up", 3, 6, 10, 120, 2], ["face-pull", 3, 12, 15, 60, 1]] },
      { weekday: 3, name: "Deadlift Day", focus: "Deadlift strength", warmup: WU_LOWER, rows: [
        ["deadlift", 4, 2, 4, 240, 2], ["front-squat", 3, 5, 6, 150, 2], ["lying-leg-curl", 3, 8, 12, 75, 1], ["hanging-knee-raise", 3, 8, 12, 60, 1]] },
      { weekday: 4, name: "Press Day", focus: "Overhead press strength", warmup: WU_UPPER, rows: [
        ["overhead-press", 5, 3, 5, 180, 2], ["incline-dumbbell-press", 3, 6, 10, 120, 2], ["chest-supported-row", 3, 8, 10, 90, 2], ["lateral-raise", 3, 12, 15, 60, 1], ["barbell-curl", 2, 8, 12, 60, 1]] },
    ],
  },
  // 8
  {
    slug: "strength-focus-5", name: "Strength Focus", category: "strength", goal: "Bench, squat and deadlift strength", difficulty: "advanced",
    daysPerWeek: 5, sessionMinutes: 75, equipment: ["barbell", "dumbbells", "bench", "squat_rack", "cable", "pullup_bar", "machines"],
    description: "Five days with higher frequency on the competition lifts: squat twice, bench three times, deadlift once heavy plus a variation. Choose a lift to emphasize by adding one set to its heavy day.",
    progression: "Weekly undulating loading: heavy day (3–5 reps), volume day (6–8 reps). Add 2.5 kg to heavy-day loads each week while RIR stays ≥1. Bench, squat or deadlift specialization: add one top set to that lift's heavy day.",
    deload: "Every 4th week: 2 fewer sets on all main lifts at ~85% load.",
    whoFor: ["Advanced lifters chasing a bigger bench, squat or deadlift", "Strength-sport hobbyists"],
    whoNotFor: ["Beginners", "Anyone with limited recovery capacity", "People with back or shoulder pain under heavy loads"],
    days: [
      { weekday: 0, name: "Heavy Squat + Bench", focus: "Squat / Bench", warmup: WU_LOWER, rows: [
        ["back-squat", 5, 3, 5, 210, 2], ["barbell-bench-press", 4, 3, 5, 180, 2], ["barbell-row", 3, 6, 8, 120, 2], ["plank", 3, 30, 45, 45, null]] },
      { weekday: 1, name: "Deadlift", focus: "Deadlift / Back", warmup: WU_LOWER, rows: [
        ["deadlift", 4, 2, 4, 240, 2], ["pull-up", 4, 5, 8, 120, 2], ["good-morning", 3, 6, 8, 120, 3], ["hanging-knee-raise", 3, 8, 12, 60, 1]] },
      { weekday: 2, name: "Volume Bench", focus: "Bench / Shoulders", warmup: WU_UPPER, rows: [
        ["barbell-bench-press", 4, 6, 8, 150, 2], ["overhead-press", 3, 6, 8, 120, 2], ["dumbbell-row", 3, 8, 10, 90, 2], ["triceps-pushdown", 3, 10, 12, 60, 1]] },
      { weekday: 4, name: "Volume Squat", focus: "Squat / Posterior chain", warmup: WU_LOWER, rows: [
        ["front-squat", 4, 5, 6, 150, 2], ["romanian-deadlift", 3, 6, 8, 150, 2], ["walking-lunge", 2, 10, 12, 90, 2], ["standing-calf-raise", 3, 10, 12, 60, 1]] },
      { weekday: 5, name: "Bench Variation + Upper", focus: "Bench lockout / Upper back", warmup: WU_UPPER, rows: [
        ["close-grip-bench-press", 4, 4, 6, 150, 2], ["incline-dumbbell-press", 3, 8, 10, 90, 2], ["chest-supported-row", 3, 8, 12, 90, 1], ["face-pull", 3, 12, 15, 60, 1], ["hammer-curl", 2, 10, 12, 60, 1]] },
    ],
  },
  // 9
  {
    slug: "fat-loss-resistance-4", name: "Fat Loss Resistance + Cardio", category: "fat_loss", goal: "Preserve muscle while losing fat", difficulty: "intermediate",
    daysPerWeek: 4, sessionMinutes: 60, equipment: [...GYM, "cardio", "kettlebells"], featured: true,
    description: "Resistance training stays heavy enough to signal the body to keep its muscle, while moderate cardio finishers add energy expenditure without wrecking recovery. Pair with a modest calorie deficit — not an extreme one.",
    progression: "Aim to maintain or slowly increase loads. In a calorie deficit, holding strength is a win. Use double progression on accessories.",
    deload: "Every 6 weeks, or take a diet break week at maintenance calories with normal training.",
    whoFor: ["People in a moderate calorie deficit", "Anyone wanting to keep strength while leaning out"],
    whoNotFor: ["People on very-low-calorie diets (this is not recommended)", "Anyone with medical conditions without professional guidance"],
    days: [
      { weekday: 0, name: "Upper Strength", focus: "Chest / Back / Shoulders", warmup: WU_UPPER, rows: [
        ["barbell-bench-press", 3, 6, 8, 150, 2], ["barbell-row", 3, 6, 10, 120, 2], ["dumbbell-shoulder-press", 3, 8, 10, 90, 2], ["lat-pulldown", 3, 10, 12, 90, 2], ["treadmill-incline-walk", 1, 15, 20, 0, null, "Moderate pace"]] },
      { weekday: 1, name: "Lower Strength", focus: "Legs / Glutes", warmup: WU_LOWER, rows: [
        ["back-squat", 3, 6, 8, 150, 2], ["romanian-deadlift", 3, 8, 10, 120, 2], ["leg-press", 2, 10, 15, 90, 2], ["lying-leg-curl", 2, 10, 15, 60, 1], ["stationary-bike", 1, 15, 20, 0, null, "Easy pace"]] },
      { weekday: 3, name: "Upper Hypertrophy", focus: "Back / Chest / Arms", warmup: WU_UPPER, rows: [
        ["incline-dumbbell-press", 3, 10, 12, 90, 1], ["seated-cable-row", 3, 10, 12, 90, 1], ["lateral-raise", 3, 12, 20, 60, 1], ["triceps-pushdown", 2, 12, 15, 60, 1], ["dumbbell-curl", 2, 12, 15, 60, 1], ["bike-intervals", 1, 10, 12, 0, null, "30s hard / 90s easy"]] },
      { weekday: 4, name: "Lower + Conditioning", focus: "Glutes / Quads / Core", warmup: WU_LOWER, rows: [
        ["hip-thrust", 3, 8, 12, 90, 2], ["walking-lunge", 3, 10, 12, 90, 2], ["leg-extension", 2, 12, 15, 60, 1], ["kettlebell-swing", 3, 12, 15, 60, null], ["plank", 3, 30, 45, 45, null]] },
    ],
  },
  // 10
  {
    slug: "dumbbell-home-4", name: "Dumbbell Home", category: "home", goal: "Build muscle at home", difficulty: "beginner",
    daysPerWeek: 4, sessionMinutes: 45, equipment: ["dumbbells", "bench"],
    description: "Upper/lower training with only adjustable dumbbells and a bench. Higher rep ranges and slow eccentrics keep the work effective when loads are limited.",
    progression: "Double progression. When you run out of dumbbell weight, add reps, slow the lowering phase to 3 s, or add a set.",
    deload: DELOAD_6,
    whoFor: ["Home trainees with dumbbells and a bench", "People who can't get to a gym"],
    whoNotFor: ["Those wanting maximal strength on barbell lifts"],
    days: [
      { weekday: 0, name: "Upper A", focus: "Chest / Back / Shoulders", warmup: "Arm circles, 10 push-ups, then light sets.", rows: [
        ["dumbbell-bench-press", 4, 8, 12, 90, 2], ["dumbbell-row", 4, 8, 12, 90, 2], ["dumbbell-shoulder-press", 3, 10, 12, 90, 2], ["lateral-raise", 3, 12, 20, 60, 1], ["dumbbell-curl", 2, 10, 15, 60, 1]] },
      { weekday: 1, name: "Lower A", focus: "Quads / Glutes", warmup: "10 bodyweight squats, 10 glute bridges, then light sets.", rows: [
        ["goblet-squat", 4, 10, 15, 90, 2], ["dumbbell-romanian-deadlift", 3, 10, 12, 90, 2], ["bulgarian-split-squat", 3, 8, 12, 90, 2], ["single-leg-calf-raise", 3, 12, 20, 45, 1], ["dead-bug", 3, 8, 10, 45, null]] },
      { weekday: 3, name: "Upper B", focus: "Back / Chest / Arms", warmup: "Arm circles, 10 push-ups, then light sets.", rows: [
        ["incline-dumbbell-press", 3, 10, 12, 90, 2], ["chest-supported-row", 4, 10, 12, 90, 2], ["dumbbell-fly", 2, 12, 15, 60, 1], ["rear-delt-fly", 3, 12, 20, 60, 1], ["overhead-dumbbell-extension", 3, 10, 15, 60, 1], ["hammer-curl", 2, 10, 15, 60, 1]] },
      { weekday: 4, name: "Lower B", focus: "Hamstrings / Glutes", warmup: "10 bodyweight squats, 10 glute bridges, then light sets.", rows: [
        ["dumbbell-hip-thrust", 4, 10, 15, 90, 2], ["walking-lunge", 3, 10, 12, 90, 2], ["single-leg-rdl", 3, 8, 12, 75, 2], ["step-up", 2, 10, 12, 75, 2], ["side-plank", 2, 20, 40, 45, null]] },
    ],
  },
  // 10b (spec lists Dumbbell 3-Day)
  {
    slug: "dumbbell-home-3", name: "Dumbbell 3-Day", category: "home", goal: "Full-body strength and muscle at home", difficulty: "beginner",
    daysPerWeek: 3, sessionMinutes: 45, equipment: ["dumbbells", "bench"],
    description: "Three full-body dumbbell sessions a week. Simple, effective and easy to fit around a busy schedule.",
    progression: "Double progression. When you run out of weight, slow the eccentric or add a set.", deload: DELOAD_6,
    whoFor: ["Home trainees new to structured training"], whoNotFor: ["People wanting barbell-specific strength"],
    days: [
      { weekday: 0, name: "Full Body A", focus: "Squat / Push / Pull", warmup: "5 min light movement, then light sets.", rows: [
        ["goblet-squat", 3, 10, 12, 90, 2], ["dumbbell-bench-press", 3, 8, 12, 90, 2], ["dumbbell-row", 3, 10, 12, 90, 2], ["lateral-raise", 2, 12, 15, 60, 1], ["plank", 3, 30, 45, 45, null]] },
      { weekday: 2, name: "Full Body B", focus: "Hinge / Press / Row", warmup: "5 min light movement, then light sets.", rows: [
        ["dumbbell-romanian-deadlift", 3, 10, 12, 90, 2], ["dumbbell-shoulder-press", 3, 8, 12, 90, 2], ["chest-supported-row", 3, 10, 12, 90, 2], ["reverse-lunge", 2, 10, 12, 75, 2], ["dumbbell-curl", 2, 10, 15, 60, 1]] },
      { weekday: 4, name: "Full Body C", focus: "Single-leg / Incline / Arms", warmup: "5 min light movement, then light sets.", rows: [
        ["bulgarian-split-squat", 3, 8, 12, 90, 2], ["incline-dumbbell-press", 3, 10, 12, 90, 2], ["dumbbell-row", 3, 10, 12, 90, 2], ["dumbbell-hip-thrust", 2, 12, 15, 75, 2], ["overhead-dumbbell-extension", 2, 10, 15, 60, 1]] },
    ],
  },
  // 11
  {
    slug: "bodyweight-beginner-3", name: "Bodyweight Beginner", category: "home", goal: "General fitness with no equipment", difficulty: "beginner",
    daysPerWeek: 3, sessionMinutes: 35, equipment: [],
    description: "No equipment, no excuses. Three full-body sessions build basic strength, muscular endurance and movement quality using only your bodyweight.",
    progression: "Add reps each week. When you can do the top of the range for all sets, move to a harder variation (e.g. incline → regular → decline push-up).",
    deload: "Take an easier week every 6–8 weeks or when you feel run down.",
    whoFor: ["Complete beginners", "Travelers", "Anyone without equipment"],
    whoNotFor: ["People seeking maximal muscle growth long term"],
    days: [
      { weekday: 0, name: "Full Body A", focus: "Legs / Push / Core", warmup: "Cat-cow ×8, world's greatest stretch ×5/side.", rows: [
        ["bodyweight-squat", 3, 12, 20, 60, 2], ["incline-push-up", 3, 8, 15, 60, 2], ["glute-bridge", 3, 12, 20, 60, 2], ["reverse-lunge", 2, 8, 12, 60, 2], ["plank", 3, 20, 40, 45, null]] },
      { weekday: 2, name: "Full Body B", focus: "Single-leg / Push / Core", warmup: "Cat-cow ×8, 90/90 hip switches ×6.", rows: [
        ["split-squat", 3, 8, 12, 60, 2], ["push-up", 3, 5, 12, 75, 2], ["swiss-ball-leg-curl", 3, 8, 12, 60, 2], ["single-leg-calf-raise", 2, 10, 15, 45, 1], ["dead-bug", 3, 8, 10, 45, null]] },
      { weekday: 4, name: "Full Body C", focus: "Conditioning", warmup: "Brisk walk 3 min, deep squat hold 30 s.", rows: [
        ["bodyweight-squat", 3, 15, 20, 60, 2], ["pike-push-up", 3, 5, 10, 75, 2], ["glute-bridge", 3, 15, 20, 45, 1], ["mountain-climber", 3, 20, 30, 45, null], ["side-plank", 2, 20, 30, 45, null]] },
    ],
  },
  // 12
  {
    slug: "resistance-band-4", name: "Resistance Band", category: "home", goal: "Strength and muscle with bands", difficulty: "beginner",
    daysPerWeek: 4, sessionMinutes: 40, equipment: ["bands"],
    description: "A complete upper/lower plan using only resistance bands and a door anchor. Bands provide increasing resistance through the range — great for joints and travel.",
    progression: "Add reps, then step further from the anchor or move to a heavier band. Pause 1 s at peak contraction to add difficulty.",
    deload: DELOAD_6,
    whoFor: ["People training at home or traveling", "Those wanting a joint-friendly option"],
    whoNotFor: ["Lifters targeting heavy barbell strength"],
    days: [
      { weekday: 0, name: "Upper A", focus: "Push / Pull", warmup: "Band pull-aparts ×15, shoulder pass-throughs ×10.", rows: [
        ["band-chest-press", 3, 12, 20, 60, 2], ["band-row", 3, 12, 20, 60, 2], ["band-overhead-press", 3, 12, 15, 60, 2], ["band-pull-apart", 3, 15, 25, 45, 1], ["band-curl", 2, 12, 20, 45, 1]] },
      { weekday: 1, name: "Lower A", focus: "Squat / Hinge", warmup: "Bodyweight squats ×15, glute bridges ×15.", rows: [
        ["band-squat", 4, 12, 20, 60, 2], ["band-good-morning", 3, 12, 20, 60, 2], ["reverse-lunge", 3, 10, 12, 60, 2], ["band-glute-bridge", 3, 15, 25, 45, 1], ["band-pallof-press", 3, 10, 15, 45, null]] },
      { weekday: 3, name: "Upper B", focus: "Pull / Push", warmup: "Band pull-aparts ×15, push-ups ×8.", rows: [
        ["band-lat-pulldown", 3, 12, 20, 60, 2], ["push-up", 3, 8, 15, 75, 2], ["band-chest-fly", 2, 12, 20, 45, 1], ["band-lateral-raise", 3, 15, 25, 45, 1], ["band-pushdown", 3, 15, 20, 45, 1]] },
      { weekday: 4, name: "Lower B", focus: "Glutes / Single-leg", warmup: "Bodyweight squats ×15, lateral walks ×10/side.", rows: [
        ["split-squat", 3, 10, 15, 60, 2], ["band-glute-bridge", 3, 15, 25, 45, 1], ["band-lateral-walk", 3, 12, 20, 45, 1], ["swiss-ball-leg-curl", 3, 10, 15, 60, 2], ["single-leg-calf-raise", 3, 12, 20, 45, 1]] },
    ],
  },
  // 13
  {
    slug: "athletic-sc-4", name: "Athletic Strength & Conditioning", category: "athletic", goal: "Strength, power and conditioning", difficulty: "intermediate",
    daysPerWeek: 4, sessionMinutes: 65, equipment: ["barbell", "dumbbells", "bench", "squat_rack", "kettlebells", "pullup_bar", "cardio"],
    description: "Combines explosive work, heavy compound strength, conditioning, mobility and core. Power exercises come first when you are fresh. This supports general athleticism — it does not replace sport-specific coaching.",
    progression: "Power work: keep reps crisp; stop sets when speed drops. Strength: add 2.5–5 kg when all sets are completed at RIR 2. Conditioning: add one interval every 1–2 weeks.",
    deload: "Every 4th week: halve power and conditioning volume, keep strength loads at ~85%.",
    whoFor: ["Recreational athletes", "People wanting to move and perform better"],
    whoNotFor: ["Anyone in-season under a coach's program", "Beginners unfamiliar with jumping and barbell lifts"],
    days: [
      { weekday: 0, name: "Lower Power + Strength", focus: "Jumps / Squat", warmup: "World's greatest stretch ×5/side, 90/90 ×6, skips 2×20 m.", rows: [
        ["box-jump", 4, 3, 5, 90, null, "Full reset between reps"], ["back-squat", 4, 4, 6, 180, 2], ["single-leg-rdl", 3, 6, 8, 90, 2], ["dead-bug", 3, 8, 10, 45, null]] },
      { weekday: 1, name: "Upper Power + Strength", focus: "Throws / Press / Pull", warmup: "Band pull-aparts ×15, thoracic open book ×8/side.", rows: [
        ["medicine-ball-slam", 4, 5, 8, 60, null], ["barbell-bench-press", 4, 4, 6, 150, 2], ["pull-up", 4, 5, 8, 120, 2], ["landmine-press", 3, 6, 8, 90, 2], ["farmer-carry", 3, 30, 40, 90, null]] },
      { weekday: 3, name: "Total Body Power", focus: "Clean / Hinge / Conditioning", warmup: "Cat-cow ×8, hip 90/90 ×6, kettlebell deadlifts ×10.", rows: [
        ["power-clean", 5, 2, 3, 150, null, "Technique first — light loads"], ["trap-bar-deadlift", 3, 4, 6, 150, 2], ["walking-lunge", 3, 8, 10, 90, 2], ["bike-intervals", 1, 8, 12, 0, null]] },
      { weekday: 5, name: "Conditioning + Core", focus: "Engine / Mobility", warmup: "5 min easy row.", rows: [
        ["kettlebell-swing", 5, 12, 15, 60, null], ["sprint-intervals", 1, 6, 8, 0, null, "10–15 s sprints"], ["hanging-knee-raise", 3, 8, 12, 60, 1], ["side-plank", 3, 30, 40, 45, null], ["worlds-greatest-stretch", 2, 5, 6, 0, null]] },
    ],
  },
  // 14
  {
    slug: "minimal-equipment-3", name: "Minimal Equipment", category: "home", goal: "Full-body fitness with minimal gear", difficulty: "beginner",
    daysPerWeek: 3, sessionMinutes: 40, equipment: ["dumbbells", "pullup_bar", "bands"],
    description: "A pair of dumbbells, a pull-up bar and a band are all you need. Three full-body sessions build strength and muscle with efficient supersets-friendly ordering.",
    progression: DOUBLE_PROG, deload: DELOAD_6,
    whoFor: ["Home trainees with a small setup", "Hotel-gym travelers"],
    whoNotFor: ["Lifters needing heavy lower-body loading"],
    days: [
      { weekday: 0, name: "Full Body A", focus: "Squat / Push / Pull", warmup: "Band pull-aparts ×15, bodyweight squats ×15.", rows: [
        ["goblet-squat", 3, 10, 15, 75, 2], ["push-up", 3, 8, 15, 75, 2], ["pull-up", 3, 4, 10, 120, 2, "Use a band for assistance if needed"], ["dumbbell-romanian-deadlift", 3, 10, 12, 75, 2], ["dead-bug", 2, 8, 10, 45, null]] },
      { weekday: 2, name: "Full Body B", focus: "Single-leg / Press / Row", warmup: "Band pull-aparts ×15, reverse lunges ×8/side.", rows: [
        ["split-squat", 3, 10, 15, 75, 2], ["floor-press-dumbbell", 3, 8, 12, 75, 2], ["band-row", 3, 12, 20, 60, 2], ["band-pull-apart", 2, 15, 20, 45, 1], ["hanging-knee-raise", 3, 8, 12, 60, 1]] },
      { weekday: 4, name: "Full Body C", focus: "Hinge / Shoulders / Arms", warmup: "Cat-cow ×8, glute bridges ×12.", rows: [
        ["glute-bridge", 3, 12, 20, 75, 2], ["band-overhead-press", 3, 12, 15, 60, 2], ["chin-up", 3, 4, 10, 120, 2], ["walking-lunge", 2, 10, 12, 75, 2], ["hammer-curl", 2, 10, 15, 45, 1]] },
    ],
  },
  // Extra strength specializations required by spec (bench/squat/deadlift focus).
  {
    slug: "bench-specialization-4", name: "Bench Press Specialization", category: "strength", goal: "Bench press strength", difficulty: "intermediate",
    daysPerWeek: 4, sessionMinutes: 60, equipment: ["barbell", "dumbbells", "bench", "squat_rack", "cable"],
    description: "Benching three times per week with heavy, volume and technique days, while lower-body training is kept at maintenance. Built for an 8-week bench push.",
    progression: "Heavy day: +2.5 kg per week on top sets. Volume day: add a rep per set until top of range, then +2.5 kg. Technique day stays light and crisp.",
    deload: "Week 5 and after week 8: reduce bench volume by half at ~85% load.",
    whoFor: ["Intermediate lifters wanting a bigger bench"], whoNotFor: ["Lifters with shoulder pain when pressing"],
    days: [
      { weekday: 0, name: "Heavy Bench", focus: "Bench / Back", warmup: WU_UPPER, rows: [
        ["barbell-bench-press", 5, 3, 5, 210, 2], ["barbell-row", 4, 6, 8, 120, 2], ["close-grip-bench-press", 3, 6, 8, 120, 2], ["face-pull", 3, 12, 15, 60, 1]] },
      { weekday: 1, name: "Lower Maintenance", focus: "Squat / Hinge", warmup: WU_LOWER, rows: [
        ["back-squat", 3, 5, 6, 180, 2], ["romanian-deadlift", 3, 6, 8, 150, 2], ["plank", 3, 30, 45, 45, null]] },
      { weekday: 3, name: "Volume Bench", focus: "Bench / Shoulders", warmup: WU_UPPER, rows: [
        ["barbell-bench-press", 4, 6, 8, 150, 2], ["dumbbell-shoulder-press", 3, 8, 10, 90, 2], ["lat-pulldown", 3, 8, 12, 90, 2], ["triceps-pushdown", 3, 10, 12, 60, 1]] },
      { weekday: 5, name: "Technique Bench", focus: "Speed / Triceps", warmup: WU_UPPER, rows: [
        ["barbell-bench-press", 6, 3, 3, 90, 4, "~65% of heavy-day load, fast and crisp"], ["incline-dumbbell-press", 3, 8, 10, 90, 2], ["skull-crusher", 3, 8, 12, 75, 1], ["dumbbell-row", 3, 8, 10, 75, 2]] },
    ],
  },
  {
    slug: "squat-specialization-4", name: "Squat Specialization", category: "strength", goal: "Squat strength", difficulty: "intermediate",
    daysPerWeek: 4, sessionMinutes: 65, equipment: ["barbell", "dumbbells", "bench", "squat_rack", "machines", "cable", "pullup_bar"],
    description: "Squatting three times a week with a heavy, a volume and a front-squat day. Upper-body work is kept efficient so recovery goes to the legs.",
    progression: "Heavy day: +5 kg per week while RIR ≥1. Volume day: double progression. Front squat: +2.5 kg when all reps are clean.",
    deload: "Every 4th week: 2 fewer squat sets at ~85% load.",
    whoFor: ["Intermediate lifters wanting a stronger squat"], whoNotFor: ["People with knee or back pain while squatting"],
    days: [
      { weekday: 0, name: "Heavy Squat", focus: "Squat", warmup: WU_LOWER, rows: [
        ["back-squat", 5, 3, 5, 210, 2], ["romanian-deadlift", 3, 6, 8, 150, 2], ["leg-extension", 2, 10, 15, 60, 1], ["plank", 3, 30, 45, 45, null]] },
      { weekday: 1, name: "Upper", focus: "Press / Pull", warmup: WU_UPPER, rows: [
        ["barbell-bench-press", 4, 5, 8, 150, 2], ["pull-up", 4, 6, 10, 120, 2], ["dumbbell-shoulder-press", 3, 8, 10, 90, 2]] },
      { weekday: 3, name: "Volume Squat", focus: "Squat / Single-leg", warmup: WU_LOWER, rows: [
        ["back-squat", 4, 6, 8, 180, 2], ["bulgarian-split-squat", 3, 8, 10, 90, 2], ["lying-leg-curl", 3, 10, 12, 60, 1], ["standing-calf-raise", 3, 10, 15, 60, 1]] },
      { weekday: 5, name: "Front Squat + Upper", focus: "Front squat / Back", warmup: WU_LOWER, rows: [
        ["front-squat", 4, 4, 6, 180, 2], ["barbell-row", 3, 6, 10, 120, 2], ["incline-dumbbell-press", 3, 8, 12, 90, 2], ["hanging-knee-raise", 3, 8, 12, 60, 1]] },
    ],
  },
  {
    slug: "deadlift-specialization-4", name: "Deadlift Specialization", category: "strength", goal: "Deadlift strength", difficulty: "advanced",
    daysPerWeek: 4, sessionMinutes: 65, equipment: ["barbell", "dumbbells", "bench", "squat_rack", "cable", "pullup_bar", "machines"],
    description: "One heavy deadlift day, one variation day and plenty of posterior-chain and upper-back accessories. Deadlifts are taxing — volume is intentionally lower than for squat or bench.",
    progression: "Heavy day: +5 kg per week while bar speed stays good. Variation day: double progression. Stop the top set if form breaks down.",
    deload: "Every 4th week: deadlift at 80% for 2 sets.",
    whoFor: ["Experienced lifters with solid hinge technique"], whoNotFor: ["Anyone with a history of lower-back injury without clearance", "Beginners"],
    days: [
      { weekday: 0, name: "Heavy Deadlift", focus: "Deadlift", warmup: WU_LOWER, rows: [
        ["deadlift", 5, 2, 4, 240, 2], ["front-squat", 3, 5, 6, 150, 2], ["hanging-knee-raise", 3, 8, 12, 60, 1]] },
      { weekday: 1, name: "Upper Pull", focus: "Back / Grip", warmup: WU_UPPER, rows: [
        ["barbell-row", 4, 6, 8, 120, 2], ["pull-up", 4, 6, 10, 120, 2], ["barbell-bench-press", 3, 6, 8, 150, 2], ["farmer-carry", 3, 30, 45, 90, null]] },
      { weekday: 3, name: "Deadlift Variation", focus: "RDL / Posterior chain", warmup: WU_LOWER, rows: [
        ["romanian-deadlift", 4, 6, 8, 150, 2], ["good-morning", 3, 8, 10, 120, 3], ["lying-leg-curl", 3, 10, 12, 60, 1], ["back-extension", 3, 10, 15, 60, 1]] },
      { weekday: 5, name: "Upper Push + Squat", focus: "Press / Squat", warmup: WU_UPPER, rows: [
        ["overhead-press", 4, 5, 8, 150, 2], ["back-squat", 3, 6, 8, 150, 3], ["chest-supported-row", 3, 8, 12, 90, 1], ["pallof-press", 3, 10, 12, 45, null]] },
    ],
  },
  {
    slug: "fat-loss-full-body-3", name: "Full Body + Conditioning", category: "fat_loss", goal: "Preserve muscle while losing fat", difficulty: "beginner",
    daysPerWeek: 3, sessionMinutes: 50, equipment: [...GYM, "cardio", "kettlebells"],
    description: "Three full-body strength sessions each finished with a short conditioning block. Efficient for people in a moderate calorie deficit.",
    progression: "Maintain or slowly increase loads; holding strength in a deficit is a success. Add a conditioning round every 2 weeks.",
    deload: DELOAD_6,
    whoFor: ["Beginners and intermediates in a moderate deficit"], whoNotFor: ["People on very aggressive diets"],
    days: [
      { weekday: 0, name: "Full Body A", focus: "Squat / Push / Pull", warmup: WU_LOWER, rows: [
        ["goblet-squat", 3, 8, 12, 90, 2], ["dumbbell-bench-press", 3, 8, 12, 90, 2], ["lat-pulldown", 3, 10, 12, 90, 2], ["kettlebell-swing", 4, 12, 15, 45, null], ["rowing-machine", 1, 8, 10, 0, null]] },
      { weekday: 2, name: "Full Body B", focus: "Hinge / Press / Row", warmup: WU_LOWER, rows: [
        ["dumbbell-romanian-deadlift", 3, 8, 12, 90, 2], ["dumbbell-shoulder-press", 3, 8, 12, 90, 2], ["seated-cable-row", 3, 10, 12, 90, 2], ["walking-lunge", 2, 10, 12, 75, 2], ["bike-intervals", 1, 8, 10, 0, null]] },
      { weekday: 4, name: "Full Body C", focus: "Legs / Upper / Core", warmup: WU_LOWER, rows: [
        ["leg-press", 3, 10, 15, 90, 2], ["machine-chest-press", 3, 10, 12, 90, 2], ["chest-supported-row", 3, 10, 12, 90, 2], ["mountain-climber", 3, 20, 30, 45, null], ["treadmill-incline-walk", 1, 15, 20, 0, null]] },
    ],
  },
  {
    slug: "hybrid-5", name: "5-Day Hybrid", category: "fat_loss", goal: "Fat loss with strength and fitness", difficulty: "intermediate",
    daysPerWeek: 5, sessionMinutes: 55, equipment: [...GYM, "cardio", "kettlebells"],
    description: "Three resistance sessions and two dedicated conditioning days. Balanced for people who want to see both strength and cardiovascular fitness improve while leaning out.",
    progression: "Strength days: double progression. Conditioning days: add 1–2 minutes or one interval per week.",
    deload: DELOAD_6,
    whoFor: ["People who enjoy both lifting and cardio"], whoNotFor: ["Those who can only train 3 days"],
    days: [
      { weekday: 0, name: "Upper Strength", focus: "Push / Pull", warmup: WU_UPPER, rows: [
        ["barbell-bench-press", 3, 6, 8, 150, 2], ["pull-up", 3, 6, 10, 120, 2], ["dumbbell-shoulder-press", 3, 8, 10, 90, 2], ["seated-cable-row", 3, 10, 12, 90, 1]] },
      { weekday: 1, name: "Conditioning", focus: "Intervals", warmup: "5 min easy cardio.", rows: [
        ["bike-intervals", 1, 10, 12, 0, null], ["kettlebell-swing", 4, 15, 15, 45, null], ["plank", 3, 30, 45, 45, null]] },
      { weekday: 2, name: "Lower Strength", focus: "Squat / Hinge", warmup: WU_LOWER, rows: [
        ["back-squat", 3, 6, 8, 150, 2], ["romanian-deadlift", 3, 8, 10, 120, 2], ["walking-lunge", 2, 10, 12, 90, 2], ["lying-leg-curl", 2, 10, 15, 60, 1]] },
      { weekday: 4, name: "Full Body Hypertrophy", focus: "Mixed", warmup: WU_GENERAL, rows: [
        ["incline-dumbbell-press", 3, 10, 12, 90, 1], ["lat-pulldown", 3, 10, 12, 90, 1], ["hip-thrust", 3, 10, 12, 90, 2], ["lateral-raise", 3, 12, 20, 60, 1], ["triceps-pushdown", 2, 12, 15, 60, 1], ["dumbbell-curl", 2, 12, 15, 60, 1]] },
      { weekday: 5, name: "Steady Cardio", focus: "Aerobic base", warmup: "Start easy and build.", rows: [
        ["treadmill-incline-walk", 1, 30, 40, 0, null], ["dead-bug", 3, 8, 10, 45, null], ["worlds-greatest-stretch", 2, 5, 6, 0, null]] },
    ],
  },
];
