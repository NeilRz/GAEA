import type { MetadataRoute } from "next";

const BASE = "https://www.geom.org";

/* Only real destinations. /map, /tracker, /terminal and /oracle are
   redirect stubs into /app and do not belong in the sitemap; /app is the
   application itself and the URL we want indexed for it. */
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { path: "", priority: 1.0 },
    { path: "/app", priority: 0.9 },
    { path: "/overview", priority: 0.8 },
    { path: "/whitepaper", priority: 0.8 },
    { path: "/news", priority: 0.7 },
    { path: "/investors", priority: 0.7 },
    { path: "/join", priority: 0.5 },
    { path: "/privacy", priority: 0.3 },
  ];
  return routes.map((r) => ({
    url: `${BASE}${r.path}`,
    changeFrequency: "weekly" as const,
    priority: r.priority,
  }));
}
