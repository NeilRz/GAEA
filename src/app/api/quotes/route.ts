import { NextResponse } from "next/server";
import { fetchQuotes, QUOTE_TTL } from "@/lib/quotes";
import { ALL_INSTRUMENTS } from "@/lib/board";

export const revalidate = 60;

/** GET /api/quotes            → every instrument on the board
 *  GET /api/quotes?symbols=…  → a comma-separated subset
 *
 *  Summary quotes only (last price + change). For OHLC use
 *  /api/quotes/<symbol>. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requested = searchParams.get("symbols");

  const allowed = new Set(ALL_INSTRUMENTS.map((i) => i.symbol));
  const symbols = requested
    ? requested
        .split(",")
        .map((s) => s.trim())
        .filter((s) => allowed.has(s))
    : ALL_INSTRUMENTS.map((i) => i.symbol);

  if (symbols.length === 0) {
    return NextResponse.json(
      { error: "No known symbols requested." },
      { status: 400 },
    );
  }

  const quotes = await fetchQuotes(symbols);

  return NextResponse.json(
    {
      quotes: symbols.map((symbol, i) => ({ symbol, quote: quotes[i] })),
      source: "Yahoo Finance chart API (unofficial)",
      ttlSeconds: QUOTE_TTL,
    },
    { headers: { "Cache-Control": `s-maxage=${QUOTE_TTL}, stale-while-revalidate=300` } },
  );
}
