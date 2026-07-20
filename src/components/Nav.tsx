"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/overview", label: "Overview" },
  { href: "/map", label: "Map" },
  { href: "/tracker", label: "Tracker" },
  { href: "/terminal", label: "Terminal" },
  { href: "/oracle", label: "Oracle" },
];

// The marketing site (landing + corporate pages) supplies its own chrome.
const MARKETING = new Set(["/", "/news", "/investors", "/terms", "/privacy"]);

export default function Nav() {
  const pathname = usePathname();
  if (MARKETING.has(pathname)) return null;
  return (
    <header className="topbar">
      <Link href="/" className="brand">
        <span className="brand-mark">GEOM</span>
        <span className="brand-sub">Real assets from the far north</span>
      </Link>
      <nav className="nav" aria-label="Primary">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={pathname === l.href ? "active" : undefined}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
