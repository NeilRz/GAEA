import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main
      className="main"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        minHeight: "70dvh",
        gap: 12,
      }}
    >
      <p className="eyebrow" style={{ margin: 0 }}>
        404
      </p>
      <h1 style={{ margin: 0, fontSize: 28 }}>This page does not exist.</h1>
      <p className="dim" style={{ margin: 0, maxWidth: "46ch" }}>
        The address may have changed. Everything GEOM publishes is reachable
        from the two doors below.
      </p>
      <p style={{ display: "flex", gap: 12, marginTop: 10 }}>
        <Link className="btn primary" href="/">
          geom.org
        </Link>
        <Link className="btn" href="/app">
          Open the app
        </Link>
      </p>
    </main>
  );
}
