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
  // Dedupe + cap: without the Set, ?symbols=XOM,XOM,… fans one request out
  // into thousands of upstream fetches.
  const symbols = requested
    ? [
        ...new Set(
          requested
            .split(",")
            .map((s) => s.trim())
            .filter((s) => allowed.has(s)),
        ),
      ].slice(0, ALL_INSTRUMENTS.length)
    : ALL_INSTRUMENTS.map((i) => i.symbol);

  if (symbols.length === 0) {
    return NextResponse.json(
      { error: "No known symbols requested." },
      { status: 400 },
    );
  }

  const quotes = await fetchQuotes(symbols);
  const live = quotes.filter((q) => q !== null).length;

  // A fully dead upstream must not be cached as a valid empty board.
  if (live === 0) {
    return NextResponse.json(
      { error: "Quote upstream unavailable.", degraded: true },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      quotes: symbols.map((symbol, i) => ({ symbol, quote: quotes[i] })),
      degraded: live < symbols.length,
      source: "Yahoo Finance chart API (unofficial)",
      ttlSeconds: QUOTE_TTL,
    },
    {
      headers: {
        // Partial outages get a short cache window instead of the full TTL.
        "Cache-Control":
          live < symbols.length
            ? "s-maxage=15, stale-while-revalidate=60"
            : `s-maxage=${QUOTE_TTL}, stale-while-revalidate=300`,
      },
    },
  );
}
