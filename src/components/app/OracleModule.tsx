"use client";

import type { DatasetDetail } from "@/lib/oracle-catalog";
import type { AppData, AnchorRecord, OracleSelection } from "./GeomApp";
import DatasetCatalog from "@/components/oracle/DatasetCatalog";
import SeriesChart from "@/components/oracle/SeriesChart";
import VerifyCard from "@/components/oracle/VerifyCard";
import CodeSnippets from "@/components/oracle/CodeSnippets";
import CopyChip from "@/components/oracle/CopyChip";
import OracleQuickstart from "@/components/OracleQuickstart";

function explorerUrl(a: AnchorRecord): string {
  return `https://explorer.solana.com/tx/${a.signature}${
    a.cluster === "mainnet-beta" ? "" : `?cluster=${a.cluster}`
  }`;
}

function shortSig(sig: string): string {
  return `${sig.slice(0, 8)}…${sig.slice(-8)}`;
}

/* Friendly labels for the compact keys the map's plant popups carry. */
const RECORD_KEY_LABELS: Record<string, string> = {
  n: "Name",
  c: "Country",
  f: "Fuel",
  mw: "Capacity (MW)",
};

function RecordPanel({
  record,
  lngLat,
  detail,
  onShowMap,
}: {
  record: Record<string, unknown>;
  lngLat?: [number, number];
  detail: DatasetDetail;
  onShowMap: (lngLat: [number, number], props?: Record<string, unknown>) => void;
}) {
  const entries = Object.entries(record).filter(
    ([, v]) => v !== "" && v !== undefined && v !== null
  );
  const title = String(record.name ?? record.n ?? "Selected record");
  return (
    <div className="panel record-panel">
      <p className="panel-title">
        Linked from the map <span className="badge info">record</span>
      </p>
      <p className="record-title">{title}</p>
      <div className="kv-list" style={{ marginBottom: 12 }}>
        {entries
          .filter(([k]) => !["name", "n", "kind"].includes(k))
          .map(([k, v]) => (
            <div className="row" key={k}>
              <span className="k">{RECORD_KEY_LABELS[k] ?? k}</span>
              <span className="v" style={{ fontSize: 13 }}>
                {typeof v === "boolean" ? (v ? "yes" : "no") : String(v)}
              </span>
            </div>
          ))}
      </div>
      <p className="dimmer" style={{ fontSize: 12, margin: "0 0 12px" }}>
        This record ships inside the <span className="mono">{detail.id}</span>{" "}
        dataset, v{detail.version}. The attestation below covers its exact
        bytes, verify it, then fetch the raw record from the data endpoint.
      </p>
      {lngLat && (
        <button className="btn" style={{ fontSize: 13 }} onClick={() => onShowMap(lngLat, record)}>
          ← Show on map
        </button>
      )}
    </div>
  );
}

function DatasetDetailView({
  detail,
  data,
  selection,
  onBack,
  onShowMap,
}: {
  detail: DatasetDetail;
  data: AppData;
  selection: OracleSelection;
  onBack: () => void;
  onShowMap: (lngLat: [number, number], props?: Record<string, unknown>) => void;
}) {
  const latestAnchor = data.anchors[0];
  const anchorIsCurrent = latestAnchor?.manifestSha256 === data.manifestHash;
  const record =
    selection.dataset === detail.id && selection.record ? selection.record : null;

  return (
    <>
      <nav className="crumb" aria-label="Breadcrumb">
        <button className="crumb-link" onClick={onBack}>
          Oracle
        </button>
        <span aria-hidden="true">/</span>
        <span className="crumb-here">{detail.id}</span>
      </nav>

      <header className="o-head">
        <div>
          <p className="eyebrow">{detail.category.toUpperCase()}</p>
          <h1 className="page-title" style={{ fontSize: "clamp(26px, 3.4vw, 36px)" }}>
            {detail.title}
          </h1>
          <p className="page-lede" style={{ fontSize: 14 }}>{detail.description}</p>
        </div>
        <div className="o-head-badges">
          <span className="badge good">attested</span>
          {anchorIsCurrent ? (
            <span className="badge good">anchor current</span>
          ) : (
            <span className="badge warn">anchor stale</span>
          )}
          <span className="badge plain">{detail.timeseries ? "weekly series" : "registry"}</span>
        </div>
      </header>

      <div className="o-detail-grid">
        <div style={{ display: "grid", gap: 20, minWidth: 0 }}>
          {record && (
            <RecordPanel
              record={record}
              lngLat={selection.lngLat}
              detail={detail}
              onShowMap={onShowMap}
            />
          )}

          {detail.series ? (
            <SeriesChart series={detail.series} />
          ) : (
            <div className="panel">
              <p className="panel-title">About this dataset</p>
              <div className="grid grid-3">
                <div className="stat-tile">
                  <span className="stat-value" style={{ fontSize: 26 }}>{detail.records}</span>
                  <span className="stat-label">Records</span>
                </div>
                <div className="stat-tile">
                  <span className="stat-value" style={{ fontSize: 26 }}>v{detail.version}</span>
                  <span className="stat-label">Version</span>
                </div>
                <div className="stat-tile">
                  <span className="stat-value" style={{ fontSize: 26 }}>
                    {detail.unit ?? "JSON"}
                  </span>
                  <span className="stat-label">Unit</span>
                </div>
              </div>
              <p className="provenance">
                Static registry dataset: it changes only on revision, and every
                revision is re-fingerprinted, re-signed, and re-anchored.
                Informational only, not investment advice.
              </p>
            </div>
          )}

          <VerifyCard id={detail.id} />
          <CodeSnippets id={detail.id} />
        </div>

        <aside className="o-rail">
          <div className="panel">
            <p className="panel-title">Dataset metadata</p>
            <div className="kv-list">
              <div className="row">
                <span className="k">Id</span>
                <span className="v mono" style={{ fontSize: 12 }}>{detail.id}</span>
              </div>
              <div className="row">
                <span className="k">Version</span>
                <span className="v mono" style={{ fontSize: 12 }}>v{detail.version}</span>
              </div>
              <div className="row">
                <span className="k">Records</span>
                <span className="v mono" style={{ fontSize: 12 }}>{detail.records}</span>
              </div>
              <div className="row">
                <span className="k">Cadence</span>
                <span className="v" style={{ fontSize: 12.5 }}>{detail.cadence}</span>
              </div>
              {detail.schedule && (
                <div className="row">
                  <span className="k">Schedule</span>
                  <span className="v" style={{ fontSize: 12.5 }}>{detail.schedule}</span>
                </div>
              )}
              <div className="row">
                <span className="k">Sources</span>
                <span className="v" style={{ fontSize: 12.5 }}>{detail.sources.join(" · ")}</span>
              </div>
              {detail.license && (
                <div className="row">
                  <span className="k">License</span>
                  <span className="v" style={{ fontSize: 12.5 }}>{detail.license}</span>
                </div>
              )}
            </div>
          </div>

          <div className="panel">
            <p className="panel-title">Attestation</p>
            <div className="kv-list">
              <div className="row">
                <span className="k">SHA-256</span>
                <span className="v">
                  <span className="hash">{detail.sha256}</span>
                </span>
              </div>
              <div className="row">
                <span className="k">Signer</span>
                <span className="v">
                  <span className="hash">
                    {data.signer}
                    {data.signerDev ? "  (dev key, set ORACLE_SIGNER_KEY in production)" : ""}
                  </span>
                </span>
              </div>
              <div className="row">
                <span className="k">Scheme</span>
                <span className="v mono" style={{ fontSize: 12 }}>
                  Ed25519 · GAEA-ATTEST-V2
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
              <CopyChip value={detail.sha256} label="COPY SHA-256" />
              <CopyChip value={data.signer} label="COPY SIGNER" />
            </div>
          </div>

          <div className="panel">
            <p className="panel-title">
              On-chain anchor
              {latestAnchor &&
                (anchorIsCurrent ? (
                  <span className="badge good">current</span>
                ) : (
                  <span className="badge warn">stale</span>
                ))}
            </p>
            {!latestAnchor ? (
              <p className="dim" style={{ fontSize: 13, margin: 0 }}>
                No anchors published yet.
              </p>
            ) : (
              <>
                <div className="kv-list">
                  <div className="row">
                    <span className="k">Network</span>
                    <span className="v mono" style={{ fontSize: 12 }}>
                      Solana {latestAnchor.cluster}
                    </span>
                  </div>
                  <div className="row">
                    <span className="k">Slot</span>
                    <span className="v mono" style={{ fontSize: 12 }}>
                      {latestAnchor.slot?.toLocaleString("en-US") ?? "—"}
                    </span>
                  </div>
                  <div className="row">
                    <span className="k">Anchored</span>
                    <span className="v mono" style={{ fontSize: 12 }}>
                      {new Date(latestAnchor.anchoredAt)
                        .toUTCString()
                        .replace("GMT", "UTC")}
                    </span>
                  </div>
                </div>
                <p className="dimmer" style={{ fontSize: 11.5, margin: "10px 0 12px" }}>
                  One Memo transaction commits to the digest manifest of all
                  datasets at once, including this one.
                </p>
                <a
                  className="btn"
                  style={{ fontSize: 13 }}
                  href={explorerUrl(latestAnchor)}
                  target="_blank"
                  rel="noreferrer"
                >
                  View on Solana Explorer →
                </a>
              </>
            )}
          </div>

          <div className="panel">
            <p className="panel-title">Endpoints</p>
            <div className="kv-list">
              <div className="row">
                <span className="k">Data</span>
                <span className="v">
                  <a
                    className="mono"
                    style={{ color: "var(--glacial-bright)", fontSize: 12 }}
                    href={`/api/datasets/${detail.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    /api/datasets/{detail.id}
                  </a>
                </span>
              </div>
              <div className="row">
                <span className="k">Attest</span>
                <span className="v">
                  <a
                    className="mono"
                    style={{ color: "var(--glacial-bright)", fontSize: 12 }}
                    href={`/api/attest/${detail.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    /api/attest/{detail.id}
                  </a>
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

export default function OracleModule({
  data,
  selection,
  onSelect,
  onShowMap,
}: {
  data: AppData;
  selection: OracleSelection;
  onSelect: (dataset: string | null) => void;
  onShowMap: (lngLat: [number, number], props?: Record<string, unknown>) => void;
}) {
  const detail = selection.dataset ? data.details[selection.dataset] : null;
  const latestAnchor = data.anchors[0];
  const anchorIsCurrent = latestAnchor?.manifestSha256 === data.manifestHash;

  if (detail) {
    return (
      <main className="main">
        <DatasetDetailView
          detail={detail}
          data={data}
          selection={selection}
          onBack={() => onSelect(null)}
          onShowMap={onShowMap}
        />
      </main>
    );
  }

  return (
    <main className="main">
      <div className="o-head" style={{ marginBottom: 16 }}>
        <div>
          <p className="eyebrow">MOD-04 · THE TRUST LAYER</p>
          <h1 className="page-title" style={{ fontSize: "clamp(26px, 3.4vw, 36px)" }}>
            Oracle
          </h1>
          <p className="page-lede" style={{ fontSize: 14 }}>
            Every dataset GEOM publishes is fingerprinted, signed by the oracle
            key, and anchored on Solana. A notarized data feed: nothing is
            issued, deployed, or custodied through it. Click a dataset on the
            map, in the tracker, or below, then verify it yourself.
          </p>
        </div>
        <div className="o-head-badges">
          <span className="badge good">{data.catalog.length} datasets attested</span>
          {anchorIsCurrent ? (
            <span className="badge good">anchor current</span>
          ) : (
            <span className="badge warn">anchor stale</span>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gap: 20 }}>
        <DatasetCatalog rows={data.catalog} onOpen={(id) => onSelect(id)} />

        <section className="panel">
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
                <div className="table-wrap" style={{ marginTop: 18 }}>
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
                          <td className="mono dim" style={{ fontSize: 12 }}>
                            {a.anchoredAt}
                          </td>
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

        <OracleQuickstart />

        <section className="grid grid-2">
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
              Public verifiability is the point. These three endpoints are all
              a verifier needs, from curl, a browser, or any language.
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
      </div>
    </main>
  );
}
