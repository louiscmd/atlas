import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { env, features } from "@/lib/server/env";
import { randomToken } from "@/lib/server/crypto";

export async function GET() {
  if (!features.google) return NextResponse.redirect(new URL("/login?error=oauth", env.appUrl));
  const state = randomToken(16);
  (await cookies()).set("oauth_state", state, { httpOnly: true, secure: env.isProd, sameSite: "lax", path: "/", maxAge: 600 });
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({ client_id: env.googleClientId!, redirect_uri: `${env.appUrl}/api/auth/google/callback`, response_type: "code", scope: "openid email", state, prompt: "select_account" }).toString();
  return NextResponse.redirect(url);
}
