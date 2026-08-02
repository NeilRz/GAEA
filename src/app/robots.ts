import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    /* The API stays publicly reachable for verifiers; it just should not
       be crawled (the dataset endpoints are the expensive surface). */
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: "https://www.geom.org/sitemap.xml",
  };
}
