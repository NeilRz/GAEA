/* Order routing endpoints — the terminal's buy/sell surface.

   GEOM is non-custodial and keeps no order book: POST does not place,
   broker, or execute anything. It validates the request against the
   instrument board and, where a verified on-chain route exists (token
   with a source-verified contract and a public pool), resolves it to an
   execution URL on the external venue. The swap itself happens on that
   venue in the user's own wallet. Instruments without a route return
   409 until a venue integration exists. Nothing is persisted. */

import { NextResponse } from "next/server";
import { findInstrument } from "@/lib/board";

const CUSTODY_NOTE =
  "GEOM is non-custodial. Buy and sell requests resolve to a route on an " +
  "external venue and execute in the user's own wallet; GEOM never holds " +
  "funds, brokers, or executes orders.";

export async function GET() {
  return NextResponse.json({
    orders: [],
    custody: "self",
    note: CUSTODY_NOTE,
  });
}

interface OrderBody {
  symbol?: unknown;
  side?: unknown;
  amountUsd?: unknown;
}

export async function POST(req: Request) {
  let body: OrderBody;
  try {
    body = (await req.json()) as OrderBody;
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Body must be JSON." },
      { status: 400 },
    );
  }

  const symbol = typeof body.symbol === "string" ? body.symbol : "";
  const side = body.side === "buy" || body.side === "sell" ? body.side : null;
  if (!symbol || !side) {
    return NextResponse.json(
      {
        error: "invalid_request",
        message: "symbol and side ('buy' | 'sell') are required.",
      },
      { status: 400 },
    );
  }

  let amountUsd: number | null = null;
  if (body.amountUsd !== undefined && body.amountUsd !== null) {
    if (
      typeof body.amountUsd !== "number" ||
      !Number.isFinite(body.amountUsd) ||
      body.amountUsd <= 0 ||
      body.amountUsd > 1e9
    ) {
      return NextResponse.json(
        {
          error: "invalid_amount",
          message: "amountUsd must be a positive number.",
        },
        { status: 400 },
      );
    }
    amountUsd = body.amountUsd;
  }

  const instrument = findInstrument(symbol);
  if (!instrument) {
    return NextResponse.json(
      { error: "unknown_symbol", message: `${symbol} is not on the board.` },
      { status: 404 },
    );
  }

  const token = instrument.token;
  if (!token) {
    return NextResponse.json(
      {
        error: "no_execution_venue",
        message:
          `No execution route for ${instrument.label}. Routes exist only for ` +
          "tokens with a verified contract and a public pool; no exchange or " +
          "broker is connected for listed equities or futures.",
      },
      { status: 409 },
    );
  }

  // Buy: venue pre-fills the token as the output. Sell: as the input.
  const executeUrl =
    side === "buy"
      ? `https://app.uniswap.org/swap?outputCurrency=${token.address}&chain=mainnet`
      : `https://app.uniswap.org/swap?inputCurrency=${token.address}&chain=mainnet`;

  return NextResponse.json({
    order: {
      id: crypto.randomUUID(),
      status: "routed",
      custody: "self",
      symbol: instrument.symbol,
      label: instrument.label,
      side,
      amountUsd,
      venue: token.tradeVenue,
      chain: token.chain,
      contract: token.address,
      verifiedVia: token.verifiedVia,
      executeUrl,
      createdAt: new Date().toISOString(),
      note: CUSTODY_NOTE,
    },
  });
}
