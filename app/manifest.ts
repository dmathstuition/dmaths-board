import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "D-Maths Board",
    short_name: "D-Maths Board",
    description: "The interactive whiteboard for teachers.",
    id: "/",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#0E6E72",
    theme_color: "#0E6E72",
    categories: ["education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
