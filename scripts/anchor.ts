/**
 * GAEA anchor publisher — writes the dataset-digest manifest hash to Solana.
 *
 * One transaction per publication window: the SHA-256 of the canonical
 * manifest (every dataset id + version + digest) goes into a Memo-program
 * instruction signed by the oracle key. Appends the confirmed transaction
 * to src/data/anchors.json so /oracle can display anchor history.
 *
 * Usage:  npm run anchor
 * Env:    ORACLE_SIGNER_KEY  base58 or JSON-array Ed25519 secret key
 *                            (falls back to .keys/oracle-devnet.json,
 *                            generated on first run — devnet only)
 *         SOLANA_RPC_URL     default https://api.devnet.solana.com
 *         SOLANA_CLUSTER     explorer label + airdrop guard, default devnet
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import { ANCHOR_DOMAIN, anchorManifest, anchorManifestHash } from "../src/lib/attest";

const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ANCHORS_PATH = join(ROOT, "src", "data", "anchors.json");
const DEV_KEYFILE = join(ROOT, ".keys", "oracle-devnet.json");

const RPC_URL = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const CLUSTER = process.env.SOLANA_CLUSTER ?? "devnet";

function loadKeypair(): Keypair {
  const envKey = process.env.ORACLE_SIGNER_KEY;
  if (envKey) {
    const trimmed = envKey.trim();
    const bytes = trimmed.startsWith("[")
      ? Uint8Array.from(JSON.parse(trimmed) as number[])
      : bs58.decode(trimmed);
    return Keypair.fromSecretKey(bytes);
  }
  if (CLUSTER !== "devnet") {
    throw new Error(
      `ORACLE_SIGNER_KEY is required on ${CLUSTER} — the keyfile fallback is devnet-only.`
    );
  }
  if (existsSync(DEV_KEYFILE)) {
    const bytes = Uint8Array.from(
      JSON.parse(readFileSync(DEV_KEYFILE, "utf8")) as number[]
    );
    return Keypair.fromSecretKey(bytes);
  }
  const kp = Keypair.generate();
  mkdirSync(dirname(DEV_KEYFILE), { recursive: true });
  writeFileSync(DEV_KEYFILE, JSON.stringify(Array.from(kp.secretKey)));
  console.log(`Generated devnet oracle keypair → ${DEV_KEYFILE}`);
  return kp;
}

async function ensureFunds(connection: Connection, pubkey: PublicKey) {
  const balance = await connection.getBalance(pubkey);
  console.log(`Signer ${pubkey.toBase58()} — ${balance / LAMPORTS_PER_SOL} SOL`);
  if (balance >= 0.01 * LAMPORTS_PER_SOL) return;
  if (CLUSTER !== "devnet") {
    throw new Error("Insufficient balance and airdrops only exist on devnet.");
  }
  console.log("Requesting 1 SOL devnet airdrop…");
  const sig = await connection.requestAirdrop(pubkey, LAMPORTS_PER_SOL);
  await connection.confirmTransaction(sig, "confirmed");
}

async function main() {
  const keypair = loadKeypair();
  const connection = new Connection(RPC_URL, "confirmed");
  await ensureFunds(connection, keypair.publicKey);

  const manifest = anchorManifest();
  const manifestSha256 = anchorManifestHash();
  const memo = `${ANCHOR_DOMAIN}|${manifestSha256}`;
  console.log(`Manifest covers ${manifest.datasets.length} datasets`);
  console.log(`Memo: ${memo}`);

  // Passing the signer as a key makes the Memo program verify its signature,
  // so the anchor is provably from the oracle key, not just paid for by it.
  const ix = new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: [{ pubkey: keypair.publicKey, isSigner: true, isWritable: false }],
    data: Buffer.from(memo, "utf8"),
  });

  const signature = await sendAndConfirmTransaction(
    connection,
    new Transaction().add(ix),
    [keypair],
    { commitment: "confirmed" }
  );
  const tx = await connection.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });

  const record = {
    anchoredAt: tx?.blockTime
      ? new Date(tx.blockTime * 1000).toISOString()
      : new Date().toISOString(),
    cluster: CLUSTER,
    slot: tx?.slot ?? null,
    signature,
    signer: keypair.publicKey.toBase58(),
    memo,
    manifestSha256,
    datasets: manifest.datasets,
  };

  const anchors = JSON.parse(readFileSync(ANCHORS_PATH, "utf8"));
  anchors.anchors.unshift(record);
  writeFileSync(ANCHORS_PATH, JSON.stringify(anchors, null, 2) + "\n");

  const explorer = `https://explorer.solana.com/tx/${signature}${
    CLUSTER === "mainnet-beta" ? "" : `?cluster=${CLUSTER}`
  }`;
  console.log(`Anchored ✓  slot ${record.slot}`);
  console.log(explorer);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
