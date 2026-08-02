"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
        error
      </p>
      <h1 style={{ margin: 0, fontSize: 24 }}>Something broke on this page.</h1>
      <p className="dim mono" style={{ margin: 0, fontSize: 12 }}>
        {error.digest ? `reference ${error.digest}` : "no reference id"}
      </p>
      <p style={{ display: "flex", gap: 12, marginTop: 10 }}>
        <button className="btn primary" onClick={reset}>
          Try again
        </button>
        <Link className="btn" href="/">
          Back to geom.org
        </Link>
      </p>
    </main>
  );
}
