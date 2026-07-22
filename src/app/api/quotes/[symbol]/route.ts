import { NextResponse } from "next/server";
import { fetchSeries, QuoteError, QUOTE_TTL } from "@/lib/quotes";
import { ALL_INSTRUMENTS, RANGES } from "@/lib/board";

export const revalidate = 60;

/** GET /api/quotes/<symbol>?range=6m
 *
 *  Full OHLC series for one instrument. `symbol` must be on the board;
 *  the allowlist keeps this from becoming an open proxy to Yahoo. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params;

  const instrument = ALL_INSTRUMENTS.find((i) => i.symbol === symbol);
  if (!instrument) {
    return NextResponse.json(
      {
        error: `'${symbol}' is not on the board.`,
        available: ALL_INSTRUMENTS.map((i) => i.symbol),
      },
      { status: 404 },
    );
  }

  const { searchParams } = new URL(request.url);
  const rangeId = searchParams.get("range") ?? "6m";
  const opt = RANGES.find((r) => r.id === rangeId);
  if (!opt) {
    return NextResponse.json(
      { error: `Unknown range '${rangeId}'`, available: RANGES.map((r) => r.id) },
      { status: 400 },
    );
  }

  try {
    const series = await fetchSeries(instrument.symbol, opt.range, opt.interval);
    return NextResponse.json(
      { ...series, range: opt.id, source: "Yahoo Finance chart API (unofficial)" },
      {
        headers: {
          "Cache-Control": `s-maxage=${QUOTE_TTL}, stale-while-revalidate=300`,
        },
      },
    );
  } catch (e) {
    const status = e instanceof QuoteError ? e.status : 502;
    const message = e instanceof Error ? e.message : "Upstream failure";
    return NextResponse.json({ error: message }, { status });
  }
}
