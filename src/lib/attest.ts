import { createHash } from "node:crypto";
import { Wallet } from "ethers";
import reserves from "@/data/reserves.json";
import fields from "@/data/fields.json";
import tokenized from "@/data/tokenized.json";
import market from "@/data/market.json";
import briefs from "@/data/briefs.json";

/**
 * GAEA Oracle v1 — verifiable data attestation.
 *
 * Every dataset is canonicalized (recursively sorted keys), hashed with
 * SHA-256, and the digest is signed by the GAEA oracle key over the
 * message `GAEA-ATTEST-V1|<dataset>|<version>|<sha256>`. Anyone can
 * recompute the hash from /api/datasets/:id and recover the signer with
 * a standard EIP-191 personal-message verification.
 */

export const ATTEST_DOMAIN = "GAEA-ATTEST-V1";

// Dev signer only. Set ORACLE_SIGNER_KEY in production; without it, the key
// is derived from a public string and provides no security guarantees.
const DEV_KEY_SEED = "gaea-dev-oracle-signer-v1-DO-NOT-USE-IN-PRODUCTION";

export const DATASETS: Record<
  string,
  { data: unknown; title: string; version: string }
> = {
  reserves: {
    data: reserves,
    title: reserves.meta.title,
    version: reserves.meta.version,
  },
  fields: {
    data: fields,
    title: fields.meta.title,
    version: fields.meta.version,
  },
  tokenized: {
    data: tokenized,
    title: tokenized.meta.title,
    version: tokenized.meta.version,
  },
  market: {
    data: market,
    title: market.meta.title,
    version: market.meta.version,
  },
  briefs: {
    data: briefs,
    title: briefs.meta.title,
    version: briefs.meta.version,
  },
};

export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`);
  return `{${entries.join(",")}}`;
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

function getSigner(): { wallet: Wallet; dev: boolean } {
  const envKey = process.env.ORACLE_SIGNER_KEY;
  if (envKey) return { wallet: new Wallet(envKey), dev: false };
  const derived = "0x" + createHash("sha256").update(DEV_KEY_SEED).digest("hex");
  return { wallet: new Wallet(derived), dev: true };
}

export function attestMessage(
  datasetId: string,
  version: string,
  hash: string
): string {
  return `${ATTEST_DOMAIN}|${datasetId}|${version}|${hash}`;
}

export interface Attestation {
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

export async function attest(datasetId: string): Promise<Attestation | null> {
  const entry = DATASETS[datasetId];
  if (!entry) return null;
  const hash = sha256Hex(canonicalize(entry.data));
  const message = attestMessage(datasetId, entry.version, hash);
  const { wallet, dev } = getSigner();
  const signature = await wallet.signMessage(message);
  return {
    domain: ATTEST_DOMAIN,
    dataset: datasetId,
    title: entry.title,
    version: entry.version,
    sha256: hash,
    message,
    signer: wallet.address,
    signature,
    signedAt: new Date().toISOString(),
    devSigner: dev,
  };
}

export function datasetHashes(): Array<{
  id: string;
  title: string;
  version: string;
  sha256: string;
}> {
  return Object.entries(DATASETS).map(([id, entry]) => ({
    id,
    title: entry.title,
    version: entry.version,
    sha256: sha256Hex(canonicalize(entry.data)),
  }));
}
