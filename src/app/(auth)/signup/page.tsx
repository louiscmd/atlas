import Link from "next/link";
import { SignUpForm } from "../forms";
import { OrDivider, SocialButtons } from "../SocialButtons";
export const metadata = { title: "Create account" };
export default function Page() {
  return (
    <>
      <h1 className="t-h1">Create your account</h1>
      <p className="t-body mb-8 mt-2 text-fg-2">Two minutes to a plan built around you.</p>
      <SocialButtons />
      <OrDivider />
      <SignUpForm />
      <p className="t-small mt-6 text-center text-fg-2">Already have an account? <Link href="/login" className="font-semibold text-fg">Log in</Link></p>
    </>
  );
}
