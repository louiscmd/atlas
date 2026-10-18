import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { getApiUser } from "@/lib/server/auth";
import { rateLimit, LIMITS } from "@/lib/server/rateLimit";
import { readUploadedImage } from "@/lib/server/storage";
import { addPhoto } from "@/lib/server/services/progress";

export async function POST(req: NextRequest) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  if (!rateLimit(`upload:${user.id}`, ...LIMITS.upload).ok) return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "We couldn't read that upload." }, { status: 400 });
  const img = await readUploadedImage(form.get("image") as File | null);
  if ("error" in img) return NextResponse.json({ error: img.error }, { status: 400 });
  try {
    const photo = await addPhoto(user.id, img.buf, img.type, String(form.get("pose") ?? "front"), String(form.get("note") ?? "") || null);
    revalidatePath("/progress/photos");
    return NextResponse.json({ id: photo.id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error && e.message.length < 80 ? e.message : "We couldn't save that photo." }, { status: 400 });
  }
}
