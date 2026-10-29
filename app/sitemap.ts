import type { MetadataRoute } from "next";
import { siteBaseUrl } from "@/lib/siteUrl";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteBaseUrl();
  return ["", "/signup", "/login", "/join", "/terms", "/privacy", "/refunds"].map((p) => ({ url: `${base}${p}`, changeFrequency: "monthly", priority: p ? 0.6 : 1 }));
}
