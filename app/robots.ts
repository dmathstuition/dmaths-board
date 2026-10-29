import type { MetadataRoute } from "next";
import { siteBaseUrl } from "@/lib/siteUrl";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/app", "/admin", "/api", "/class", "/report", "/verify"] }],
    sitemap: `${siteBaseUrl()}/sitemap.xml`,
  };
}
