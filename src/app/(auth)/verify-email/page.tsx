import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { db } from "@/lib/server/db";
import { consumeAuthToken } from "@/lib/server/auth";
import { ButtonLink } from "@/components/ui/Button";
export const metadata = { title: "Verify email" };
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const userId = token ? await consumeAuthToken(token, "verify_email") : null;
  if (userId) await db.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  return (
    <div className="text-center">
      {userId ? <CheckCircle2 className="mx-auto mb-4 size-12 text-success" /> : <XCircle className="mx-auto mb-4 size-12 text-danger" />}
      <h1 className="t-h1">{userId ? "Email verified" : "Link invalid or expired"}</h1>
      <p className="t-body mb-8 mt-2 text-fg-2">{userId ? "Thanks — your account is confirmed." : "Request a new verification link from your profile."}</p>
      <ButtonLink href="/home" size="lg">Continue</ButtonLink>
      <p className="t-small mt-4"><Link href="/profile" className="text-fg-2">Go to profile</Link></p>
    </div>
  );
}
