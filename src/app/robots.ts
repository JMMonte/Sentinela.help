import type { MetadataRoute } from "next";

const BASE_URL = "https://sentinela.help";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}

// Note: llms.txt is available at https://sentinela.help/llms.txt
