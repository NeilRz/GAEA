"use client";

import { useState } from "react";
import { highlight } from "@/components/OracleQuickstart";

/* Pyth-style "</> Code" window scoped to one dataset: the same qs-win
   chrome as the quickstart, with per-dataset endpoints baked in. */

const BASE = "https://gaea-gray.vercel.app";

function tabsFor(id: string): Array<{ id: string; label: string; code: string }> {
  return [
    {
      id: "curl",
      label: "curl",
      code: `# The three public endpoints for ${id}. No key, no account.
curl ${BASE}/api/datasets/${id}     # the raw canonical dataset
curl ${BASE}/api/attest/${id}       # its signed attestation (Ed25519)
curl ${BASE}/api/datasets           # all dataset ids + digests`,
    },
    {
      id: "fetch",
      label: "Fetch it",
      code: `// Any language, it's just HTTPS + JSON.
const res = await fetch("${BASE}/api/datasets/${id}");
const data = await res.json();

console.log(data.meta.title);
console.log(data.meta.version);`,
    },
    {
      id: "verify",
      label: "Verify it",
      code: `// Check the oracle's signature on ${id} from your own machine.
import nacl from "tweetnacl";
import bs58 from "bs58";

const att = await (await fetch("${BASE}/api/attest/${id}")).json();

const ok = nacl.sign.detached.verify(
  new TextEncoder().encode(att.message),  // what was signed
  bs58.decode(att.signature),             // the signature
  bs58.decode(att.signer)                 // the oracle's public key
);

console.log(ok ? "signature valid" : "DO NOT TRUST");

// The full verifier (recomputes the SHA-256 too) lives on the
// oracle page under "Verify from your own machine".`,
    },
  ];
}

export default function CodeSnippets({ id }: { id: string }) {
  const tabs = tabsFor(id);
  const [tab, setTab] = useState(tabs[0].id);
  const [copied, setCopied] = useState(false);
  const active = tabs.find((t) => t.id === tab)!;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(active.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable, ignore */
    }
  };

  return (
    <div className="qs-win">
      <div className="qs-head">
        <span className="left">
          <span className="tick" />
          {"</>"} CODE · {id.toUpperCase()}
        </span>
        <span className="qs-tabs">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`dl-chip ${tab === t.id ? "on" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </span>
      </div>
      <div className="qs-body">
        <pre className="qs-code">{highlight(active.code)}</pre>
        <button className="dl-chip qs-copy" onClick={copy}>
          {copied ? "COPIED ✓" : "COPY"}
        </button>
      </div>
    </div>
  );
}
