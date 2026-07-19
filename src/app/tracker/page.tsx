import type { Metadata } from "next";
import tokenized from "@/data/tokenized.json";
import { TokenizationGapChart } from "@/components/charts";
import TrackerLibrary, { type LibraryRow } from "@/components/TrackerLibrary";

export const metadata: Metadata = {
  title: "Tokenization Tracker — GEOM",
  description: "Registry of tokenized oil and commodity real-world assets.",
};

const STATUS_BADGE: Record<string, { cls: string; label: string }> = {
  live: { cls: "good", label: "Live" },
  partial: { cls: "warn", label: "Partial" },
  defunct: { cls: "critical", label: "Defunct" },
  gap: { cls: "info", label: "Gap" },
};

const TOKENIZATION_BADGE: Record<string, { cls: string; label: string }> = {
  "none-verified": { cls: "", label: "None verified" },
  "pending-announcement": { cls: "info", label: "Pending" },
};

function buildRows(): LibraryRow[] {
  const assetRows: LibraryRow[] = tokenized.assets.map((a) => ({
    key: `asset-${a.symbol}-${a.name}`,
    symbol: a.symbol,
    name: a.name,
    issuer: a.issuer,
    underlying: a.underlying,
    chains: a.chains.join(", "),
    folder: a.category,
    status: STATUS_BADGE[a.status] ?? { cls: "", label: a.status },
    note: a.relevance,
  }));
  const watchRows: LibraryRow[] = tokenized.watchlist.map((w) => ({
    key: `watch-${w.ticker}-${w.name}`,
    symbol: w.ticker,
    name: w.name,
    issuer: w.listing,
    underlying: "Listed oil & gas equity",
    chains: "",
    folder: "equity-watchlist",
    status: TOKENIZATION_BADGE[w.tokenization] ?? {
      cls: "",
      label: w.tokenization,
    },
    note: "Watched for a verified tokenization event",
  }));
  return [...assetRows, ...watchRows];
}

export default function TrackerPage() {
  const rows = buildRows();
  const folders = new Set(rows.map((r) => r.folder));
  const liveCount = rows.filter((r) => r.status.label === "Live").length;

  return (
    <main className="main">
      <p className="eyebrow">MOD-02</p>
      <h1 className="page-title">Tokenization Tracker</h1>
      <p className="page-lede">
        What oil exposure actually exists on-chain today, organized as a
        library. The headline finding is the whitespace: tokenized crude at
        institutional scale is currently{" "}
        <strong style={{ color: "var(--ink)" }}>zero</strong>.
      </p>

      <section className="grid grid-4" style={{ margin: "20px 0 20px" }}>
        <div className="panel stat-tile">
          <span className="stat-value">{rows.length}</span>
          <span className="stat-label">Entries in the registry</span>
          <span className="stat-note">seed data · pre-verification</span>
        </div>
        <div className="panel stat-tile">
          <span className="stat-value">{folders.size}</span>
          <span className="stat-label">Library folders</span>
          <span className="stat-note">by asset class</span>
        </div>
        <div className="panel stat-tile">
          <span className="stat-value">{liveCount}</span>
          <span className="stat-label">Live tokenized products</span>
          <span className="stat-note">none of them crude</span>
        </div>
        <div className="panel stat-tile">
          <span className="stat-value">
            $0<span className="unit">crude</span>
          </span>
          <span className="stat-label">Tokenized oil at scale</span>
          <span className="stat-note">the gap GEOM tracks</span>
        </div>
      </section>

      <section style={{ marginBottom: 24 }}>
        <TrackerLibrary rows={rows} />
      </section>

      <section className="panel">
        <p className="panel-title">The tokenization gap</p>
        <TokenizationGapChart />
      </section>

      <p className="provenance">
        {tokenized.meta.note} · Informational only — nothing on this page is a
        solicitation or investment advice.
      </p>
    </main>
  );
}
