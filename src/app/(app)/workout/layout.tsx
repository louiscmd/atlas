import { SubNav } from "@/components/app/Nav";
export default function WorkoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SubNav items={[{ href: "/workout", label: "Today", exact: true }, { href: "/workout/plan", label: "My Plan" }, { href: "/workout/exercises", label: "Exercise Vault" }, { href: "/workout/programs", label: "Programs" }, { href: "/workout/history", label: "History" }]} />
      {children}
    </>
  );
}
