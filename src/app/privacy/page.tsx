import Link from "next/link";
import { Logo } from "@/components/app/Logo";
export const metadata = { title: "Privacy policy" };
export default function Privacy() {
  const s = "t-body mt-2 text-fg-2";
  return (
    <main id="main" className="mx-auto max-w-2xl px-5 py-10">
      <Link href="/"><Logo /></Link>
      <h1 className="t-h1 mt-8">Privacy policy</h1>
      <p className="t-small mt-2 text-warning">Placeholder — have this reviewed by counsel before launch.</p>
      <h2 className="t-h3 mt-8">What we collect</h2>
      <p className={s}>Account details (email), the profile you provide (age, sex, height, weight, goals, equipment, limitations), your training logs, nutrition logs, body measurements and optional progress photos.</p>
      <h2 className="t-h3 mt-6">How we use it</h2>
      <p className={s}>Only to provide the service: building plans, tracking progress and estimating nutrition. We don't sell your data or use it for advertising.</p>
      <h2 className="t-h3 mt-6">AI processing</h2>
      <p className={s}>When you use AI features (food scanning, routine import, plan generation, the nutrition assistant, weekly reviews), the data needed for that request is sent to our AI provider. Food photos are processed in memory and not stored by us. We log request metadata (time, feature, success) — never the content.</p>
      <h2 className="t-h3 mt-6">Progress photos</h2>
      <p className={s}>Stored privately, served only to you over authenticated requests, and permanently deleted when you delete them or your account.</p>
      <h2 className="t-h3 mt-6">Analytics</h2>
      <p className={s}>Anonymous product events (e.g. “workout completed”) linked to a one-way hashed identifier. You can opt out in Profile → Privacy.</p>
      <h2 className="t-h3 mt-6">Your rights</h2>
      <p className={s}>Export all your data or permanently delete your account anytime from Profile → Privacy & data.</p>
      <h2 className="t-h3 mt-6">Not medical advice</h2>
      <p className={s}>ATLAS is not a medical device and doesn't diagnose or treat any condition. Nutrition values from photos are estimates.</p>
    </main>
  );
}
