import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "NutriCoach - AI Nutrition & Fitness",
    short_name: "NutriCoach",
    description: "Track food, workouts, water and weight. See what you ate vs what you burned.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f5f8f5",
    theme_color: "#16865a",
    categories: ["health", "fitness", "food"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Log food", url: "/log/food", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Log workout", url: "/log/workout", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Progress", url: "/progress", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
