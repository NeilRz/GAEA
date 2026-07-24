"use client";

import { useAppNav, type ModuleKey, type AppData } from "./GeomApp";
import DatasetCatalog from "@/components/oracle/DatasetCatalog";

/* Data-first landing surface: the attested-dataset table is the centerpiece,
   flanked by a compact stat strip and plain module rows. No hero, no pitch,
   that lives on the marketing site. */

const MODULE_ROWS: Array<{
  key: ModuleKey;
  code: string;
  title: string;
  desc: string;
  status: "live" | "warn";
  label: string;
}> = [
  {
    key: "map",
    code: "01",
    title: "Map",
    desc: "3D globe: reserves, fields, mines, rare earths, nuclear, 34,936 plants",
    status: "live",
    label: "Live",
  },
  {
    key: "tracker",
    code: "02",
    title: "Tracker",
    desc: "Tokenized resource registry. Headline metric: tokenized crude is $0",
    status: "live",
    label: "Live",
  },
  {
    key: "terminal",
    code: "03",
    title: "Terminal",
    desc: "Live quotes and market structure, read-only, no price calls",
    status: "warn",
    label: "Partial",
  },
  {
    key: "oracle",
    code: "04",
    title: "Oracle",
    desc: "Signed SHA-256 attestations over every dataset, anchored on Solana",
    status: "live",
    label: "Live",
  },
];

export default function OverviewModule({ data }: { data: AppData }) {
  const nav = useAppNav();
  const { stats } = data;
  const latestAnchor = data.anchors[0];
  const eiaRow = data.catalog.find((r) => r.id === "eia");

  return (
    <main className="main">
      <section className="stat-strip">
        <div className="panel stat-tile">
          <span className="stat-value">
            {stats.totalReserves}
            <span className="unit">B bbl</span>
          </span>
          <span className="stat-label">Reserves tracked</span>
          <span className="stat-note">{stats.reserveCountries} countries</span>
        </div>
        <div className="panel stat-tile">
          <span className="stat-value">
            {stats.fieldCount}
            <span className="unit">assets</span>
          </span>
          <span className="stat-label">Fields mapped</span>
          <span className="stat-note">{stats.arcticCount} arctic</span>
        </div>
        <div className="panel stat-tile">
          <span className="stat-value">
            $0<span className="unit">tokenized crude</span>
          </span>
          <span className="stat-label">The gap</span>
          <span className="stat-note">{stats.tokenizedCount} adjacent assets</span>
        </div>
        <div className="panel stat-tile">
          <span className="stat-value">
            {stats.datasetCount}
            <span className="unit">signed</span>
          </span>
          <span className="stat-label">Datasets attested</span>
          <span className="stat-note">sha-256 · ed25519</span>
        </div>
        <div className="panel stat-tile">
          <span className="stat-value" style={{ fontSize: 20, paddingTop: 6 }}>
            {latestAnchor?.slot ? latestAnchor.slot.toLocaleString("en-US") : "—"}
          </span>
          <span className="stat-label">Latest anchor slot</span>
          <span className="stat-note">solana {latestAnchor?.cluster ?? "—"}</span>
        </div>
        <div className="panel stat-tile">
          <span className="stat-value" style={{ fontSize: 20, paddingTop: 6 }}>
            {eiaRow ? eiaRow.version : "—"}
          </span>
          <span className="stat-label">Latest EIA week</span>
          <span className="stat-note">weekly ingest · wed</span>
        </div>
      </section>

      <section style={{ marginTop: 22 }}>
        <p className="sec-label">Attested datasets</p>
        <DatasetCatalog rows={data.catalog} onOpen={(id) => nav.openDataset(id)} />
      </section>

      <section style={{ marginTop: 22 }}>
        <p className="sec-label">Modules</p>
        <div className="mod-rows">
          {MODULE_ROWS.map((m) => (
            <button key={m.key} className="mod-row" onClick={() => nav.open(m.key)}>
              <span className="mono mod-code">{m.code}</span>
              <span className="mod-title">{m.title}</span>
              <span className="mod-desc">{m.desc}</span>
              <span className={`badge ${m.status === "live" ? "good" : "warn"}`}>
                {m.label}
              </span>
              <span className="mono catalog-go" aria-hidden="true">→</span>
            </button>
          ))}
        </div>
      </section>

      <p className="provenance">
        GEOM publishes verifiable market intelligence. It does not issue
        recommendations, price targets, or investment advice. Every dataset is
        hashed, signed, and anchored; prove what was said and when at any time.
      </p>
    </main>
  );
}
