"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/map", label: "Map" },
  { href: "/tracker", label: "Tracker" },
  { href: "/intel", label: "Intel" },
  { href: "/terminal", label: "Terminal" },
  { href: "/oracle", label: "Oracle" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <header className="topbar">
      <Link href="/" className="brand">
        <span className="brand-mark">
          GAEA<span className="deg">°</span>
        </span>
        <span className="brand-sub">Greenland Arctic Energy Association</span>
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
