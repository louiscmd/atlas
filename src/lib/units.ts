// Display units. Storage is always metric (kg, cm, ml).
export type UnitSystem = "metric" | "imperial";
export const KG_PER_LB = 0.45359237;
export const toDisplayWeight = (kg: number, u: UnitSystem) => (u === "imperial" ? Math.round((kg / KG_PER_LB) * 10) / 10 : Math.round(kg * 100) / 100);
export const fromDisplayWeight = (v: number, u: UnitSystem) => (u === "imperial" ? Math.round(v * KG_PER_LB * 1000) / 1000 : v);
export const weightUnit = (u: UnitSystem) => (u === "imperial" ? "lb" : "kg");
export const fmtWeight = (kg: number, u: UnitSystem) => `${toDisplayWeight(kg, u)} ${weightUnit(u)}`;
export const toDisplayLength = (cm: number, u: UnitSystem) => (u === "imperial" ? Math.round((cm / 2.54) * 10) / 10 : Math.round(cm * 10) / 10);
export const fromDisplayLength = (v: number, u: UnitSystem) => (u === "imperial" ? v * 2.54 : v);
export const lengthUnit = (u: UnitSystem) => (u === "imperial" ? "in" : "cm");
export const fmtNumber = (n: number, digits = 0) => n.toLocaleString("en-US", { maximumFractionDigits: digits });
