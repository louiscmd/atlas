import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/server/auth";
import { exportUserData } from "@/lib/server/services/profile";
import { rateLimit } from "@/lib/server/rateLimit";

export async function GET() {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  if (!rateLimit(`export:${user.id}`, 5, 3600_000).ok) return NextResponse.json({ error: "Try again later." }, { status: 429 });
  const data = await exportUserData(user.id);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="forma-export-${new Date().toISOString().slice(0, 10)}.json"`, "Cache-Control": "no-store" },
  });
}
