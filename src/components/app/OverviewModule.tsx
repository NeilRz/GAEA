"use client";

import { useAppNav, type ModuleKey, type OverviewStats } from "./GeomApp";

/* Polar graticule, the GEOM signature mark. */
function Graticule() {
  const rings = [60, 105, 150, 195, 240];
  const meridians = Array.from({ length: 12 }, (_, i) => (i * Math.PI) / 6);
  return (
    <svg
      className="hero-grid"
      viewBox="0 0 900 420"
      preserveAspectRatio="xMaxYMin slice"
      aria-hidden="true"
    >
      <g transform="translate(760, 40)" stroke="#2e4650" fill="none">
        {rings.map((r) => (
          <circle key={r} r={r} strokeWidth="1" opacity={0.7 - r / 500} />
        ))}
        {meridians.map((a, i) => (
          <line
            key={i}
            x1={Math.cos(a) * 30}
            y1={Math.sin(a) * 30}
            x2={Math.cos(a) * 260}
            y2={Math.sin(a) * 260}
            strokeWidth="1"
            opacity="0.35"
          />
        ))}
        <circle r={150} stroke="#5e8ba6" strokeWidth="1.2" strokeDasharray="3 5" opacity="0.8" />
        <circle r={3} fill="#8fb4c9" stroke="none" />
      </g>
    </svg>
  );
}

const MODULE_CARDS: Array<{
  key: ModuleKey;
  code: string;
  title: string;
  desc: string;
  status: "live" | "warn";
  label: string;
}> = [
  {
    key: "map",
    code: "MOD-01",
    title: "Reserve Map",
    desc: "3D globe of proven reserves, supergiant fields, mines, rare-earth deposits, and nuclear assets, the physical layer, mapped.",
    status: "live",
    label: "Live",
  },
  {
    key: "tracker",
    code: "MOD-02",
    title: "Tokenization Tracker",
    desc: "Registry of tokenized oil and commodity RWAs. Today's headline metric: tokenized crude at institutional scale is $0.",
    status: "live",
    label: "Live",
  },
  {
    key: "terminal",
    code: "MOD-03",
    title: "Terminal",
    desc: "Read-only market structure: futures curve shape, crack spreads, inventory prints. Live feeds are the next milestone.",
    status: "warn",
    label: "Sample data",
  },
  {
    key: "oracle",
    code: "MOD-04",
    title: "Oracle",
    desc: "Signed SHA-256 attestations over every GEOM dataset, verifiable by anyone. The bridge from intelligence to settlement.",
    status: "live",
    label: "Live",
  },
];

export default function OverviewModule({ stats }: { stats: OverviewStats }) {
  const nav = useAppNav();
  return (
    <main className="main">
      <section className="hero">
        <Graticule />
        <div className="coord-ticker">
          <span>
            LAT <b>66°33′N</b>
          </span>
          <span>
            DATASETS <b>{stats.datasetCount}</b>
          </span>
          <span>
            ATTESTATION <b>SHA-256 · ED25519</b>
          </span>
          <span>
            STATUS <b>V1 PROTOTYPE</b>
          </span>
        </div>
        <h1>
          The intelligence layer for <em>digital oil</em> capital markets.
        </h1>
        <p className="lede">
          GEOM maps the world&apos;s oil, minerals, rare earths, and nuclear
          assets, tracks what is, and isn&apos;t, tokenized, and signs every
          dataset it ships. Intelligence first; settlement when the rules are
          written.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", position: "relative" }}>
          <button className="btn primary" onClick={() => nav.open("map")}>
            Open the map →
          </button>
          <button className="btn" onClick={() => nav.open("oracle")}>
            Verify an attestation
          </button>
        </div>
      </section>

      <section className="grid grid-4" style={{ marginBottom: 28 }}>
        <div className="panel stat-tile">
          <span className="stat-value">
            {stats.totalReserves}
            <span className="unit">B bbl</span>
          </span>
          <span className="stat-label">Proven reserves tracked</span>
          <span className="stat-note">{stats.reserveCountries} countries · seed data</span>
        </div>
        <div className="panel stat-tile">
          <span className="stat-value">
            {stats.fieldCount}
            <span className="unit">assets</span>
          </span>
          <span className="stat-label">Fields & basins mapped</span>
          <span className="stat-note">{stats.arcticCount} above the Arctic Circle</span>
        </div>
        <div className="panel stat-tile">
          <span className="stat-value">
            $0<span className="unit">tokenized crude</span>
          </span>
          <span className="stat-label">The market GEOM is built for</span>
          <span className="stat-note">{stats.tokenizedCount} adjacent assets in registry</span>
        </div>
        <div className="panel stat-tile">
          <span className="stat-value">
            {stats.datasetCount}
            <span className="unit">signed</span>
          </span>
          <span className="stat-label">Datasets under attestation</span>
          <span className="stat-note">sha-256 over canonical JSON</span>
        </div>
      </section>

      <section>
        <p className="eyebrow" style={{ marginBottom: 12 }}>
          Modules
        </p>
        <div className="grid grid-3">
          {MODULE_CARDS.map((m) => (
            <button
              key={m.key}
              className="module-card"
              style={{ textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit" }}
              onClick={() => nav.open(m.key)}
            >
              <span className="module-num">{m.code}</span>
              <h3>{m.title}</h3>
              <p>{m.desc}</p>
              <span className="module-status">
                <span className={`badge ${m.status === "live" ? "good" : "warn"}`}>
                  {m.label}
                </span>
              </span>
            </button>
          ))}
          <div className="module-card" style={{ borderStyle: "dashed" }}>
            <span className="module-num">MOD-05</span>
            <h3>Flows & Indices</h3>
            <p>
              AIS tanker flows, Northern Sea Route transit tracking, and the
              GEOM Digital Oil Index family. Next on the roadmap.
            </p>
            <span className="module-status">
              <span className="badge">Planned</span>
            </span>
          </div>
        </div>
      </section>

      <section className="panel" style={{ marginTop: 28 }}>
        <p className="panel-title">Operating doctrine</p>
        <div className="grid grid-3">
          <div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>Data, not advice</p>
            <p className="dim" style={{ margin: "4px 0 0", fontSize: 13 }}>
              GEOM publishes verifiable market intelligence. It does not issue
              recommendations, price targets, or investment advice, by design,
              not disclaimer.
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>Everything attested</p>
            <p className="dim" style={{ margin: "4px 0 0", fontSize: 13 }}>
              Every dataset GEOM ships is hashed and signed. If GEOM
              publishes it, anyone can prove what was said and when.
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>Built for the Act</p>
            <p className="dim" style={{ margin: "4px 0 0", fontSize: 13 }}>
              The intelligence layer runs today. The same attestation rails
              become settlement infrastructure when digital commodity rules are
              final.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
