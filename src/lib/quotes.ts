/* Live OHLC via Yahoo Finance's public chart endpoint.
   Server-side only: the endpoint sends no CORS headers, so every call
   is proxied through /api/quotes/*. No API key, one response shape for
   equities, crypto and futures alike.

   This is an unofficial endpoint — fine for a read-only market view,
   not a licensed feed. Anything load-bearing should move to a vendor
   contract before it backs a commercial claim. */

const YF = "https://query1.finance.yahoo.com/v8/finance/chart";
const UA = "Mozilla/5.0 (compatible; GEOM-Terminal/1.0)";

/** Cache window in seconds — quotes are market colour, not a trading feed. */
export const QUOTE_TTL = 60;

export interface Candle {
  /** epoch seconds, start of the bar */
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface QuoteMeta {
  symbol: string;
  name: string;
  /** "USD", or "GBp" for London pence-quoted lines like 80M.L */
  currency: string;
  exchange: string;
  price: number;
  previousClose: number | null;
  change: number | null;
  changePct: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  /** epoch seconds of the last print */
  marketTime: number | null;
}

export interface Series {
  meta: QuoteMeta;
  candles: Candle[];
}

export class QuoteError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "QuoteError";
  }
}

interface YahooQuoteArrays {
  open?: (number | null)[];
  high?: (number | null)[];
  low?: (number | null)[];
  close?: (number | null)[];
  volume?: (number | null)[];
}

interface YahooResult {
  meta?: Record<string, unknown>;
  timestamp?: number[];
  indicators?: { quote?: YahooQuoteArrays[] };
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function str(v: unknown, fallback: string): string {
  return typeof v === "string" && v.length > 0 ? v : fallback;
}

/**
 * Fetch one symbol's OHLC series.
 *
 * @param symbol Yahoo symbol — "VEEE", "80M.L", "ONDO-USD", "CL=F"
 * @param range  "1mo" | "3mo" | "6mo" | "1y" | "5y"
 * @param interval "1d" | "1wk" | "60m" …
 */
export async function fetchSeries(
  symbol: string,
  range = "6mo",
  interval = "1d",
): Promise<Series> {
  const url = `${YF}/${encodeURIComponent(symbol)}?range=${encodeURIComponent(
    range,
  )}&interval=${encodeURIComponent(interval)}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      next: { revalidate: QUOTE_TTL },
    });
  } catch {
    throw new QuoteError(`Upstream unreachable for ${symbol}`, 502);
  }

  if (!res.ok) {
    throw new QuoteError(
      `Upstream returned ${res.status} for ${symbol}`,
      res.status === 404 ? 404 : 502,
    );
  }

  const body = (await res.json()) as {
    chart?: { result?: YahooResult[] | null; error?: { description?: string } | null };
  };

  const err = body.chart?.error;
  if (err) throw new QuoteError(err.description ?? `Unknown symbol ${symbol}`, 404);

  const result = body.chart?.result?.[0];
  if (!result) throw new QuoteError(`No data for ${symbol}`, 404);

  const m = result.meta ?? {};
  const stamps = result.timestamp ?? [];
  const q = result.indicators?.quote?.[0] ?? {};

  // Yahoo pads the arrays with nulls for halted / untraded bars — drop them
  // rather than plotting a gap the eye reads as a price move.
  const candles: Candle[] = [];
  for (let i = 0; i < stamps.length; i++) {
    const o = num(q.open?.[i]);
    const h = num(q.high?.[i]);
    const l = num(q.low?.[i]);
    const c = num(q.close?.[i]);
    if (o === null || h === null || l === null || c === null) continue;
    candles.push({ t: stamps[i], o, h, l, c, v: num(q.volume?.[i]) ?? 0 });
  }

  if (candles.length === 0) throw new QuoteError(`No candles for ${symbol}`, 404);

  const last = candles[candles.length - 1];
  const price = num(m.regularMarketPrice) ?? last.c;

  // Prefer the exchange's own previous close, then the prior bar.
  //
  // `chartPreviousClose` is deliberately last: it is the close *before the
  // requested window*, not before the last bar, so on a 5d request it yields
  // a five-day change and on a 1y request a one-year change — both of which
  // read as a daily move once rendered next to a % sign. It is only correct
  // when the window holds a single bar.
  const previousClose =
    num(m.previousClose) ??
    (candles.length > 1 ? candles[candles.length - 2].c : num(m.chartPreviousClose));

  const change = previousClose === null ? null : price - previousClose;
  const changePct =
    previousClose === null || previousClose === 0 ? null : (change! / previousClose) * 100;

  return {
    meta: {
      symbol: str(m.symbol, symbol),
      name: str(m.shortName ?? m.longName, symbol),
      currency: str(m.currency, "USD"),
      exchange: str(m.fullExchangeName ?? m.exchangeName, "—"),
      price,
      previousClose,
      change,
      changePct,
      fiftyTwoWeekHigh: num(m.fiftyTwoWeekHigh),
      fiftyTwoWeekLow: num(m.fiftyTwoWeekLow),
      marketTime: num(m.regularMarketTime),
    },
    candles,
  };
}

/** Fetch many symbols for the ticker strip. Failures resolve to null so one
 *  dead symbol never blanks the whole board. */
export async function fetchQuotes(symbols: string[]): Promise<(QuoteMeta | null)[]> {
  return Promise.all(
    symbols.map((s) =>
      fetchSeries(s, "5d", "1d")
        .then((r) => r.meta)
        .catch(() => null),
    ),
  );
}
