"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod/v4";
import { db } from "@/lib/server/db";
import { consumeAuthToken, createSession, destroySession, hashPassword, issueAuthToken, requireUser, verifyPassword } from "@/lib/server/auth";
import { sendMail } from "@/lib/server/mailer";
import { env } from "@/lib/server/env";
import { rateLimit, LIMITS } from "@/lib/server/rateLimit";
import { track } from "@/lib/server/analytics";

export type AuthState = { error?: string; fieldErrors?: Record<string, string>; message?: string; devLink?: string } | undefined;

const Email = z.email("Enter a valid email address").transform((s) => s.trim().toLowerCase());
const Password = z.string().min(8, "Use at least 8 characters").max(128).refine((p) => /[a-zA-Z]/.test(p) && /\d/.test(p), "Include at least one letter and one number");

async function clientKey() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}
async function limited(bucket: string) {
  const r = rateLimit(`${bucket}:${await clientKey()}`, ...LIMITS.auth);
  return r.ok ? null : `Too many attempts. Try again in ${Math.ceil(r.retryAfterSec / 60)} min.`;
}

async function sendVerification(userId: string, email: string) {
  const token = await issueAuthToken(userId, "verify_email", 60 * 24);
  const link = `${env.appUrl}/verify-email?token=${token}`;
  await sendMail(email, "Verify your email", `Welcome to Forma! Confirm your email: ${link}`);
  return env.isProd ? undefined : link;
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const lim = await limited("signup");
  if (lim) return { error: lim };
  const parsed = z.object({ email: Email, password: Password, terms: z.literal("on", "Please accept the terms to continue") }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  const { email, password } = parsed.data;
  const exists = await db.user.findUnique({ where: { email } });
  if (exists) return { fieldErrors: { email: "An account with this email already exists. Try logging in." } };
  const user = await db.user.create({ data: { email, passwordHash: await hashPassword(password) } });
  await sendVerification(user.id, email);
  await createSession(user.id);
  await track(user.id, "account_created", { source: "email" });
  redirect("/onboarding");
}

export async function logIn(_: AuthState, form: FormData): Promise<AuthState> {
  const lim = await limited("login");
  if (lim) return { error: lim };
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const user = await db.user.findUnique({ where: { email }, include: { profile: { select: { onboardingCompletedAt: true } } } });
  if (!(await verifyPassword(password, user?.passwordHash ?? null)) || !user) return { error: "That email and password don't match. Try again or reset your password." };
  await createSession(user.id);
  const next = String(form.get("next") ?? "");
  redirect(!user.profile?.onboardingCompletedAt ? "/onboarding" : next.startsWith("/") && !next.startsWith("//") ? next : "/home");
}

export async function logOut() {
  await destroySession();
  redirect("/login");
}

export async function requestPasswordReset(_: AuthState, form: FormData): Promise<AuthState> {
  const lim = await limited("reset");
  if (lim) return { error: lim };
  const parsed = Email.safeParse(form.get("email"));
  if (!parsed.success) return { fieldErrors: { email: "Enter a valid email address" } };
  const user = await db.user.findUnique({ where: { email: parsed.data } });
  let devLink: string | undefined;
  if (user) {
    const token = await issueAuthToken(user.id, "reset_password", 60);
    const link = `${env.appUrl}/reset-password?token=${token}`;
    await sendMail(user.email, "Reset your password", `Reset your Forma password (valid for 1 hour): ${link}`);
    if (!env.isProd) devLink = link;
  }
  // Same response whether or not the account exists (no account enumeration)
  return { message: "If an account exists for that email, we've sent a reset link. It expires in 1 hour.", devLink };
}

export async function resetPassword(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = z.object({ token: z.string().min(10), password: Password }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  const userId = await consumeAuthToken(parsed.data.token, "reset_password");
  if (!userId) return { error: "This reset link is invalid or has expired. Request a new one." };
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(parsed.data.password) } }),
    db.session.deleteMany({ where: { userId } }), // sign out everywhere
  ]);
  await createSession(userId);
  redirect("/home");
}

export async function resendVerification(): Promise<AuthState> {
  const user = await requireUser();
  if (user.emailVerifiedAt) return { message: "Your email is already verified." };
  const r = rateLimit(`verify:${user.id}`, 3, 3600_000);
  if (!r.ok) return { error: "You've requested several links already. Please check your inbox." };
  const devLink = await sendVerification(user.id, user.email);
  return { message: "Verification email sent.", devLink };
}
