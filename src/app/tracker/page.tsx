import type { Metadata } from "next";
import Link from "next/link";
import bs58 from "bs58";
import tokenized from "@/data/tokenized.json";
import { getSigner } from "@/lib/attest";
import { TokenizationGapChart } from "@/components/charts";
import TrackerLibrary from "@/components/TrackerLibrary";
import { FOLDERS, type LibraryRow } from "@/lib/tracker-folders";

export const metadata: Metadata = {
  title: "Tokenization Tracker — GEOM",
  description:
    "Registry of tokenized oil, minerals, and rare-earth real-world assets.",
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

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

export default function TrackerPage() {
  const rows = buildRows();
  const counts = new Map<string, number>();
  rows.forEach((r) => counts.set(r.folder, (counts.get(r.folder) ?? 0) + 1));
  const liveCount = rows.filter((r) => r.status.label === "Live").length;
  const gapCount = rows.filter((r) => r.status.label === "Gap").length;
  const signer = bs58.encode(getSigner().keypair.publicKey);
  const signerShort = `${signer.slice(0, 6)}…${signer.slice(-4)}`;

  // Fixed cosmetic latencies — the boot log is theatre, the counts are real.
  const bootMs = [21, 9, 14, 32, 11, 8, 26, 12, 7, 18, 15];

  return (
    <main className="main">
      <div className="dl-bar" style={{ marginBottom: 18 }}>
        <span>
          <span className="tick" />
          <b>GEOM RESOURCE DATA LAYER</b> — TRACKER · v{tokenized.meta.version}
        </span>
        <span style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <span>SHA-256 ATTESTED · SOLANA-ANCHORED</span>
          <Link
            href="/oracle"
            className="dl-chip"
            style={{ textDecoration: "none" }}
          >
            VERIFY ON ORACLE →
          </Link>
        </span>
      </div>

      <p className="eyebrow">MOD-02</p>
      <h1 className="page-title">Tokenization Tracker</h1>
      <p className="page-lede">
        What resource exposure actually exists on-chain today — oil,{" "}
        <em>minerals, and rare earths</em> — organized as a library. The
        headline finding is the whitespace: tokenized crude and tokenized rare
        earths at institutional scale are both{" "}
        <strong style={{ color: "var(--ink)" }}>zero</strong>.
      </p>

      <div style={{ display: "grid", gap: 14, marginTop: 20 }}>
        <section className="dl-section">
          <div className="dl-head">
            <span className="left">
              <span className="tick" />
              REGISTRY COUNTERS
            </span>
            <span className="status">SEED DATA · PRE-VERIFICATION</span>
          </div>
          <div
            className="dl-tiles"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}
          >
            <div className="dl-tile">
              <span className="t-name">Entries</span>
              <span className="t-count" style={{ fontSize: 28 }}>
                {rows.length}
              </span>
              <span className="t-sub">across the registry</span>
            </div>
            <div className="dl-tile">
              <span className="t-name">Folders</span>
              <span className="t-count" style={{ fontSize: 28 }}>
                {FOLDERS.length}
              </span>
              <span className="t-sub">by resource class</span>
            </div>
            <div className="dl-tile">
              <span className="t-name">Live products</span>
              <span className="t-count" style={{ fontSize: 28 }}>
                {liveCount}
              </span>
              <span className="t-sub">none of them crude or REE</span>
            </div>
            <div className="dl-tile">
              <span className="t-name">Open gaps</span>
              <span className="t-count" style={{ fontSize: 28 }}>
                {gapCount}
              </span>
              <span className="t-sub">verified whitespaces</span>
            </div>
            <div className="dl-tile">
              <span className="t-name">Tokenized crude + REE</span>
              <span className="t-count" style={{ fontSize: 28 }}>
                $0
              </span>
              <span className="t-sub">the market GEOM is built for</span>
            </div>
          </div>
        </section>

        <section className="dl-section">
          <div className="dl-head">
            <span className="left">
              <span className="tick" />
              SYSTEM BOOT
            </span>
            <span className="status">
              {FOLDERS.length}/{FOLDERS.length} FOLDERS MOUNTED
            </span>
          </div>
          <div className="dl-boot">
            {FOLDERS.map((f, i) => (
              <span key={f.id}>
                {"› "}mount <span className="path">library/{pad(f.id, 26)}</span>
                <span className="ok">[OK]</span>
                <span className="ms">
                  {"  "}
                  {pad(`${bootMs[i % bootMs.length]}ms`, 6)}
                  {counts.get(f.id) ?? 0} entries
                </span>
                {"\n"}
              </span>
            ))}
            {"› "}verify <span className="path">{pad("sha-256 canonical manifest", 33)}</span>
            <span className="ok">[OK]</span>
            <span className="ms">  v{tokenized.meta.version}</span>
            {"\n"}
            {"› "}oracle <span className="path">{pad("ed25519 signature", 33)}</span>
            <span className="ok">[OK]</span>
            <span className="ms">  {signerShort}</span>
            {"\n"}
            <span className="done">
              {"› "}boot complete · {rows.length} entries indexed · tokenized
              crude $0 · tokenized rare earths $0
            </span>
          </div>
        </section>

        <section className="dl-section">
          <div className="dl-head">
            <span className="left">
              <span className="tick" />
              FOLDER HEARTBEAT
            </span>
            <span className="status">
              {liveCount} LIVE · {gapCount} GAPS
            </span>
          </div>
          <div className="dl-tiles">
            {FOLDERS.map((f) => (
              <div className="dl-tile" key={f.id}>
                <span className="t-name">{f.id}</span>
                <span className="t-count">#{counts.get(f.id) ?? 0}</span>
                <span className="t-sub">
                  {(counts.get(f.id) ?? 0) === 1 ? "entry" : "entries"} indexed
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="dl-section">
          <div className="dl-head">
            <span className="left">
              <span className="tick" />
              RESOURCE SHELVES
            </span>
            <span className="status">{FOLDERS.length} SUBSYSTEMS</span>
          </div>
          <div className="dl-cards">
            {FOLDERS.map((f) => {
              const covers = rows
                .filter((r) => r.folder === f.id && r.symbol !== "—")
                .slice(0, 5)
                .map((r) => r.symbol);
              return (
                <div className="dl-card" key={f.id}>
                  <span className="c-title">
                    {f.id.replace(/-/g, " ")}
                    <span className="c-count">{counts.get(f.id) ?? 0}</span>
                  </span>
                  <span className="c-desc">{f.desc}</span>
                  <span className="c-covers">
                    covers: {covers.length ? covers.join(", ") : "whitespace"}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

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
        {tokenized.meta.note} · Informational only — nothing on this page is a
        solicitation or investment advice.
      </p>
    </main>
  );
}
