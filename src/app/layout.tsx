import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "ATLAS — Train, eat, progress", template: "%s · ATLAS" },
  description: "Personalized training plans, guided workouts, nutrition tracking and AI food scanning.",
  applicationName: "ATLAS",
  // iOS "Add to Home Screen": app name under the icon, full-screen launch.
  // The icon itself comes from src/app/apple-icon.png.
  appleWebApp: { capable: true, title: "ATLAS", statusBarStyle: "default" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // White is the default; "dark" (black) only when the user picked it.
  const theme = (await cookies()).get("forma_theme")?.value === "dark" ? "dark" : "light";
  return (
    <html lang="en" data-theme={theme}>
      <head><meta name="theme-color" content={theme === "dark" ? "#07090d" : "#ffffff"} /></head>
      <body className={`${sans.variable} ${mono.variable} min-h-dvh antialiased`}>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-surface-2 focus:px-4 focus:py-2">Skip to content</a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
