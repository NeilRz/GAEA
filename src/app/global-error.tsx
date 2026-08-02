"use client";

/* Root-level boundary: renders when the layout itself fails, so it must
   carry its own html/body and inline styles (globals.css may not load). */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          background: "#0c1519",
          color: "#edf1f3",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: 24,
        }}
      >
        <p style={{ margin: 0, fontSize: 12, letterSpacing: "0.2em", color: "#7e97a6" }}>
          GEOM
        </p>
        <h1 style={{ margin: 0, fontSize: 24 }}>The site hit an error.</h1>
        {error.digest && (
          <p style={{ margin: 0, fontSize: 12, color: "#7e97a6" }}>
            reference {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          style={{
            marginTop: 10,
            padding: "10px 22px",
            borderRadius: 999,
            border: "1px solid #5e8ba6",
            background: "transparent",
            color: "#edf1f3",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
