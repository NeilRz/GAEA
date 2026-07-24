"use client";

import tokenized from "@/data/tokenized.json";
import { TokenizationGapChart } from "@/components/charts";
import TrackerLibrary from "@/components/TrackerLibrary";
import { FOLDERS, type LibraryRow } from "@/lib/tracker-folders";
import { useAppNav } from "./GeomApp";

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
    underlying:
      w.sector === "mining"
        ? "Listed mining / materials equity"
        : "Listed oil & gas equity",
    chains: "",
    folder:
      w.sector === "mining" ? "watchlist-mining-equity" : "watchlist-oil-equity",
    status: TOKENIZATION_BADGE[w.tokenization] ?? {
      cls: "",
      label: w.tokenization,
    },
    note: "Watched for a verified tokenization event",
  }));
  return [...assetRows, ...watchRows];
}

export default function TrackerModule({ signer }: { signer: string }) {
  const nav = useAppNav();
  const rows = buildRows();
  const liveCount = rows.filter((r) => r.status.label === "Live").length;
  const gapCount = rows.filter((r) => r.status.label === "Gap").length;
  const signerShort = `${signer.slice(0, 6)}…${signer.slice(-4)}`;

  return (
    <main className="main">
      <div className="mod-intro-row">
        <p className="mod-intro">
          What resource exposure actually exists on-chain today. The headline
          finding is the whitespace: tokenized crude and tokenized rare earths
          at institutional scale are both zero.
        </p>
        <button className="dl-chip" onClick={() => nav.openDataset("tokenized")}>
          VERIFY ON ORACLE →
        </button>
      </div>

      <section className="stat-strip">
        <div className="panel stat-tile">
          <span className="stat-value">{rows.length}</span>
          <span className="stat-label">Registry entries</span>
          <span className="stat-note">v{tokenized.meta.version} · attested</span>
        </div>
        <div className="panel stat-tile">
          <span className="stat-value">{FOLDERS.length}</span>
          <span className="stat-label">Folders</span>
          <span className="stat-note">by resource class</span>
        </div>
        <div className="panel stat-tile">
          <span className="stat-value">{liveCount}</span>
          <span className="stat-label">Live products</span>
          <span className="stat-note">none of them crude or REE</span>
        </div>
        <div className="panel stat-tile">
          <span className="stat-value">{gapCount}</span>
          <span className="stat-label">Open gaps</span>
          <span className="stat-note">verified whitespaces</span>
        </div>
        <div className="panel stat-tile">
          <span className="stat-value">$0</span>
          <span className="stat-label">Tokenized crude + REE</span>
          <span className="stat-note">the market GEOM is built for</span>
        </div>
        <div className="panel stat-tile">
          <span className="stat-value" style={{ fontSize: 18, paddingTop: 8 }}>
            {signerShort}
          </span>
          <span className="stat-label">Oracle signer</span>
          <span className="stat-note">ed25519 · sha-256 manifest</span>
        </div>
      </section>

      <div style={{ display: "grid", gap: 16, marginTop: 22 }}>
        <TrackerLibrary rows={rows} />

        <section className="dl-section">
          <div className="dl-head">
            <span className="left">
              <span className="tick" />
              THE TOKENIZATION GAP
            </span>
            <span className="status">USD, LOG SCALE OF ABSENCE</span>
          </div>
          <div style={{ padding: 16 }}>
            <TokenizationGapChart />
          </div>
        </section>
      </div>

      <p className="provenance">
        {tokenized.meta.note} · Informational only, nothing on this page is a
        solicitation or investment advice.
      </p>
    </main>
  );
}
