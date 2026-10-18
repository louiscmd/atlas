import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { EXERCISES } from "./seed/exercises";
import { PROGRAMS } from "./seed/programs";
import { FOODS } from "./seed/foods";

const prisma = new PrismaClient();

function validate() {
  const slugs = new Set(EXERCISES.map((e) => e.slug));
  const bySlug = new Map(EXERCISES.map((e) => [e.slug, e]));
  const errors: string[] = [];
  if (slugs.size !== EXERCISES.length) errors.push("Duplicate exercise slugs");
  for (const ex of EXERCISES) {
    for (const alt of ex.alternatives) if (!slugs.has(alt)) errors.push(`${ex.slug}: unknown alternative ${alt}`);
    if (ex.reps[0] > ex.reps[1]) errors.push(`${ex.slug}: rep range inverted`);
  }
  for (const p of PROGRAMS) {
    const allowed = new Set([...p.equipment, "bodyweight"]);
    if (p.days.length !== p.daysPerWeek) errors.push(`${p.slug}: ${p.days.length} days but daysPerWeek=${p.daysPerWeek}`);
    for (const d of p.days) {
      if (d.rows.length < 3) errors.push(`${p.slug}/${d.name}: too few exercises`);
      for (const [slug, sets, lo, hi] of d.rows) {
        const ex = bySlug.get(slug);
        if (!ex) { errors.push(`${p.slug}/${d.name}: unknown exercise ${slug}`); continue; }
        const missing = ex.equipment.filter((q) => !allowed.has(q));
        if (missing.length) errors.push(`${p.slug}/${d.name}: ${slug} needs ${missing.join(",")}`);
        if (sets < 1 || sets > 6 || lo > hi) errors.push(`${p.slug}/${d.name}: ${slug} bad prescription`);
      }
    }
  }
  if (errors.length) {
    console.error("Seed validation failed:\n" + errors.map((e) => " - " + e).join("\n"));
    process.exit(1);
  }
}

async function main() {
  validate();

  // Exercises (upsert by slug so ids stay stable across reseeds)
  for (const ex of EXERCISES) {
    const data = {
      name: ex.name, category: ex.category, primaryMuscles: ex.primary, secondaryMuscles: ex.secondary,
      equipment: ex.equipment, difficulty: ex.difficulty, movementType: ex.type, movementPattern: ex.pattern,
      instructions: ex.instructions, commonMistakes: ex.mistakes, tips: ex.tips,
      repMin: ex.reps[0], repMax: ex.reps[1], restSec: ex.rest, isTimed: !!ex.timed,
    };
    await prisma.exercise.upsert({ where: { slug: ex.slug }, create: { slug: ex.slug, ...data }, update: data });
  }
  const idBySlug = new Map((await prisma.exercise.findMany({ select: { id: true, slug: true } })).map((e) => [e.slug, e.id]));

  await prisma.exerciseAlternative.deleteMany({});
  await prisma.exerciseAlternative.createMany({
    data: EXERCISES.flatMap((ex) => ex.alternatives.map((alt, rank) => ({ exerciseId: idBySlug.get(ex.slug)!, alternativeId: idBySlug.get(alt)!, rank }))),
  });

  // Curated videos
  const videos = JSON.parse(readFileSync(join(__dirname, "seed/videos.json"), "utf8")).videos as Record<string, { youtubeId: string; title: string; channel: string }>;
  for (const [slug, v] of Object.entries(videos)) {
    const exerciseId = idBySlug.get(slug);
    if (!exerciseId || !/^[\w-]{11}$/.test(v.youtubeId)) { console.warn(`Skipping video for ${slug}`); continue; }
    await prisma.exerciseVideo.deleteMany({ where: { exerciseId } });
    await prisma.exerciseVideo.create({ data: { exerciseId, youtubeId: v.youtubeId, title: v.title, channel: v.channel, thumbnailUrl: `https://i.ytimg.com/vi/${v.youtubeId}/hqdefault.jpg` } });
  }

  // Program templates (recreated; user plans are independent copies)
  for (const p of PROGRAMS) {
    const data = {
      name: p.name, category: p.category, goal: p.goal, difficulty: p.difficulty, daysPerWeek: p.daysPerWeek,
      sessionMinutes: p.sessionMinutes, equipment: p.equipment, description: p.description, progression: p.progression,
      deload: p.deload, whoFor: p.whoFor, whoNotFor: p.whoNotFor, featured: !!p.featured,
    };
    const tpl = await prisma.programTemplate.upsert({ where: { slug: p.slug }, create: { slug: p.slug, ...data }, update: data });
    await prisma.programDay.deleteMany({ where: { programId: tpl.id } });
    for (const [i, d] of p.days.entries()) {
      await prisma.programDay.create({
        data: {
          programId: tpl.id, order: i, weekday: d.weekday, name: d.name, focus: d.focus, warmup: d.warmup,
          exercises: { create: d.rows.map(([slug, sets, repMin, repMax, restSec, rir, notes], order) => ({ exerciseId: idBySlug.get(slug)!, order, sets, repMin, repMax, restSec, rir, notes })) },
        },
      });
    }
  }

  // Foods (global, create missing)
  const existing = new Set((await prisma.food.findMany({ where: { userId: null }, select: { name: true } })).map((f) => f.name));
  for (const [name, servingSize, servingUnit, servingLabel, grams, calories, protein, carbs, fat, fiber, sugar, sodiumMg, satFat] of FOODS) {
    if (existing.has(name)) continue;
    await prisma.food.create({
      data: { name, servingSize, servingUnit, servingLabel, gramsPerServing: grams, source: "database", verified: true,
        nutrition: { create: { calories, protein, carbs, fat, fiber, sugar, sodiumMg, satFat } } },
    });
  }

  console.log(`Seeded ${EXERCISES.length} exercises, ${PROGRAMS.length} programs, ${FOODS.length} foods.`);
}

main().finally(() => prisma.$disconnect());
