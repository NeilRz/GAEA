"use client";

import { useState } from "react";
import nacl from "tweetnacl";
import bs58 from "bs58";

interface Attestation {
  domain: string;
  scheme: "ed25519";
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
      const ok = nacl.sign.detached.verify(
        new TextEncoder().encode(a.message),
        bs58.decode(a.signature),
        bs58.decode(a.signer)
      );
      setVerified(ok ? "valid" : "invalid");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel">
      <p className="panel-title">Live demo — request & verify an attestation</p>
      <p className="dim" style={{ fontSize: 13, marginTop: -6, marginBottom: 14 }}>
        Pick a dataset. The oracle signs its fingerprint on the server; your
        browser then checks the signature itself, locally.
      </p>
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
        <>
          {verified === "valid" && (
            <div className="verdict-banner valid">
              <span className="verdict-mark" aria-hidden="true">✓</span>
              <div>
                <p className="verdict-title">Signature valid</p>
                <p className="verdict-sub">
                  Ed25519 signature verified locally in your browser — not by
                  this server.
                </p>
              </div>
            </div>
          )}
          {verified === "invalid" && (
            <div className="verdict-banner invalid">
              <span className="verdict-mark" aria-hidden="true">✕</span>
              <div>
                <p className="verdict-title">Signature mismatch</p>
                <p className="verdict-sub">
                  The signature does not match the signer key — do not trust
                  this attestation.
                </p>
              </div>
            </div>
          )}
          {verified === "pending" && (
            <p className="dim" style={{ fontSize: 13 }}>Verifying…</p>
          )}
        <div className="kv-list">
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
        </>
      )}
    </div>
  );
}
