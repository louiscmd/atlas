// Deterministic workout-text parser. Handles structured input ("Bench Press — 3 × 8")
// and common shorthand ("bench 3x8, incline dumbbells 3x10"). The AI parser is used
// for messier natural language; both produce ParsedWorkout and both need user review.
import type { ParsedWorkout } from "@/lib/domain/schemas";

export type MatchableExercise = { id: string; name: string; slug: string };

const DAY_NAMES: [RegExp, number][] = [
  [/\bmon(day)?\b/i, 0], [/\btue(s|sday)?\b/i, 1], [/\bwed(nesday)?\b/i, 2], [/\bthu(r|rs|rsday)?\b/i, 3],
  [/\bfri(day)?\b/i, 4], [/\bsat(urday)?\b/i, 5], [/\bsun(day)?\b/i, 6],
];

// Shorthand → library slug. Checked before fuzzy matching.
const ALIASES: [RegExp, string][] = [
  [/\bincline\b.*\b(db|dumbbells?)\b|\b(db|dumbbells?)\b.*\bincline\b/, "incline-dumbbell-press"],
  [/\bincline\b.*\b(bench|press|bb|barbell)\b/, "incline-barbell-bench-press"],
  [/\b(db|dumbbells?)\b.*\b(bench|press)\b.*\b(shoulder|overhead|ohp)\b|\b(db|dumbbells?)\b.*\b(shoulder|ohp)\b/, "dumbbell-shoulder-press"],
  [/\b(db|dumbbells?)\b.*\bbench\b|\b(db|dumbbells?) press\b/, "dumbbell-bench-press"],
  [/\bclose[- ]?grip\b/, "close-grip-bench-press"],
  [/\bbench( press)?\b/, "barbell-bench-press"],
  [/\b(ohp|overhead press|military press|shoulder press)\b/, "overhead-press"],
  [/\b(lateral|side) raises?\b|\blaterals\b/, "lateral-raise"],
  [/\brear delts?\b|\breverse fly/, "rear-delt-fly"],
  [/\bface ?pulls?\b/, "face-pull"],
  [/\b(lat )?pull ?downs?\b/, "lat-pulldown"],
  [/\bchin[- ]?ups?\b/, "chin-up"],
  [/\bpull[- ]?ups?\b/, "pull-up"],
  [/\b(cable|seated) rows?\b/, "seated-cable-row"],
  [/\b(db|dumbbell|one[- ]arm) rows?\b/, "dumbbell-row"],
  [/\b(bb |barbell |bent[- ]over )?rows?\b/, "barbell-row"],
  [/\b(rdl|romanian)\b/, "romanian-deadlift"],
  [/\btrap[- ]?bar\b/, "trap-bar-deadlift"],
  [/\bdead ?lifts?\b|\bdl\b/, "deadlift"],
  [/\bfront squats?\b/, "front-squat"],
  [/\bgoblet\b/, "goblet-squat"],
  [/\bhack squats?\b/, "hack-squat"],
  [/\b(bulgarian|bss|rfess)\b/, "bulgarian-split-squat"],
  [/\bsquats?\b/, "back-squat"],
  [/\bleg press\b/, "leg-press"],
  [/\bleg (ext|extensions?)\b/, "leg-extension"],
  [/\bseated (leg|ham) curls?\b/, "seated-leg-curl"],
  [/\b(leg|ham(string)?) curls?\b/, "lying-leg-curl"],
  [/\blunges?\b/, "walking-lunge"],
  [/\bhip thrusts?\b/, "hip-thrust"],
  [/\bglute bridges?\b/, "glute-bridge"],
  [/\bseated calf\b/, "seated-calf-raise"],
  [/\bcalf raises?\b|\bcalves\b/, "standing-calf-raise"],
  [/\bhammer curls?\b/, "hammer-curl"],
  [/\bincline curls?\b/, "incline-dumbbell-curl"],
  [/\bcable curls?\b/, "cable-curl"],
  [/\bpreacher\b/, "preacher-curl"],
  [/\b(bb|barbell|ez) curls?\b/, "barbell-curl"],
  [/\b(bicep |biceps |db |dumbbell )?curls?\b/, "dumbbell-curl"],
  [/\b(tricep |triceps )?push ?downs?\b/, "triceps-pushdown"],
  [/\boverhead (tricep|triceps )?ext/, "overhead-cable-extension"],
  [/\bskull ?crushers?\b/, "skull-crusher"],
  [/\bdips?\b/, "dips-chest"],
  [/\b(cable )?(fly|flyes|flies|crossovers?)\b/, "cable-fly"],
  [/\bpec ?deck\b/, "pec-deck"],
  [/\bpush[- ]?ups?\b/, "push-up"],
  [/\bplanks?\b/, "plank"],
  [/\b(hanging )?(knee|leg) raises?\b/, "hanging-knee-raise"],
  [/\bcable crunch/, "cable-crunch"],
  [/\bcrunch(es)?\b/, "crunch"],
  [/\bchest press\b/, "machine-chest-press"],
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

export function matchExercise(raw: string, library: MatchableExercise[]): MatchableExercise | null {
  const text = norm(raw);
  if (!text) return null;
  const bySlug = new Map(library.map((e) => [e.slug, e]));
  const exact = library.find((e) => norm(e.name) === text);
  if (exact) return exact;
  for (const [re, slug] of ALIASES) if (re.test(text) && bySlug.has(slug)) return bySlug.get(slug)!;
  // Token overlap fallback (Jaccard), require a decent score
  const tokens = new Set(text.split(" "));
  let best: MatchableExercise | null = null, bestScore = 0;
  for (const e of library) {
    const et = new Set(norm(e.name).split(" "));
    const inter = [...tokens].filter((t) => et.has(t)).length;
    const score = inter / new Set([...tokens, ...et]).size;
    if (score > bestScore) { bestScore = score; best = e; }
  }
  return bestScore >= 0.5 ? best : null;
}

// "3x8", "3 × 8", "3 x 8-12", "3 sets of 10", "4x6-8 @ 80kg"
const SCHEME = /(\d{1,2})\s*(?:x|×|\*|sets? of)\s*(\d{1,3})(?:\s*(?:-|–|to)\s*(\d{1,3}))?/i;
const WEIGHT = /@?\s*(\d{1,3}(?:[.,]\d{1,2})?)\s*(kg|kgs|lb|lbs)\b/i;

export function parseLine(line: string, library: MatchableExercise[]) {
  const m = line.match(SCHEME);
  if (!m) return null;
  const sets = Math.min(10, Math.max(1, parseInt(m[1])));
  const repMin = Math.max(1, parseInt(m[2]));
  const repMax = m[3] ? Math.max(repMin, parseInt(m[3])) : repMin;
  const w = line.match(WEIGHT);
  let weightKg: number | null = null;
  if (w) {
    const v = parseFloat(w[1].replace(",", "."));
    weightKg = /lb/i.test(w[2]) ? Math.round(v * 0.4536 * 10) / 10 : v;
  }
  const namePart = line.slice(0, m.index).replace(/[—–\-:,•*]+\s*$/g, "").replace(/^[\s•*\-\d.)]+/, "").trim();
  const match = matchExercise(namePart, library);
  return {
    rawText: line.trim().slice(0, 200),
    exerciseId: match?.id ?? null,
    name: (match?.name ?? namePart).slice(0, 100) || "Unknown exercise",
    sets, repMin, repMax: Math.min(repMax, 100), weightKg, notes: null,
  };
}

function detectDay(segment: string): { weekday: number | null; label: string | null } {
  for (const [re, idx] of DAY_NAMES) if (re.test(segment)) return { weekday: idx, label: null };
  const m = segment.match(/^\s*(day\s*\d+|[a-z ]{3,25}day)\s*[:\-—]/i);
  return { weekday: null, label: m ? m[1] : null };
}

const FOCUS_WORDS = /\b(chest|back|shoulders?|arms|legs|push|pull|upper|lower|full body|glutes|biceps|triceps)\b/gi;

export function parseWorkoutText(text: string, library: MatchableExercise[]): ParsedWorkout {
  const warnings: string[] = [];
  // Split into chunks: newlines, and commas/semicolons inside lines (natural language)
  const lines = text.replace(/\r/g, "").split(/\n|;/).flatMap((l) => (SCHEME.test(l) && (l.match(new RegExp(SCHEME, "gi"))?.length ?? 0) > 1 ? l.split(/,(?![^()]*\))/) : [l]));
  const days: ParsedWorkout["days"] = [];
  let current: ParsedWorkout["days"][number] | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const { weekday, label } = detectDay(line);
    const hasScheme = SCHEME.test(line);
    if (weekday != null || label) {
      const focus = [...new Set((line.match(FOCUS_WORDS) ?? []).map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()))].join(" / ");
      current = { weekday, name: focus || label || "Workout", exercises: [] };
      days.push(current);
      if (!hasScheme) continue;
      // "Monday chest and shoulders, bench 3x8" — parse each comma part that has a scheme
      for (const part of line.split(",").filter((p) => SCHEME.test(p))) {
        const parsed = parseLine(part.replace(/^.*?\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*\b[:\-—\s]*/i, ""), library);
        if (parsed) current.exercises.push(parsed);
      }
      continue;
    }
    if (!hasScheme) continue;
    if (!current) { current = { weekday: null, name: "Workout", exercises: [] }; days.push(current); }
    const parsed = parseLine(line, library);
    if (parsed && current.exercises.length < 20) current.exercises.push(parsed);
  }

  const nonEmpty = days.filter((d) => d.exercises.length).slice(0, 7);
  const unmatched = nonEmpty.flatMap((d) => d.exercises.filter((e) => !e.exerciseId).map((e) => e.name));
  if (unmatched.length) warnings.push(`We couldn't match: ${unmatched.slice(0, 5).join(", ")}. Pick the right exercise for each before saving.`);
  if (!nonEmpty.length) warnings.push("No exercises found. Use a format like “Bench Press — 3 × 8”, one per line.");
  return { days: nonEmpty.length ? nonEmpty : [{ weekday: null, name: "Workout", exercises: [] }], warnings };
}
