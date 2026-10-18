import { NextResponse, type NextRequest } from "next/server";
import { getApiUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { rateLimit, LIMITS } from "@/lib/server/rateLimit";
import { readUploadedImage } from "@/lib/server/storage";
import { track } from "@/lib/server/analytics";
import { analyzeMealPhoto, readNutritionLabel, DEV_SAMPLE_LABEL, DEV_SAMPLE_SCAN } from "@/lib/ai/services/foodVision";
import { features } from "@/lib/server/env";

// Images are analyzed in memory and never written to disk or logs.
const MESSAGES: Record<string, string> = {
  not_configured: "The AI food scanner isn't set up on this server yet. You can still add your meal manually.",
  invalid_output: "We couldn't analyze that image. Try taking another photo with better lighting.",
  refused: "We couldn't analyze that image. Try a clearer photo of just the food.",
  rate_limited: "The scanner is busy right now. Please try again in a minute.",
  unavailable: "We couldn't reach the scanner. Check your connection and try again.",
};

export async function POST(req: NextRequest) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  const rl = rateLimit(`vision:${user.id}`, ...LIMITS.aiVision);
  if (!rl.ok) return NextResponse.json({ error: "You've scanned a lot recently. Try again in a little while." }, { status: 429 });

  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: "We couldn't read that upload. Please try again." }, { status: 400 }); }
  const kind = form.get("kind") === "label" ? "label" : "photo";
  const img = await readUploadedImage(form.get("image") as File | null);
  if ("error" in img) return NextResponse.json({ error: img.error }, { status: 400 });

  if (kind === "label") {
    const res = features.visionDevSample ? { ok: true as const, data: DEV_SAMPLE_LABEL, requestId: null } : await readNutritionLabel(user.id, img.buf, img.type);
    if (!res.ok) return NextResponse.json({ error: MESSAGES[res.code], code: res.code }, { status: res.code === "not_configured" ? 503 : 422 });
    if (!res.data.isLabel) return NextResponse.json({ error: "We couldn't find a nutrition label in that photo. Make sure the whole panel is visible and in focus.", code: "not_label" }, { status: 422 });
    const scan = await db.foodScan.create({ data: { userId: user.id, kind: "label", status: "completed", title: res.data.productName, confidence: res.data.confidence, label: res.data, aiRequestId: res.requestId } });
    await track(user.id, "food_scanned", { kind: "label", confidence: res.data.confidence });
    return NextResponse.json({ scanId: scan.id, label: res.data, devSample: features.visionDevSample });
  }

  const hint = String(form.get("hint") ?? "").slice(0, 200);
  const res = features.visionDevSample ? { ok: true as const, data: DEV_SAMPLE_SCAN, requestId: null } : await analyzeMealPhoto(user.id, img.buf, img.type, hint || undefined);
  if (!res.ok) return NextResponse.json({ error: MESSAGES[res.code], code: res.code }, { status: res.code === "not_configured" ? 503 : 422 });
  if (!res.data.isFood || !res.data.items.length) return NextResponse.json({ error: "We couldn't spot any food in that photo. Try again with the plate centered and well lit.", code: "not_food" }, { status: 422 });
  const scan = await db.foodScan.create({
    data: { userId: user.id, kind: "photo", status: "completed", title: res.data.title, confidence: res.data.confidence, notes: res.data.notes, aiRequestId: res.requestId,
      items: { create: res.data.items.map((it, order) => ({ order, ...it })) } },
  });
  await track(user.id, "food_scanned", { kind: "photo", confidence: res.data.confidence });
  return NextResponse.json({ scanId: scan.id, result: res.data, devSample: features.visionDevSample });
}
