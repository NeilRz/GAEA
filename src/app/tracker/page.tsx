import type { Metadata } from "next";
import tokenized from "@/data/tokenized.json";
import { TokenizationGapChart } from "@/components/charts";

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

export default function TrackerPage() {
  return (
    <main className="main">
      <p className="eyebrow">MOD-02</p>
      <h1 className="page-title">Tokenization Tracker</h1>
      <p className="page-lede">
        What oil exposure actually exists on-chain today. The registry tracks
        live tokenized commodities, equity wrappers, and failed precedents —
        and the headline finding is the whitespace: tokenized crude at
        institutional scale is currently{" "}
        <strong style={{ color: "var(--ink)" }}>zero</strong>.
      </p>

      <section className="panel" style={{ margin: "20px 0 24px" }}>
        <p className="panel-title">The tokenization gap</p>
        <TokenizationGapChart />
      </section>

      <section style={{ marginBottom: 24 }}>
        <p className="panel-title">Asset registry</p>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Issuer</th>
                <th>Underlying</th>
                <th>Chains</th>
                <th>Status</th>
                <th>Why it&apos;s tracked</th>
              </tr>
            </thead>
            <tbody>
              {tokenized.assets.map((a) => {
                const b = STATUS_BADGE[a.status] ?? { cls: "", label: a.status };
                return (
                  <tr key={a.name}>
                    <td>
                      <span className="mono" style={{ color: "var(--ink)" }}>
                        {a.symbol}
                      </span>
                      <br />
                      <span className="dim" style={{ fontSize: 12 }}>
                        {a.name}
                      </span>
                    </td>
                    <td className="dim">{a.issuer}</td>
                    <td className="dim">{a.underlying}</td>
                    <td className="dim mono" style={{ fontSize: 12 }}>
                      {a.chains.length ? a.chains.join(", ") : "—"}
                    </td>
                    <td>
                      <span className={`badge ${b.cls}`}>{b.label}</span>
                    </td>
                    <td className="dim" style={{ fontSize: 12, maxWidth: 280 }}>
                      {a.relevance}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <p className="panel-title">Oil equity watchlist — tokenization status</p>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Company</th>
                <th>Listing</th>
                <th>Tokenization</th>
              </tr>
            </thead>
            <tbody>
              {tokenized.watchlist.map((w) => {
                const b = TOKENIZATION_BADGE[w.tokenization] ?? {
                  cls: "",
                  label: w.tokenization,
                };
                return (
                  <tr key={w.ticker + w.name}>
                    <td className="mono" style={{ color: "var(--ink)" }}>
                      {w.ticker}
                    </td>
                    <td className="dim">{w.name}</td>
                    <td className="dim mono" style={{ fontSize: 12 }}>
                      {w.listing}
                    </td>
                    <td>
                      <span className={`badge ${b.cls}`}>{b.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <p className="provenance">
        {tokenized.meta.note} · Informational only — nothing on this page is a
        solicitation or investment advice.
      </p>
    </main>
  );
}
