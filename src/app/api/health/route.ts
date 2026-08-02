import { NextResponse } from "next/server";
import bs58 from "bs58";
import { anchorManifestHash, getSigner } from "@/lib/attest";
import anchorsFile from "@/data/anchors.json";

/* One endpoint an uptime monitor can watch. Asserts the things that fail
   silently: which key is signing, whether the served datasets still match
   the latest on-chain anchor, and how old that anchor is. Returns 503 when
   any assertion fails so a plain status-code monitor catches it. */

interface AnchorRecord {
  anchoredAt: string;
  cluster: string;
  manifestSha256: string;
}

export async function GET() {
  const manifestHash = anchorManifestHash();
  const latest = (anchorsFile.anchors as AnchorRecord[])[0] ?? null;

  let signer: string | null = null;
  let devSigner = true;
  let signerError: string | null = null;
  try {
    const { keypair, dev } = getSigner();
    signer = bs58.encode(keypair.publicKey);
    devSigner = dev;
  } catch (e) {
    signerError = e instanceof Error ? e.message : "signer unavailable";
  }

  const anchorMatches = latest?.manifestSha256 === manifestHash;
  const anchorAgeDays = latest
    ? (Date.now() - new Date(latest.anchoredAt).getTime()) / 86_400_000
    : null;

  const ok = !devSigner && !signerError && anchorMatches;

  return NextResponse.json(
    {
      ok,
      signer,
      devSigner,
      signerError,
      manifestHash,
      anchor: latest
        ? {
            matches: anchorMatches,
            cluster: latest.cluster,
            anchoredAt: latest.anchoredAt,
            ageDays: anchorAgeDays === null ? null : Math.round(anchorAgeDays * 10) / 10,
          }
        : null,
      time: new Date().toISOString(),
    },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}
