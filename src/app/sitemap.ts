import type { MetadataRoute } from "next";

const BASE = "https://www.geom.org";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { path: "", priority: 1.0 },
    { path: "/overview", priority: 0.9 },
    { path: "/map", priority: 0.8 },
    { path: "/oracle", priority: 0.8 },
    { path: "/tracker", priority: 0.8 },
    { path: "/terminal", priority: 0.7 },
    { path: "/news", priority: 0.7 },
    { path: "/investors", priority: 0.7 },
    { path: "/terms", priority: 0.3 },
    { path: "/privacy", priority: 0.3 },
  ];
  return routes.map((r) => ({
    url: `${BASE}${r.path}`,
    changeFrequency: r.path === "/news" ? "daily" : "weekly",
    priority: r.priority,
  }));
}
