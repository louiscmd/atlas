import Link from "next/link";
import { ResetForm } from "../forms";
export const metadata = { title: "Set a new password" };
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <>
      <h1 className="t-h1">Choose a new password</h1>
      <p className="t-body mb-8 mt-2 text-fg-2">You'll be signed out of other devices.</p>
      {token ? <ResetForm token={token} /> : <p className="text-fg-2">This link is missing its token. <Link className="text-accent" href="/forgot-password">Request a new link</Link>.</p>}
    </>
  );
}
