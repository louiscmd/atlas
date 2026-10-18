import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { env } from "./env";
import { hashToken, randomToken } from "./crypto";

const COOKIE = "forma_session";
const SESSION_DAYS = 30;

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 12);
}
export async function verifyPassword(pw: string, hash: string | null) {
  if (!hash) {
    await bcrypt.hash(pw, 12); // equalize timing for unknown users
    return false;
  }
  return bcrypt.compare(pw, hash);
}

export async function createSession(userId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await db.session.create({ data: { userId, tokenHash: hashToken(token), expiresAt } });
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: env.isProd, sameSite: "lax", path: "/", expires: expiresAt });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(COOKIE);
}

export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, email: true, emailVerifiedAt: true, role: true, profile: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** For pages/actions: guarantees an authenticated user (server-side authorization). */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Authenticated AND onboarded — the default for app pages. */
export async function requireOnboardedUser() {
  const user = await requireUser();
  if (!user.profile?.onboardingCompletedAt) redirect("/onboarding");
  return user;
}

/** For route handlers: returns null instead of redirecting. */
export async function getApiUser() {
  return getCurrentUser();
}

export async function issueAuthToken(userId: string, type: "verify_email" | "reset_password", ttlMinutes: number) {
  const token = randomToken();
  await db.authToken.deleteMany({ where: { userId, type, usedAt: null } });
  await db.authToken.create({ data: { userId, type, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + ttlMinutes * 60_000) } });
  return token;
}

export async function consumeAuthToken(token: string, type: "verify_email" | "reset_password") {
  const rec = await db.authToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!rec || rec.type !== type || rec.usedAt || rec.expiresAt < new Date()) return null;
  await db.authToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } });
  return rec.userId;
}
