import type { MetadataRoute } from "next";

// Install metadata for "Add to Home Screen" (Android/Chrome/desktop PWA).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ATLAS — Train, eat, progress",
    short_name: "ATLAS",
    description: "Personalized training plans, guided workouts and nutrition tracking.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f5f7fb",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
