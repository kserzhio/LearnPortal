import type { MetadataRoute } from "next";
import { absoluteUrl, SITE_URL } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/", "/dashboard/", "/profile/", "/legacy/"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE_URL.origin,
  };
}

