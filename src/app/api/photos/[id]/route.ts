import { NextResponse, type NextRequest } from "next/server";
import { getApiUser } from "@/lib/server/auth";
import { getPhotoFile } from "@/lib/server/services/progress";
import { readStored } from "@/lib/server/storage";

// Photos are only ever served to their owner, never cached by shared caches.
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser();
  if (!user) return new NextResponse(null, { status: 401 });
  try {
    const photo = await getPhotoFile(user.id, (await params).id);
    const buf = await readStored(photo.storageKey);
    return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": photo.mimeType, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline" } });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
