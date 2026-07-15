import type { Metadata } from "next";
import { datasetHashes } from "@/lib/attest";
import AttestPanel from "@/components/AttestPanel";

export const metadata: Metadata = {
  title: "Oracle — GAEA",
  description:
    "Signed SHA-256 attestations over GAEA datasets, verifiable by anyone.",
};

export default function OraclePage() {
  const hashes = datasetHashes();

  return (
    <main className="main">
      <p className="eyebrow">MOD-05</p>
      <h1 className="page-title">Oracle</h1>
      <p className="page-lede">
        Every GAEA dataset is canonicalized (recursively sorted keys), hashed
        with SHA-256, and signed by the oracle key over the message{" "}
        <code className="mono" style={{ fontSize: 13, color: "var(--glacial-bright)" }}>
          GAEA-ATTEST-V1|dataset|version|hash
        </code>
        . Verification happens in your browser with standard EIP-191 recovery —
        you don&apos;t have to trust this page. This is the primitive that
        turns an intelligence layer into settlement infrastructure.
      </p>

      <div style={{ display: "grid", gap: 20, marginTop: 24 }}>
        <AttestPanel datasets={hashes.map((h) => ({ id: h.id, title: h.title }))} />

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
          <p className="panel-title">API</p>
          <div className="codeblock">
            <span className="k">GET</span> /api/datasets            <span className="v"># all dataset ids + digests</span>{"\n"}
            <span className="k">GET</span> /api/datasets/:id        <span className="v"># raw canonical dataset</span>{"\n"}
            <span className="k">GET</span> /api/attest/:id          <span className="v"># signed attestation (EIP-191)</span>
          </div>
          <p className="dim" style={{ fontSize: 13, marginBottom: 0 }}>
            Roadmap: periodic on-chain anchoring of digests (one transaction
            per publication window), attestation history, and third-party data
            provider co-signatures.
          </p>
        </section>
      </div>
    </main>
  );
}
