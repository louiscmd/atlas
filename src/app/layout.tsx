import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Forma — Train, eat, progress", template: "%s · Forma" },
  description: "Personalized training plans, guided workouts, nutrition tracking and AI food scanning.",
};
export const viewport: Viewport = { themeColor: "#0b0b0d", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = (await cookies()).get("forma_theme")?.value;
  return (
    <html lang="en" data-theme={theme === "light" ? "light" : "dark"}>
      <body className={`${sans.variable} ${mono.variable} min-h-dvh antialiased`}>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-surface-2 focus:px-4 focus:py-2">Skip to content</a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
