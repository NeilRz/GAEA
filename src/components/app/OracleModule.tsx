"use client";

import tokenized from "@/data/tokenized.json";
import type { DatasetDetail } from "@/lib/oracle-catalog";
import type { AppData, AnchorRecord, OracleSelection } from "./GeomApp";
import ExplorerCatalog from "@/components/oracle/ExplorerCatalog";
import SeriesChart from "@/components/oracle/SeriesChart";
import VerifyCard from "@/components/oracle/VerifyCard";
import CodeSnippets from "@/components/oracle/CodeSnippets";
import CopyChip from "@/components/oracle/CopyChip";
import { TokenizationGapChart } from "@/components/charts";

function explorerUrl(a: AnchorRecord): string {
  return `https://explorer.solana.com/tx/${a.signature}${
    a.cluster === "mainnet-beta" ? "" : `?cluster=${a.cluster}`
  }`;
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
        Selected record <span className="badge info">record</span>
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

/* The tracker's headline analysis lives on the tokenized dataset now. */
function TokenizationGapPanel() {
  const liveCount = tokenized.assets.filter((a) => a.status === "live").length;
  const gapCount = tokenized.assets.filter((a) => a.status === "gap").length;
  return (
    <div className="panel">
      <p className="panel-title">
        The tokenization gap <span className="badge info">registry analysis</span>
      </p>
      <div className="stat-strip" style={{ marginBottom: 14 }}>
        <div className="stat-tile">
          <span className="stat-value">{tokenized.assets.length + tokenized.watchlist.length}</span>
          <span className="stat-label">Registry entries</span>
        </div>
        <div className="stat-tile">
          <span className="stat-value">{liveCount}</span>
          <span className="stat-label">Live products</span>
          <span className="stat-note">none of them crude or REE</span>
        </div>
        <div className="stat-tile">
          <span className="stat-value">{gapCount}</span>
          <span className="stat-label">Open gaps</span>
          <span className="stat-note">verified whitespaces</span>
        </div>
        <div className="stat-tile">
          <span className="stat-value">$0</span>
          <span className="stat-label">Tokenized crude + REE</span>
          <span className="stat-note">the market GEOM is built for</span>
        </div>
      </div>
      <TokenizationGapChart />
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
          <h1 className="page-title" style={{ fontSize: 26 }}>
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

          {detail.id === "tokenized" && <TokenizationGapPanel />}

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
  onSelectRecord,
  onShowMap,
}: {
  data: AppData;
  selection: OracleSelection;
  onSelect: (dataset: string | null) => void;
  onSelectRecord: (dataset: string, record: Record<string, unknown>) => void;
  onShowMap: (lngLat: [number, number], props?: Record<string, unknown>) => void;
}) {
  const detail = selection.dataset ? data.details[selection.dataset] : null;

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
    <ExplorerCatalog
      catalog={data.catalog}
      onOpenDataset={(id) => onSelect(id)}
      onOpenRecord={onSelectRecord}
    />
  );
}
