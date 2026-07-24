import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import bs58 from "bs58";
import { anchorManifestHash, getSigner } from "@/lib/attest";
import { datasetDetail, datasetIds } from "@/lib/oracle-catalog";
import anchors from "@/data/anchors.json";
import SeriesChart from "@/components/oracle/SeriesChart";
import VerifyCard from "@/components/oracle/VerifyCard";
import CodeSnippets from "@/components/oracle/CodeSnippets";
import CopyChip from "@/components/oracle/CopyChip";

interface AnchorRecord {
  anchoredAt: string;
  cluster: string;
  slot: number | null;
  signature: string;
  signer: string;
  memo: string;
  manifestSha256: string;
}

function explorerUrl(a: AnchorRecord): string {
  return `https://explorer.solana.com/tx/${a.signature}${
    a.cluster === "mainnet-beta" ? "" : `?cluster=${a.cluster}`
  }`;
}

export function generateStaticParams() {
  return datasetIds().map((id) => ({ id }));
}

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await props.params;
  const d = datasetDetail(id);
  if (!d) return { title: "Oracle · GEOM" };
  return {
    title: `${d.id} · Oracle · GEOM`,
    description: `${d.title}: attested GEOM dataset, SHA-256 fingerprinted, Ed25519 signed, anchored on Solana.`,
  };
}

export default async function DatasetPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const d = datasetDetail(id);
  if (!d) notFound();

  const manifestHash = anchorManifestHash();
  const { keypair, dev } = getSigner();
  const signerAddress = bs58.encode(keypair.publicKey);
  const anchorHistory = (anchors.anchors as AnchorRecord[]) ?? [];
  const latestAnchor = anchorHistory[0];
  const anchorIsCurrent = latestAnchor?.manifestSha256 === manifestHash;

  return (
    <main className="main">
      <nav className="crumb" aria-label="Breadcrumb">
        <Link href="/oracle">Oracle</Link>
        <span aria-hidden="true">/</span>
        <span className="crumb-here">{d.id}</span>
      </nav>

      <header className="o-head">
        <div>
          <p className="eyebrow">{d.category.toUpperCase()}</p>
          <h1 className="page-title" style={{ fontSize: "clamp(28px, 3.8vw, 40px)" }}>
            {d.title}
          </h1>
          <p className="page-lede" style={{ fontSize: 14 }}>{d.description}</p>
        </div>
        <div className="o-head-badges">
          <span className="badge good">attested</span>
          {anchorIsCurrent ? (
            <span className="badge good">anchor current</span>
          ) : (
            <span className="badge warn">anchor stale</span>
          )}
          <span className="badge plain">{d.timeseries ? "weekly series" : "registry"}</span>
        </div>
      </header>

      <div className="o-detail-grid">
        <div style={{ display: "grid", gap: 20, minWidth: 0 }}>
          {d.series ? (
            <SeriesChart series={d.series} />
          ) : (
            <div className="panel">
              <p className="panel-title">About this dataset</p>
              <div className="grid grid-3">
                <div className="stat-tile">
                  <span className="stat-value" style={{ fontSize: 26 }}>{d.records}</span>
                  <span className="stat-label">Records</span>
                </div>
                <div className="stat-tile">
                  <span className="stat-value" style={{ fontSize: 26 }}>v{d.version}</span>
                  <span className="stat-label">Version</span>
                </div>
                <div className="stat-tile">
                  <span className="stat-value" style={{ fontSize: 26 }}>
                    {d.unit ?? "JSON"}
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

          <VerifyCard id={d.id} />
          <CodeSnippets id={d.id} />
        </div>

        <aside className="o-rail">
          <div className="panel">
            <p className="panel-title">Dataset metadata</p>
            <div className="kv-list">
              <div className="row">
                <span className="k">Id</span>
                <span className="v mono" style={{ fontSize: 12 }}>{d.id}</span>
              </div>
              <div className="row">
                <span className="k">Version</span>
                <span className="v mono" style={{ fontSize: 12 }}>v{d.version}</span>
              </div>
              <div className="row">
                <span className="k">Records</span>
                <span className="v mono" style={{ fontSize: 12 }}>{d.records}</span>
              </div>
              <div className="row">
                <span className="k">Cadence</span>
                <span className="v" style={{ fontSize: 12.5 }}>{d.cadence}</span>
              </div>
              {d.schedule && (
                <div className="row">
                  <span className="k">Schedule</span>
                  <span className="v" style={{ fontSize: 12.5 }}>{d.schedule}</span>
                </div>
              )}
              <div className="row">
                <span className="k">Sources</span>
                <span className="v" style={{ fontSize: 12.5 }}>{d.sources.join(" · ")}</span>
              </div>
              {d.license && (
                <div className="row">
                  <span className="k">License</span>
                  <span className="v" style={{ fontSize: 12.5 }}>{d.license}</span>
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
                  <span className="hash">{d.sha256}</span>
                </span>
              </div>
              <div className="row">
                <span className="k">Signer</span>
                <span className="v">
                  <span className="hash">
                    {signerAddress}
                    {dev ? "  (dev key, set ORACLE_SIGNER_KEY in production)" : ""}
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
              <CopyChip value={d.sha256} label="COPY SHA-256" />
              <CopyChip value={signerAddress} label="COPY SIGNER" />
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
                    href={`/api/datasets/${d.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    /api/datasets/{d.id}
                  </a>
                </span>
              </div>
              <div className="row">
                <span className="k">Attest</span>
                <span className="v">
                  <a
                    className="mono"
                    style={{ color: "var(--glacial-bright)", fontSize: 12 }}
                    href={`/api/attest/${d.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    /api/attest/{d.id}
                  </a>
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
