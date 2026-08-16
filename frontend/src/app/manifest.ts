import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest (Next.js metadata file convention).
// Lives at the app root so it is locale-agnostic.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GymTrack - Fitness Tracking for Trainers & Athletes",
    short_name: "GymTrack",
    description:
      "Track workouts, meals, and progress with your personal trainer",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0c0a09",
    theme_color: "#0c0a09",
    categories: ["health", "fitness", "lifestyle"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
