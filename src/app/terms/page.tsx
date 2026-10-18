import Link from "next/link";
import { Logo } from "@/components/app/Logo";
export const metadata = { title: "Terms" };
export default function Terms() {
  return (
    <main id="main" className="mx-auto max-w-2xl px-5 py-10">
      <Link href="/"><Logo /></Link>
      <h1 className="t-h1 mt-8">Terms of use</h1>
      <p className="t-small mt-2 text-warning">Placeholder — have this reviewed by counsel before launch.</p>
      <p className="t-body mt-6 text-fg-2">Forma provides general fitness and nutrition information. It is not medical advice and is not a substitute for a doctor, physiotherapist, registered dietitian or qualified coach. Consult a professional before starting a new program, especially if you have an injury or medical condition. Programs are general templates, not medically or professionally certified prescriptions. Train within your abilities and stop if you feel pain.</p>
    </main>
  );
}
