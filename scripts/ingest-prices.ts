/**
 * GAEA price ingest — indicative quotes for the tokenized registry →
 * src/data/prices.json.
 *
 * Snapshots one indicative price per registry name (tokenized assets and
 * watchlist equities) from Yahoo Finance's public chart endpoint — the
 * same unofficial feed the terminal proxies. The output is a signed
 * dataset in the standard {meta, records} shape, so each snapshot is
 * fingerprinted, Ed25519-signed, and committed to Solana inside the
 * anchor manifest like every other dataset.
 *
 * Only symbols with a public quote line are included ("whenever
 * applicable"): dead tickers and unlisted tokens simply drop out.
 *
 * Usage:  npm run ingest:prices        (then `npm run anchor`)
 *
 * The oracle attests to integrity and publication time of the snapshot,
 * not to price accuracy — these are indicative, delayed, unofficial
 * quotes, informational only.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_PATH = join(ROOT, "src", "data", "prices.json");
const TOKENIZED_PATH = join(ROOT, "src", "data", "tokenized.json");

const YF = "https://query1.finance.yahoo.com/v8/finance/chart";
const UA = "Mozilla/5.0 (compatible; GEOM-Oracle/1.0)";

/* Registry symbol → Yahoo quote symbol. Tokens use -USD pairs so they can
   never collide with same-lettered equities (AGX the token vs AGX the
   NYSE listing). Symbols Yahoo doesn't carry fail the fetch and are
   skipped. The uranium token "U" is deliberately absent: bare "U" is a
   NYSE listing, not the token. */
const TOKEN_QUOTES: Record<string, string> = {
  PAXG: "PAXG-USD",
  XAUT: "XAUT-USD",
  KAU: "KAU-USD",
  KAG: "KAG-USD",
  VNXAU: "VNXAU-USD",
  CGO: "CGO-USD",
  PMGT: "PMGT-USD",
  DGX: "DGX-USD",
  AGX: "AGX-USD",
  OUSG: "OUSG-USD",
  BUIDL: "BUIDL-USD",
};

/* Watchlist tickers that don't resolve on Yahoo as-is. Everything else
   (US listings and NYSE ADRs) passes through unchanged. "TBA" is a
   placeholder ticker, skipped. */
const EQUITY_QUOTES: Record<string, string | null> = {
  TBA: null,
  LYC: "LYC.AX",
  GLEN: "GLEN.L",
};

interface YahooChart {
  chart?: {
    result?: Array<{
      meta?: Record<string, unknown>;
      indicators?: { quote?: Array<{ close?: (number | null)[] }> };
    }> | null;
    error?: { description?: string } | null;
  };
}

interface PriceRecord {
  symbol: string;
  quoteSymbol: string;
  name: string;
  kind: "token" | "equity";
  price: number;
  currency: string;
  changePct: number | null;
  asOf: string;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/* Yahoo keeps dead crypto pairs around with a years-old last print
   (BUIDL-USD's last trade is from 2022). A stale quote in an attested
   snapshot is worse than none: anything older than a week is treated as
   a dead line and skipped. */
const MAX_AGE_DAYS = 7;

async function fetchQuote(
  quoteSymbol: string
): Promise<{ price: number; currency: string; changePct: number | null; asOf: string } | null> {
  try {
    const res = await fetch(`${YF}/${encodeURIComponent(quoteSymbol)}?range=5d&interval=1d`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as YahooChart;
    const result = body.chart?.result?.[0];
    const meta = result?.meta;
    if (!meta || body.chart?.error) return null;
    const price = num(meta.regularMarketPrice);
    if (price === null || price <= 0) return null;
    // meta.previousClose is often missing (crypto especially); fall back
    // to the prior daily bar's close, same as the terminal's quotes lib.
    const closes = (result.indicators?.quote?.[0]?.close ?? []).filter(
      (c): c is number => typeof c === "number" && Number.isFinite(c)
    );
    const prev =
      num(meta.previousClose) ??
      (closes.length > 1 ? closes[closes.length - 2] : null);
    const time = num(meta.regularMarketTime);
    if (time === null || Date.now() - time * 1000 > MAX_AGE_DAYS * 86_400_000) {
      return null;
    }
    return {
      price: Number(price.toFixed(price < 1 ? 6 : 4)),
      currency: typeof meta.currency === "string" ? meta.currency : "USD",
      changePct:
        prev !== null && prev !== 0
          ? Number((((price - prev) / prev) * 100).toFixed(2))
          : null,
      asOf: time !== null
        ? new Date(time * 1000).toISOString().slice(0, 16) + "Z"
        : "unknown",
    };
  } catch {
    return null;
  }
}

async function main() {
  const tokenized = JSON.parse(readFileSync(TOKENIZED_PATH, "utf8")) as {
    assets: Array<{ symbol: string; name: string }>;
    watchlist: Array<{ ticker: string; name: string }>;
  };

  const candidates: Array<{ symbol: string; quoteSymbol: string; name: string; kind: "token" | "equity" }> = [];

  for (const a of tokenized.assets) {
    const quoteSymbol = TOKEN_QUOTES[a.symbol];
    if (quoteSymbol) candidates.push({ symbol: a.symbol, quoteSymbol, name: a.name, kind: "token" });
  }
  for (const w of tokenized.watchlist) {
    const mapped = EQUITY_QUOTES[w.ticker];
    if (mapped === null) continue;
    candidates.push({ symbol: w.ticker, quoteSymbol: mapped ?? w.ticker, name: w.name, kind: "equity" });
  }

  const records: PriceRecord[] = [];
  for (const c of candidates) {
    const q = await fetchQuote(c.quoteSymbol);
    if (!q) {
      console.log(`  skip ${c.symbol.padEnd(6)} (${c.quoteSymbol}) — no fresh public quote`);
      continue;
    }
    console.log(
      `  ok   ${c.symbol.padEnd(6)} (${c.quoteSymbol.padEnd(9)}) ${q.price} ${q.currency}  as of ${q.asOf}`
    );
    records.push({ ...c, ...q });
  }

  if (records.length < 5) {
    throw new Error(`Only ${records.length} quotes resolved — refusing to write a mostly-empty snapshot.`);
  }

  records.sort((a, b) => (a.symbol < b.symbol ? -1 : 1));

  // Version = snapshot minute, UTC. Every successful ingest is a new
  // revision of the dataset and needs a fresh anchor.
  const version = new Date().toISOString().slice(0, 16) + "Z";

  const dataset = {
    meta: {
      id: "prices-v1",
      title: "Indicative prices — tokenized assets & watchlist equities",
      description:
        "Point-in-time indicative quotes for the tokenized-RWA registry and its equity watchlist, snapshotted from Yahoo Finance's public chart endpoint. The attestation covers the integrity and publication time of this snapshot, not price accuracy: quotes are indicative, possibly delayed, and not a licensed market-data feed. Informational only, not investment advice.",
      unit: "quote currency per token / share — see records[].currency",
      sources: ["Yahoo Finance public chart API (unofficial, indicative)"],
      cadence: "snapshot · re-anchored on each ingest",
      version,
    },
    prices: records,
  };

  const next = JSON.stringify(dataset, null, 2) + "\n";
  if (existsSync(OUT_PATH) && readFileSync(OUT_PATH, "utf8") === next) {
    console.log("No change — snapshot identical.");
    return;
  }
  writeFileSync(OUT_PATH, next);
  console.log(`\nWrote src/data/prices.json  (version ${version}, ${records.length} quotes)`);
  console.log("Dataset changed — run `npm run anchor` to update the on-chain manifest.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
