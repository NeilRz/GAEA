"use client";

import { useAppNav, type ModuleKey, type AppData, type AnchorRecord } from "./GeomApp";
import OracleQuickstart from "@/components/OracleQuickstart";

/* The status surface: proof, provenance, and developer access. The explorer
   is the app's landing view; this page is where you check the receipts. */

function explorerUrl(a: AnchorRecord): string {
  return `https://explorer.solana.com/tx/${a.signature}${
    a.cluster === "mainnet-beta" ? "" : `?cluster=${a.cluster}`
  }`;
}

function shortSig(sig: string): string {
  return `${sig.slice(0, 8)}…${sig.slice(-8)}`;
}

const MODULE_ROWS: Array<{
  key: ModuleKey;
  code: string;
  title: string;
  desc: string;
  status: "live" | "warn";
  label: string;
}> = [
  {
    key: "oracle",
    code: "01",
    title: "Explore",
    desc: "Signed datasets and the tokenization registry, one catalog, filterable",
    status: "live",
    label: "Live",
  },
  {
    key: "map",
    code: "02",
    title: "Map",
    desc: "3D globe: reserves, fields, mines, rare earths, nuclear, 34,936 plants",
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
];

export default function OverviewModule({ data }: { data: AppData }) {
  const nav = useAppNav();
  const { stats } = data;
  const latestAnchor = data.anchors[0];
  const anchorIsCurrent = latestAnchor?.manifestSha256 === data.manifestHash;
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

      <section className="panel" style={{ marginTop: 22 }}>
        <p className="panel-title">
          On-chain proof
          {latestAnchor &&
            (anchorIsCurrent ? (
              <span className="badge good">current</span>
            ) : (
              <span className="badge warn">datasets changed since anchor</span>
            ))}
        </p>
        {!latestAnchor ? (
          <p className="dim" style={{ fontSize: 13, margin: 0 }}>
            No anchors published yet.
          </p>
        ) : (
          <>
            <div className="kv-list" style={{ marginBottom: 16 }}>
              <div className="row">
                <span className="k">Network</span>
                <span className="v mono" style={{ fontSize: 12 }}>
                  Solana {latestAnchor.cluster} · slot{" "}
                  {latestAnchor.slot?.toLocaleString("en-US") ?? "—"}
                </span>
              </div>
              <div className="row">
                <span className="k">Memo</span>
                <span className="v">
                  <span className="hash">{latestAnchor.memo}</span>
                </span>
              </div>
              <div className="row">
                <span className="k">Signer</span>
                <span className="v">
                  <span className="hash">
                    {data.signer}
                    {data.signerDev
                      ? "  (dev key, set ORACLE_SIGNER_KEY in production)"
                      : ""}
                  </span>
                </span>
              </div>
            </div>
            <a
              className="btn primary"
              href={explorerUrl(latestAnchor)}
              target="_blank"
              rel="noreferrer"
            >
              View the transaction on Solana Explorer →
            </a>
            {data.anchors.length > 1 && (
              <div className="table-wrap" style={{ marginTop: 16 }}>
                <table className="data">
                  <thead>
                    <tr>
                      <th>Anchored</th>
                      <th>Cluster</th>
                      <th>Manifest SHA-256</th>
                      <th>Status</th>
                      <th>Transaction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.anchors.map((a) => (
                      <tr key={a.signature}>
                        <td className="mono dim" style={{ fontSize: 11.5 }}>{a.anchoredAt}</td>
                        <td className="mono dim">{a.cluster}</td>
                        <td className="mono dim" style={{ fontSize: 11, wordBreak: "break-all" }}>
                          {a.manifestSha256}
                        </td>
                        <td>
                          {a.manifestSha256 === data.manifestHash ? (
                            <span className="badge good">current</span>
                          ) : (
                            <span className="badge">superseded</span>
                          )}
                        </td>
                        <td>
                          <a
                            className="mono"
                            style={{ color: "var(--glacial-bright)", fontSize: 12 }}
                            href={explorerUrl(a)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {shortSig(a.signature)}
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      <div style={{ marginTop: 22 }}>
        <OracleQuickstart />
      </div>

      <section className="grid grid-2" style={{ marginTop: 22 }}>
        <div className="panel" style={{ display: "flex", flexDirection: "column" }}>
          <p className="panel-title">
            API reference <span className="badge good">public</span>
          </p>
          <div className="codeblock" style={{ marginBottom: 14 }}>
            <span className="k">GET</span> /api/datasets            <span className="v"># all dataset ids + digests</span>{"\n"}
            <span className="k">GET</span> /api/datasets/:id        <span className="v"># raw canonical dataset</span>{"\n"}
            <span className="k">GET</span> /api/attest/:id          <span className="v"># signed attestation (Ed25519)</span>
          </div>
          <p className="dim" style={{ fontSize: 13, marginBottom: 0 }}>
            Verifying what GEOM published will never sit behind a paywall.
            Public verifiability is the point. These three endpoints are all a
            verifier needs, from curl, a browser, or any language.
          </p>
        </div>
        <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p className="panel-title">
            Commercial API access <span className="badge info">request</span>
          </p>
          <p className="dim" style={{ fontSize: 13, margin: 0 }}>
            High-frequency polling, bulk history, webhook delivery on new
            attestations and anchors, and third-party co-signature feeds are
            offered under commercial terms as they ship. Verification stays
            public; the firehose is the product.
          </p>
          <div style={{ marginTop: "auto" }}>
            <a
              className="btn primary"
              href="mailto:request@geom.org?subject=GEOM%20Oracle%20API%20access%20request"
            >
              Request API access →
            </a>
          </div>
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
