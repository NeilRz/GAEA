import Link from "next/link";
import reserves from "@/data/reserves.json";
import fields from "@/data/fields.json";
import tokenized from "@/data/tokenized.json";
import { datasetHashes } from "@/lib/attest";

/* Polar graticule, the GEOM signature mark. Concentric latitude rings and
   meridians as seen looking down at the pole. */
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

const MODULES = [
  {
    href: "/map",
    code: "MOD-01",
    title: "Reserve Map",
    desc: "3D globe of proven reserves, supergiant fields, mines, rare-earth deposits, and nuclear assets, the physical layer, mapped.",
    status: "live",
    label: "Live",
  },
  {
    href: "/tracker",
    code: "MOD-02",
    title: "Tokenization Tracker",
    desc: "Registry of tokenized oil and commodity RWAs. Today's headline metric: tokenized crude at institutional scale is $0.",
    status: "live",
    label: "Live",
  },
  {
    href: "/terminal",
    code: "MOD-03",
    title: "Terminal",
    desc: "Read-only market structure: futures curve shape, crack spreads, inventory prints. Live feeds are the next milestone.",
    status: "warn",
    label: "Sample data",
  },
  {
    href: "/oracle",
    code: "MOD-04",
    title: "Oracle",
    desc: "Signed SHA-256 attestations over every GEOM dataset, verifiable by anyone. The bridge from intelligence to settlement.",
    status: "live",
    label: "Live",
  },
];

export default function Overview() {
  const hashes = datasetHashes();
  const arcticCount = fields.fields.filter((f) => f.arctic).length;
  const totalReserves = Math.round(
    reserves.countries.reduce((s, c) => s + c.reserves, 0)
  );

  return (
    <main className="main">
      <section className="hero">
        <Graticule />
        <div className="coord-ticker">
          <span>
            LAT <b>66°33′N</b>
          </span>
          <span>
            DATASETS <b>{hashes.length}</b>
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
          <Link href="/map" className="btn primary">
            Open the map →
          </Link>
          <Link href="/oracle" className="btn">
            Verify an attestation
          </Link>
        </div>
      </section>

      <section className="grid grid-4" style={{ marginBottom: 28 }}>
        <div className="panel stat-tile">
          <span className="stat-value">
            {totalReserves}
            <span className="unit">B bbl</span>
          </span>
          <span className="stat-label">Proven reserves tracked</span>
          <span className="stat-note">{reserves.countries.length} countries · seed data</span>
        </div>
        <div className="panel stat-tile">
          <span className="stat-value">
            {fields.fields.length}
            <span className="unit">assets</span>
          </span>
          <span className="stat-label">Fields & basins mapped</span>
          <span className="stat-note">{arcticCount} above the Arctic Circle</span>
        </div>
        <div className="panel stat-tile">
          <span className="stat-value">
            $0<span className="unit">tokenized crude</span>
          </span>
          <span className="stat-label">The market GEOM is built for</span>
          <span className="stat-note">{tokenized.assets.length} adjacent assets in registry</span>
        </div>
        <div className="panel stat-tile">
          <span className="stat-value">
            {hashes.length}
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
          {MODULES.map((m) => (
            <Link key={m.href} href={m.href} className="module-card">
              <span className="module-num">{m.code}</span>
              <h3>{m.title}</h3>
              <p>{m.desc}</p>
              <span className="module-status">
                <span className={`badge ${m.status === "live" ? "good" : "warn"}`}>
                  {m.label}
                </span>
              </span>
            </Link>
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
