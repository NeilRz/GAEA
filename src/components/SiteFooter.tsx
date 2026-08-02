"use client";

import { usePathname } from "next/navigation";

// The marketing site (landing + corporate pages) carries its own footer.
const MARKETING = new Set(["/", "/news", "/investors", "/privacy"]);

export default function SiteFooter() {
  const pathname = usePathname();
  // The unified app (/app) and the module select screen (/overview)
  // carry their own chrome and compliance note.
  if (
    MARKETING.has(pathname) ||
    pathname.startsWith("/app") ||
    pathname === "/overview"
  )
    return null;
  return (
    <footer className="footer">
      <span>GEOM, REAL ASSETS FROM THE FAR NORTH</span>
      <span style={{ marginLeft: "auto" }}>
        INFORMATIONAL ONLY · NOT INVESTMENT ADVICE
      </span>
    </footer>
  );
}
