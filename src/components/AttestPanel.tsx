"use client";

import { useState } from "react";
import { verifyMessage } from "ethers";

interface Attestation {
  domain: string;
  dataset: string;
  title: string;
  version: string;
  sha256: string;
  message: string;
  signer: string;
  signature: string;
  signedAt: string;
  devSigner: boolean;
}

export default function AttestPanel({
  datasets,
}: {
  datasets: Array<{ id: string; title: string }>;
}) {
  const [selected, setSelected] = useState(datasets[0]?.id ?? "");
  const [att, setAtt] = useState<Attestation | null>(null);
  const [verified, setVerified] = useState<"pending" | "valid" | "invalid" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = async () => {
    setLoading(true);
    setError(null);
    setAtt(null);
    setVerified(null);
    try {
      const res = await fetch(`/api/attest/${selected}`);
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const a: Attestation = await res.json();
      setAtt(a);
      setVerified("pending");
      const recovered = verifyMessage(a.message, a.signature);
      setVerified(
        recovered.toLowerCase() === a.signer.toLowerCase() ? "valid" : "invalid"
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel">
      <p className="panel-title">Request & verify an attestation</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="btn"
          style={{ appearance: "auto" }}
          aria-label="Dataset"
        >
          {datasets.map((d) => (
            <option key={d.id} value={d.id}>
              {d.id} — {d.title}
            </option>
          ))}
        </select>
        <button className="btn primary" onClick={request} disabled={loading}>
          {loading ? "Signing…" : "Request attestation"}
        </button>
      </div>

      {error && (
        <p className="dim" style={{ fontSize: 13 }}>
          Request failed: {error}. Try again — the signer runs on the API
          route.
        </p>
      )}

      {att && (
        <div className="kv-list">
          <div className="row">
            <span className="k">Verdict</span>
            <span className="v">
              {verified === "valid" && (
                <span className="badge good">
                  Signature valid — signer recovered in your browser
                </span>
              )}
              {verified === "invalid" && (
                <span className="badge critical">Signature mismatch</span>
              )}
              {verified === "pending" && <span className="badge">Verifying…</span>}
            </span>
          </div>
          <div className="row">
            <span className="k">Dataset</span>
            <span className="v mono" style={{ fontSize: 12 }}>
              {att.dataset} · v{att.version}
            </span>
          </div>
          <div className="row">
            <span className="k">SHA-256</span>
            <span className="v">
              <span className="hash">{att.sha256}</span>
            </span>
          </div>
          <div className="row">
            <span className="k">Message</span>
            <span className="v">
              <span className="hash">{att.message}</span>
            </span>
          </div>
          <div className="row">
            <span className="k">Signer</span>
            <span className="v">
              <span className="hash">
                {att.signer}
                {att.devSigner ? "  (dev key — set ORACLE_SIGNER_KEY in production)" : ""}
              </span>
            </span>
          </div>
          <div className="row">
            <span className="k">Signature</span>
            <span className="v">
              <span className="hash">{att.signature}</span>
            </span>
          </div>
          <div className="row">
            <span className="k">Signed at</span>
            <span className="v mono" style={{ fontSize: 12 }}>
              {att.signedAt}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
