import Link from "next/link";
import { LoginForm } from "../forms";
import { OrDivider, SocialButtons } from "../SocialButtons";
export const metadata = { title: "Log in" };
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <>
      <h1 className="t-h1">Welcome back</h1>
      <p className="t-body mb-8 mt-2 text-fg-2">Log in to see today's plan.</p>
      {sp.error === "oauth" && <p role="alert" className="t-small mb-4 rounded-xl bg-danger-soft px-4 py-3 text-danger">We couldn't sign you in with Google. Please try again.</p>}
      <SocialButtons />
      <OrDivider />
      <LoginForm next={sp.next} />
      <p className="t-small mt-6 text-center text-fg-2">New to ATLAS? <Link href="/signup" className="font-semibold text-fg">Create an account</Link></p>
    </>
  );
}
