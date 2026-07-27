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

/* Single-dataset variant of AttestPanel: the oracle signs on the server,
   the visitor's browser checks the Ed25519 signature locally. */
export default function VerifyCard({ id }: { id: string }) {
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
      const res = await fetch(`/api/attest/${id}`);
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
      <p className="panel-title">Verify this dataset</p>
      <p className="dim" style={{ fontSize: 13, marginTop: -6, marginBottom: 14 }}>
        The oracle signs the fingerprint of <span className="mono" style={{ fontSize: 12 }}>{id}</span>{" "}
        on the server; your browser then checks the signature itself, locally.
      </p>
      <button className="btn primary" onClick={request} disabled={loading}>
        {loading ? "Signing…" : "Request & verify attestation"}
      </button>

      {error && (
        <p className="dim" style={{ fontSize: 13, marginTop: 12 }}>
          Request failed: {error}. Try again, the signer runs on the API route.
        </p>
      )}

      {att && (
        <div style={{ marginTop: 16 }}>
          {verified === "valid" && (
            <div className="verdict-banner valid">
              <span className="verdict-mark" aria-hidden="true">✓</span>
              <div>
                <p className="verdict-title">Signature valid</p>
                <p className="verdict-sub">
                  Ed25519 signature verified locally in your browser, not by
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
                  The signature does not match the signer key, do not trust
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
              <span className="k">Message</span>
              <span className="v"><span className="hash">{att.message}</span></span>
            </div>
            <div className="row">
              <span className="k">Signature</span>
              <span className="v"><span className="hash">{att.signature}</span></span>
            </div>
            <div className="row">
              <span className="k">Signed at</span>
              <span className="v mono" style={{ fontSize: 12 }}>{att.signedAt}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
