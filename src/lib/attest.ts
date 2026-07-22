import { createHash } from "node:crypto";
import nacl from "tweetnacl";
import bs58 from "bs58";
import reserves from "@/data/reserves.json";
import fields from "@/data/fields.json";
import tokenized from "@/data/tokenized.json";
import market from "@/data/market.json";
import sites from "@/data/sites.json";
import plants from "@/data/plants.json";
import pipelinesData from "@/data/pipelines.json";
import eia from "@/data/eia.json";

/**
 * GAEA Oracle v2, verifiable data attestation, Solana-native.
 *
 * Every dataset is canonicalized (recursively sorted keys), hashed with
 * SHA-256, and the digest is signed by the GAEA oracle key (Ed25519, a
 * standard Solana keypair) over the message
 * `GAEA-ATTEST-V2|<dataset>|<version>|<sha256>`. Anyone can recompute the
 * hash from /api/datasets/:id and verify the detached Ed25519 signature
 * against the published signer pubkey. The same key anchors the digest
 * manifest on Solana via the Memo program (see scripts/anchor.ts).
 */

export const ATTEST_DOMAIN = "GAEA-ATTEST-V2";
export const ANCHOR_DOMAIN = "GAEA-ANCHOR-V1";

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
  sites: {
    data: sites,
    title: sites.meta.title,
    version: sites.meta.version,
  },
  plants: {
    data: plants,
    title: plants.meta.title,
    version: plants.meta.version,
  },
  pipelines: {
    data: pipelinesData,
    title: pipelinesData.meta.title,
    version: pipelinesData.meta.version,
  },
  eia: {
    data: eia,
    title: eia.meta.title,
    version: eia.meta.version,
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

// ORACLE_SIGNER_KEY accepts either a base58-encoded 64-byte secret key or a
// solana-keygen JSON array. Both are the standard Solana secret-key formats.
function parseSecretKey(raw: string): Uint8Array {
  const trimmed = raw.trim();
  const bytes = trimmed.startsWith("[")
    ? Uint8Array.from(JSON.parse(trimmed) as number[])
    : bs58.decode(trimmed);
  if (bytes.length !== nacl.sign.secretKeyLength) {
    throw new Error(
      `ORACLE_SIGNER_KEY must be a ${nacl.sign.secretKeyLength}-byte Ed25519 secret key (got ${bytes.length} bytes)`
    );
  }
  return bytes;
}

export function getSigner(): { keypair: nacl.SignKeyPair; dev: boolean } {
  const envKey = process.env.ORACLE_SIGNER_KEY;
  if (envKey) {
    return { keypair: nacl.sign.keyPair.fromSecretKey(parseSecretKey(envKey)), dev: false };
  }
  const seed = createHash("sha256").update(DEV_KEY_SEED).digest();
  return { keypair: nacl.sign.keyPair.fromSeed(seed), dev: true };
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
  scheme: "ed25519";
  dataset: string;
  title: string;
  version: string;
  sha256: string;
  message: string;
  /** Base58 Ed25519 public key, the oracle's Solana address. */
  signer: string;
  /** Base58 detached Ed25519 signature over the UTF-8 message bytes. */
  signature: string;
  signedAt: string;
  devSigner: boolean;
}

export function attest(datasetId: string): Attestation | null {
  const entry = DATASETS[datasetId];
  if (!entry) return null;
  const hash = sha256Hex(canonicalize(entry.data));
  const message = attestMessage(datasetId, entry.version, hash);
  const { keypair, dev } = getSigner();
  const signature = nacl.sign.detached(
    new TextEncoder().encode(message),
    keypair.secretKey
  );
  return {
    domain: ATTEST_DOMAIN,
    scheme: "ed25519",
    dataset: datasetId,
    title: entry.title,
    version: entry.version,
    sha256: hash,
    message,
    signer: bs58.encode(keypair.publicKey),
    signature: bs58.encode(signature),
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

/**
 * The anchor manifest is the canonical list of dataset digests. Its SHA-256
 * is what gets written to Solana (memo `GAEA-ANCHOR-V1|<manifestSha256>`),
 * so one transaction commits to every dataset at once.
 */
export function anchorManifest(): {
  domain: string;
  datasets: Array<{ id: string; version: string; sha256: string }>;
} {
  return {
    domain: ANCHOR_DOMAIN,
    datasets: datasetHashes()
      .map(({ id, version, sha256 }) => ({ id, version, sha256 }))
      .sort((a, b) => (a.id < b.id ? -1 : 1)),
  };
}

export function anchorManifestHash(): string {
  return sha256Hex(canonicalize(anchorManifest()));
}
