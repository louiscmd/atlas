import { SubNav } from "@/components/app/Nav";
export default function ProgressLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SubNav items={[{ href: "/progress", label: "Overview", exact: true }, { href: "/progress/weight", label: "Weight" }, { href: "/progress/measurements", label: "Measurements" }, { href: "/progress/strength", label: "Strength" }, { href: "/progress/photos", label: "Photos" }, { href: "/progress/reports", label: "Reports" }]} />
      {children}
    </>
  );
}
