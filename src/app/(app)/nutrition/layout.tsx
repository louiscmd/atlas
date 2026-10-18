import { SubNav } from "@/components/app/Nav";
export default function NutritionLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SubNav items={[{ href: "/nutrition", label: "Today", exact: true }, { href: "/nutrition/scan", label: "Food Scanner" }, { href: "/nutrition/add", label: "Add Food" }, { href: "/nutrition/meals", label: "Meals" }, { href: "/nutrition/assistant", label: "Assistant" }, { href: "/nutrition/history", label: "History" }]} />
      {children}
    </>
  );
}
