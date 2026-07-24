"use client";

import { usePathname } from "next/navigation";

// The marketing site (landing + corporate pages) carries its own footer.
const MARKETING = new Set(["/", "/news", "/investors", "/terms", "/privacy"]);

export default function SiteFooter() {
  const pathname = usePathname();
  // The unified app (/app) carries its own chrome and compliance note.
  if (MARKETING.has(pathname) || pathname.startsWith("/app")) return null;
  return (
    <footer className="footer">
      <span>GEOM, REAL ASSETS FROM THE FAR NORTH</span>
      <span>INTELLIGENCE LAYER · V1 PROTOTYPE</span>
      <span style={{ marginLeft: "auto" }}>
        DATA IS INFORMATIONAL ONLY, NOT INVESTMENT ADVICE
      </span>
    </footer>
  );
}
