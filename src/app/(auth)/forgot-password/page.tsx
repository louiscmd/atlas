import Link from "next/link";
import { ForgotForm } from "../forms";
export const metadata = { title: "Forgot password" };
export default function Page() {
  return (
    <>
      <h1 className="t-h1">Reset your password</h1>
      <p className="t-body mb-8 mt-2 text-fg-2">Enter your email and we'll send you a reset link.</p>
      <ForgotForm />
      <p className="t-small mt-6 text-center text-fg-2"><Link href="/login" className="font-semibold text-fg">Back to log in</Link></p>
    </>
  );
}
