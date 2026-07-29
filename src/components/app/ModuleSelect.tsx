import Link from "next/link";
import type { CSSProperties } from "react";

/* The post-Enter landing: one full-viewport surface split into four
   panels, one per module, game-lobby style. Each panel carries its own
   ambient accent visual; hovering a panel widens it. The oracle panel
   is the only one with a developer path (Request API). */

interface PanelDef {
  key: string;
  index: string;
  title: string;
  desc: string;
  cta: string;
  href: string;
  acc: string;
  visual: React.ReactNode;
}

function OracleVisual() {
  return (
    <svg className="msel-svg" viewBox="0 0 400 620" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {/* outer and inner rings counter-rotate against the middle one */}
      <g className="msel-spin" fill="none" stroke="currentColor">
        <circle cx="200" cy="250" r="150" strokeDasharray="3 9" opacity="0.5" />
        <circle cx="200" cy="250" r="66" strokeDasharray="8 6" opacity="0.4" />
      </g>
      <g className="msel-spin msel-spin-rev" fill="none" stroke="currentColor">
        <circle cx="200" cy="250" r="108" strokeDasharray="1 6" opacity="0.65" />
      </g>
      {/* attestation pulses radiating from the core */}
      <circle className="msel-emit" cx="200" cy="250" r="150" fill="none" stroke="currentColor" />
      <circle
        className="msel-emit"
        style={{ animationDelay: "2.75s" }}
        cx="200"
        cy="250"
        r="150"
        fill="none"
        stroke="currentColor"
      />
      {/* core with a breathing halo */}
      <circle className="msel-core" cx="200" cy="250" r="11" fill="currentColor" />
      <circle cx="200" cy="250" r="4.5" fill="currentColor" />
      {/* orbiting nodes: one tethered to the core, two free counter-orbits */}
      <g>
        <line
          x1="200"
          y1="250"
          x2="200"
          y2="142"
          stroke="currentColor"
          strokeDasharray="2 5"
          opacity="0.35"
        />
        <circle cx="200" cy="142" r="3.5" fill="currentColor" />
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 200 250"
          to="360 200 250"
          dur="22s"
          repeatCount="indefinite"
        />
      </g>
      <g>
        <circle cx="200" cy="100" r="3" fill="currentColor" opacity="0.85" />
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="360 200 250"
          to="0 200 250"
          dur="30s"
          repeatCount="indefinite"
        />
      </g>
      <g>
        <circle cx="200" cy="184" r="2.5" fill="currentColor" opacity="0.7" />
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="120 200 250"
          to="480 200 250"
          dur="12s"
          repeatCount="indefinite"
        />
      </g>
      <g fill="currentColor" opacity="0.7">
        <rect x="196" y="96" width="8" height="8" rx="1" />
        <rect x="330" y="246" width="8" height="8" rx="1" opacity="0.6" />
        <rect x="62" y="246" width="8" height="8" rx="1" opacity="0.6" />
      </g>
      <g fontFamily="monospace" fontSize="9" fill="currentColor" opacity="0.35" letterSpacing="2">
        <text x="120" y="452">9f2c4e81a37d</text>
        <text x="150" y="476">ed25519</text>
        <text x="104" y="500">sha-256 · anchored</text>
      </g>
      <rect className="msel-blink" x="256" y="492" width="5" height="9" fill="currentColor" />
    </svg>
  );
}

function MapVisual() {
  return (
    <svg className="msel-svg" viewBox="0 0 400 620" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <clipPath id="msel-globe">
          <circle cx="200" cy="270" r="140" />
        </clipPath>
      </defs>
      <g fill="none" stroke="currentColor" opacity="0.55">
        <circle cx="200" cy="270" r="140" />
        <ellipse cx="200" cy="270" rx="96" ry="140" opacity="0.55" />
        <ellipse cx="200" cy="270" rx="44" ry="140" opacity="0.4" />
        <g clipPath="url(#msel-globe)" opacity="0.55">
          <ellipse cx="200" cy="196" rx="150" ry="26" />
          <ellipse cx="200" cy="270" rx="158" ry="30" />
          <ellipse cx="200" cy="346" rx="150" ry="26" />
        </g>
      </g>
      <g fill="currentColor">
        <circle cx="168" cy="176" r="3.5" />
        <circle className="msel-ping" cx="168" cy="176" r="3.5" fill="none" stroke="currentColor" />
        <circle cx="258" cy="238" r="3" opacity="0.8" />
        <circle
          className="msel-ping"
          style={{ animationDelay: "0.9s" }}
          cx="258"
          cy="238"
          r="3"
          fill="none"
          stroke="currentColor"
        />
        <circle cx="128" cy="300" r="3" opacity="0.8" />
        <circle className="msel-ping msel-ping-late" cx="128" cy="300" r="3" fill="none" stroke="currentColor" />
      </g>
      {/* survey sites blinking in and out across the globe */}
      <g fill="currentColor">
        {(
          [
            [232, 152, 0],
            [284, 318, 1.1],
            [176, 352, 2.3],
            [148, 238, 3.4],
            [252, 196, 4.2],
            [214, 296, 5.1],
          ] as Array<[number, number, number]>
        ).map(([x, y, d]) => (
          <circle
            key={`${x}-${y}`}
            className="msel-blip"
            style={{ animationDelay: `${d}s` }}
            cx={x}
            cy={y}
            r="2.6"
          />
        ))}
      </g>
      {/* commodity glyphs: an oil drop and a cut mineral */}
      <g className="msel-breathe" fill="currentColor">
        <path d="M240 226 c5.5 7.5 8.5 11.5 8.5 15.5 a8.5 8.5 0 1 1 -17 0 c0 -4 3 -8 8.5 -15.5 Z" />
      </g>
      <g className="msel-breathe" style={{ animationDelay: "2s" }} fill="none" stroke="currentColor">
        <path d="M146 302 l7 5.5 -7 11.5 -7 -11.5 Z" />
        <path d="M139 307.5 h14" opacity="0.6" />
      </g>
      {/* a survey vessel tracing the equator */}
      <circle r="2.6" fill="currentColor" opacity="0.9">
        <animateMotion
          dur="10s"
          repeatCount="indefinite"
          path="M 60 270 a 140 28 0 1 0 280 0 a 140 28 0 1 0 -280 0"
        />
      </circle>
      {/* low orbit */}
      <g>
        <circle cx="200" cy="116" r="2.8" fill="currentColor" opacity="0.9" />
        <circle cx="200" cy="116" r="6.5" fill="none" stroke="currentColor" opacity="0.4" />
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 200 270"
          to="360 200 270"
          dur="16s"
          repeatCount="indefinite"
        />
      </g>
    </svg>
  );
}

function TerminalVisual() {
  const candles: Array<[number, number, number, number, boolean]> = [
    // [x, wickTop, bodyTop, bodyH, up]
    [56, 300, 322, 46, true],
    [92, 268, 284, 58, false],
    [128, 286, 300, 40, true],
    [164, 238, 258, 62, true],
    [200, 218, 234, 44, false],
    [236, 244, 262, 52, true],
    [272, 196, 214, 58, true],
    [308, 172, 188, 48, false],
    [344, 202, 216, 60, true],
  ];
  return (
    <svg className="msel-svg" viewBox="0 0 400 620" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g stroke="currentColor" opacity="0.14">
        {[180, 240, 300, 360].map((y) => (
          <line key={y} x1="24" x2="376" y1={y} y2={y} />
        ))}
      </g>
      {/* last-price line drifting with the tape */}
      <g className="msel-price">
        <line x1="24" x2="376" y1="216" y2="216" stroke="currentColor" strokeDasharray="4 5" opacity="0.3" />
        <rect x="356" y="209.5" width="20" height="13" rx="3" fill="currentColor" opacity="0.2" />
      </g>
      {candles.map(([x, wt, bt, bh, up], i) => {
        const live = i === candles.length - 1;
        return (
          <g key={i} stroke="currentColor" opacity={up ? 0.85 : 0.4}>
            <line x1={x} x2={x} y1={wt} y2={bt + bh + 18} />
            <rect
              className={live ? "msel-candle msel-candle-live" : "msel-candle"}
              style={{ animationDelay: `${i * 0.4}s` }}
              x={x - 7}
              y={bt}
              width="14"
              height={bh}
              fill={up ? "currentColor" : "none"}
              fillOpacity={up ? 0.5 : undefined}
            />
            {live && <circle className="msel-blink" cx={x} cy={wt - 8} r="2.5" fill="currentColor" stroke="none" />}
          </g>
        );
      })}
    </svg>
  );
}

function StatusVisual() {
  return (
    <svg className="msel-svg" viewBox="0 0 400 620" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <polyline
        className="msel-pulse"
        points="0,270 96,270 116,270 132,226 150,314 166,270 236,270 254,244 270,296 284,270 400,270"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <g fill="none" stroke="currentColor" opacity="0.55">
        {[120, 200, 280].map((x, i) => (
          <g key={x} opacity={1 - i * 0.18}>
            <circle cx={x} cy="410" r="11" />
            <path d={`M ${x - 4} 410 l 3 3.5 l 6 -7`} strokeWidth="1.5" />
          </g>
        ))}
        <line x1="131" x2="189" y1="410" y2="410" strokeDasharray="2 4" opacity="0.5" />
        <line x1="211" x2="269" y1="410" y2="410" strokeDasharray="2 4" opacity="0.5" />
      </g>
      <g fontFamily="monospace" fontSize="9" fill="currentColor" opacity="0.35" letterSpacing="2">
        <text x="126" y="446">anchor history</text>
      </g>
    </svg>
  );
}

function TokenBarVisual() {
  /* asset → contract → token pipeline, drifting slowly behind the locked bar */
  return (
    <svg className="msel-svg" viewBox="0 0 1200 190" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g className="msel-tok" fill="none" stroke="currentColor">
        <g opacity="0.8">
          <circle cx="150" cy="95" r="34" />
          <circle cx="150" cy="95" r="24" strokeDasharray="3 5" />
        </g>
        <line x1="192" y1="95" x2="332" y2="95" strokeDasharray="2 6" opacity="0.5" />
        <path d="M370 61 l30 17 v34 l-30 17 -30 -17 v-34 Z" opacity="0.7" />
        <line x1="408" y1="95" x2="548" y2="95" strokeDasharray="2 6" opacity="0.5" />
        <g opacity="0.8">
          <circle cx="586" cy="95" r="34" />
          <path d="M586 73 c9 12 14 18 14 25 a14 14 0 1 1 -28 0 c0 -7 5 -13 14 -25 Z" />
        </g>
        <line x1="628" y1="95" x2="768" y2="95" strokeDasharray="2 6" opacity="0.5" />
        <g opacity="0.7">
          <rect x="776" y="65" width="60" height="60" rx="8" />
          <path d="M794 95 l9 9 17 -17" />
        </g>
        <line x1="844" y1="95" x2="984" y2="95" strokeDasharray="2 6" opacity="0.5" />
        <g opacity="0.8">
          <circle cx="1022" cy="95" r="34" />
          <path d="M1010 105 v-10 M1022 105 v-20 M1034 105 v-7" strokeWidth="2" />
        </g>
      </g>
    </svg>
  );
}

const PANELS: PanelDef[] = [
  {
    key: "map",
    index: "01",
    title: "Map",
    desc: "The physical layer on one globe: reserves, mines, 5,391 extraction assets, routed pipelines and 34,936 power plants.",
    cta: "See Map",
    href: "/app?m=map",
    acc: "#2ba57e",
    visual: <MapVisual />,
  },
  {
    key: "oracle",
    index: "02",
    title: "Oracle",
    desc: "Signed datasets and the tokenization registry. Every byte fingerprinted, Ed25519-signed, anchored on Solana.",
    cta: "Enter Oracle",
    href: "/app",
    acc: "#8fb4c9",
    visual: <OracleVisual />,
  },
  {
    key: "terminal",
    index: "03",
    title: "Terminal",
    desc: "Market structure, read-only. Live candles across partners, tokenized RWA, energy and benchmarks.",
    cta: "Open Terminal",
    href: "/app?m=terminal",
    acc: "#c67c1b",
    visual: <TerminalVisual />,
  },
  {
    key: "status",
    index: "04",
    title: "Status",
    desc: "The proof surface: anchor history, signer identity and dataset digests, verifiable in the open.",
    cta: "View Status",
    href: "/app?m=overview",
    acc: "#cbc3b1",
    visual: <StatusVisual />,
  },
];

export default function ModuleSelect() {
  return (
    <div className="msel-page">
      <header className="msel-top">
        <Link href="/" className="msel-brand brand-mark">
          GEOM
        </Link>
        <h1 className="msel-h1">
          GEOM <em>modules</em>
        </h1>
        <Link href="/" className="msel-exit mono">
          geom.org →
        </Link>
      </header>

      <main className="msel-lobby">
        <div className="msel-grid">
        {PANELS.map((p) => (
          <section
            key={p.key}
            className="msel-panel"
            style={{ "--acc": p.acc } as CSSProperties}
          >
            <div className="msel-bg" aria-hidden="true">
              {p.visual}
            </div>
            <div className="msel-scrim" aria-hidden="true" />
            <div className="msel-content">
              <span className="msel-index mono">{p.index}</span>
              <h2 className="msel-title">{p.title}</h2>
              <p className="msel-desc">{p.desc}</p>
              <div className="msel-actions">
                <Link href={p.href} className="msel-btn msel-btn-primary">
                  {p.cta} <span aria-hidden="true">→</span>
                </Link>
                {p.key === "oracle" && (
                  <span className="msel-devcol">
                    <span className="msel-dev mono">For developers</span>
                    <a
                      className="msel-btn inv"
                      href="mailto:request@geom.org?subject=GEOM%20Oracle%20API%20access%20request"
                    >
                      Request API
                    </a>
                  </span>
                )}
              </div>
            </div>
          </section>
        ))}
        </div>

        <section className="msel-bar">
          <div className="msel-bar-bg" aria-hidden="true">
            <TokenBarVisual />
          </div>
          <span className="msel-index mono">05</span>
          <span className="msel-bar-text">
            <h2 className="msel-title msel-bar-title">Tokenization Platform</h2>
            <p className="msel-desc msel-bar-desc">
              The fifth module. In development, unlocks in a future phase.
            </p>
          </span>
          <span className="msel-lock mono">
            <svg
              width="12"
              height="14"
              viewBox="0 0 12 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              aria-hidden="true"
            >
              <rect x="1" y="6" width="10" height="7" rx="1.5" />
              <path d="M3.2 6 V4.2 a2.8 2.8 0 0 1 5.6 0 V6" />
            </svg>
            Locked
          </span>
        </section>
      </main>

    </div>
  );
}
