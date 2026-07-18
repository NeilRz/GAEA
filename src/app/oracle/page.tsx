import type { Metadata } from "next";
import { datasetHashes, anchorManifestHash, getSigner } from "@/lib/attest";
import bs58 from "bs58";
import anchors from "@/data/anchors.json";
import AttestPanel from "@/components/AttestPanel";

export const metadata: Metadata = {
  title: "Oracle — GAEA",
  description:
    "Signed SHA-256 attestations over GAEA datasets, anchored on Solana, verifiable by anyone.",
};

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

function shortSig(sig: string): string {
  return `${sig.slice(0, 8)}…${sig.slice(-8)}`;
}

export default function OraclePage() {
  const hashes = datasetHashes();
  const manifestHash = anchorManifestHash();
  const { keypair, dev } = getSigner();
  const signerAddress = bs58.encode(keypair.publicKey);
  const anchorHistory = (anchors.anchors as AnchorRecord[]) ?? [];
  const latestAnchor = anchorHistory[0];
  const anchorIsCurrent = latestAnchor?.manifestSha256 === manifestHash;

  return (
    <main className="main">
      <p className="eyebrow">MOD-05</p>
      <h1 className="page-title">Oracle</h1>
      <p className="page-lede">
        Every dataset GAEA publishes is fingerprinted, signed by the oracle
        key, and anchored on the Solana blockchain. Anyone — a counterparty, a
        regulator, an allocator — can prove what GAEA published and when,
        without trusting this website. A notarized data feed: nothing is
        issued, deployed, or custodied through it.
      </p>

      <div style={{ display: "grid", gap: 20, marginTop: 24 }}>
        <section className="grid grid-4">
          <div className="panel stat-tile">
            <span className="stat-value">
              {hashes.length}
              <span className="unit">datasets</span>
            </span>
            <span className="stat-label">Under signed attestation</span>
            <span className="stat-note">sha-256 over canonical json</span>
          </div>
          <div className="panel stat-tile">
            <span className="stat-value">
              {latestAnchor?.slot ? latestAnchor.slot.toLocaleString("en-US") : "—"}
            </span>
            <span className="stat-label">Latest anchor · Solana slot</span>
            <span className="stat-note">
              {latestAnchor
                ? new Date(latestAnchor.anchoredAt).toUTCString().replace("GMT", "UTC")
                : "not yet anchored"}
            </span>
          </div>
          <div className="panel stat-tile">
            <span className="stat-value" style={{ fontSize: 20, paddingTop: 4 }}>
              ED25519
            </span>
            <span className="stat-label">Signature scheme</span>
            <span className="stat-note">standard solana keypair</span>
          </div>
          <div className="panel stat-tile">
            <span className="stat-value" style={{ fontSize: 20, paddingTop: 4 }}>
              {anchorIsCurrent ? (
                <span className="badge good" style={{ fontSize: 11 }}>
                  Anchor current
                </span>
              ) : (
                <span className="badge warn" style={{ fontSize: 11 }}>
                  Anchor stale
                </span>
              )}
            </span>
            <span className="stat-label">Manifest vs. on-chain state</span>
            <span className="stat-note mono" style={{ wordBreak: "break-all" }}>
              {manifestHash.slice(0, 16)}…
            </span>
          </div>
        </section>

        <section className="panel">
          <p className="panel-title">How it works</p>
          <div className="grid grid-3">
            <div className="step">
              <span className="step-num">STEP 01 — FINGERPRINT</span>
              <h4>Hash</h4>
              <p>
                Each dataset is canonicalized (keys recursively sorted) and
                reduced to a SHA-256 digest — a unique fingerprint. Change one
                digit anywhere and the fingerprint changes completely.
              </p>
            </div>
            <div className="step">
              <span className="step-num">STEP 02 — SIGN</span>
              <h4>Sign</h4>
              <p>
                The oracle key signs{" "}
                <code className="mono" style={{ fontSize: 11, color: "var(--glacial-bright)" }}>
                  GAEA-ATTEST-V2|dataset|version|hash
                </code>{" "}
                with Ed25519. Verification runs in your own browser — you never
                have to take this page&apos;s word for it.
              </p>
            </div>
            <div className="step">
              <span className="step-num">STEP 03 — ANCHOR</span>
              <h4>Anchor on Solana</h4>
              <p>
                Each publication window, the manifest of all digests is written
                to the Solana ledger in a signed Memo transaction — a public,
                permanent timestamp no one can edit, including GAEA.
              </p>
            </div>
          </div>
        </section>

        <AttestPanel datasets={hashes.map((h) => ({ id: h.id, title: h.title }))} />

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
              No anchors published yet. Run <code className="mono">npm run anchor</code>.
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
                      {signerAddress}
                      {dev ? "  (dev key — set ORACLE_SIGNER_KEY in production)" : ""}
                    </span>
                  </span>
                </div>
                <div className="row">
                  <span className="k">Transaction</span>
                  <span className="v">
                    <span className="hash">{shortSig(latestAnchor.signature)}</span>
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
              {anchorHistory.length > 1 && (
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
                      {anchorHistory.map((a) => (
                        <tr key={a.signature}>
                          <td className="mono dim" style={{ fontSize: 12 }}>
                            {a.anchoredAt}
                          </td>
                          <td className="mono dim">{a.cluster}</td>
                          <td className="mono dim" style={{ fontSize: 11, wordBreak: "break-all" }}>
                            {a.manifestSha256}
                          </td>
                          <td>
                            {a.manifestSha256 === manifestHash ? (
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

        <section>
          <p className="panel-title">Current dataset digests</p>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Dataset</th>
                  <th>Version</th>
                  <th>SHA-256 (canonical JSON)</th>
                  <th>Raw</th>
                </tr>
              </thead>
              <tbody>
                {hashes.map((h) => (
                  <tr key={h.id}>
                    <td>
                      <span className="mono" style={{ color: "var(--ink)" }}>{h.id}</span>
                      <br />
                      <span className="dim" style={{ fontSize: 12 }}>{h.title}</span>
                    </td>
                    <td className="mono dim">v{h.version}</td>
                    <td className="mono dim" style={{ fontSize: 11, wordBreak: "break-all" }}>
                      {h.sha256}
                    </td>
                    <td>
                      <a
                        className="mono"
                        style={{ color: "var(--glacial-bright)", fontSize: 12 }}
                        href={`/api/datasets/${h.id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        /api/datasets/{h.id}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <p className="panel-title">API — verify independently</p>
          <div className="codeblock">
            <span className="k">GET</span> /api/datasets            <span className="v"># all dataset ids + digests</span>{"\n"}
            <span className="k">GET</span> /api/datasets/:id        <span className="v"># raw canonical dataset</span>{"\n"}
            <span className="k">GET</span> /api/attest/:id          <span className="v"># signed attestation (Ed25519)</span>
          </div>
          <p className="dim" style={{ fontSize: 13, marginBottom: 0 }}>
            Third parties can recompute each SHA-256 from the raw dataset,
            verify the detached Ed25519 signature against the published signer
            address, and confirm the manifest hash inside the Solana memo —
            three checks, zero trust in this server. Anchoring runs via{" "}
            <code className="mono">npm run anchor</code>. Roadmap: mainnet
            anchoring per publication window, attestation history, third-party
            data provider co-signatures.
          </p>
        </section>
      </div>
    </main>
  );
}
