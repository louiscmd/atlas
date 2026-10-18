import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/server/db";
import { env, features } from "@/lib/server/env";
import { createSession } from "@/lib/server/auth";
import { safeEqual } from "@/lib/server/crypto";
import { track } from "@/lib/server/analytics";

const fail = () => NextResponse.redirect(new URL("/login?error=oauth", env.appUrl));

export async function GET(req: NextRequest) {
  if (!features.google) return fail();
  const jar = await cookies();
  const expected = jar.get("oauth_state")?.value;
  jar.delete("oauth_state");
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state") ?? "";
  if (!code || !expected || !safeEqual(state, expected)) return fail();
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: env.googleClientId!, client_secret: env.googleClientSecret!, redirect_uri: `${env.appUrl}/api/auth/google/callback`, grant_type: "authorization_code" }),
    });
    if (!tokenRes.ok) return fail();
    const { access_token } = (await tokenRes.json()) as { access_token: string };
    const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${access_token}` } });
    const info = (await infoRes.json()) as { sub: string; email?: string; email_verified?: boolean };
    if (!info.sub || !info.email || !info.email_verified) return fail();
    const email = info.email.toLowerCase();
    let account = await db.account.findUnique({ where: { provider_providerAccountId: { provider: "google", providerAccountId: info.sub } } });
    let isNew = false;
    if (!account) {
      const user = (await db.user.findUnique({ where: { email } })) ?? (isNew = true, await db.user.create({ data: { email, emailVerifiedAt: new Date() } }));
      account = await db.account.create({ data: { userId: user.id, provider: "google", providerAccountId: info.sub } });
    }
    await createSession(account.userId);
    if (isNew) await track(account.userId, "account_created", { source: "google" });
    const profile = await db.userProfile.findUnique({ where: { userId: account.userId } });
    return NextResponse.redirect(new URL(profile?.onboardingCompletedAt ? "/home" : "/onboarding", env.appUrl));
  } catch {
    return fail();
  }
}
