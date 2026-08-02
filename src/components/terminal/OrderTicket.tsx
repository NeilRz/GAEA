"use client";

import { useMemo, useState } from "react";
import type { Instrument } from "@/lib/board";
import { formatPrice } from "@/lib/format";

type Side = "buy" | "sell";

interface RoutedOrder {
  id: string;
  symbol: string;
  label: string;
  side: Side;
  amountUsd: number | null;
  venue: string;
  chain: string;
  contract: string;
  verifiedVia: string;
  executeUrl: string;
  createdAt: string;
}

function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

/** The trade ticket. Buy/sell resolve to a route on the external venue via
 *  POST /api/orders; execution happens there, in the user's own wallet.
 *  Instruments without a verified on-chain route get a plain "no venue"
 *  state instead of a dead form. */
export function OrderTicket({
  instrument,
  price,
  currency,
}: {
  instrument?: Instrument;
  price: number | null;
  currency: string;
}) {
  const [side, setSide] = useState<Side>("buy");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  /* Results are tagged with the symbol|side they answered; switching
     instrument or side derives a clean ticket without a reset effect. */
  const [routedFor, setRoutedFor] = useState<{ key: string; order: RoutedOrder } | null>(null);
  const [errorFor, setErrorFor] = useState<{ key: string; message: string } | null>(null);

  const ctxKey = `${instrument?.symbol ?? ""}|${side}`;
  const routed = routedFor?.key === ctxKey ? routedFor.order : null;
  const error = errorFor?.key === ctxKey ? errorFor.message : null;

  const token = instrument?.token;
  const amountUsd = useMemo(() => {
    const n = Number(amount);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [amount]);
  const units =
    amountUsd !== null && price && currency === "USD" ? amountUsd / price : null;

  const route = async () => {
    if (!instrument || busy) return;
    const key = ctxKey;
    setBusy(true);
    setRoutedFor(null);
    setErrorFor(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: instrument.symbol,
          side,
          ...(amountUsd !== null ? { amountUsd } : {}),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.message ?? `HTTP ${res.status}`);
      setRoutedFor({ key, order: body.order as RoutedOrder });
    } catch (e) {
      setErrorFor({ key, message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="t2-ticket">
      <div className="t2-ticket-head">
        <p className="t2-eyebrow">Trade</p>
        <span className="t2-custody">self-custody</span>
      </div>

      <div className="t2-sides" role="tablist" aria-label="Order side">
        <button
          type="button"
          role="tab"
          className={`buy${side === "buy" ? " on" : ""}`}
          aria-selected={side === "buy"}
          onClick={() => setSide("buy")}
        >
          Buy
        </button>
        <button
          type="button"
          role="tab"
          className={`sell${side === "sell" ? " on" : ""}`}
          aria-selected={side === "sell"}
          onClick={() => setSide("sell")}
        >
          Sell
        </button>
      </div>

      {instrument && token ? (
        <>
          <div className="t2-field">
            <label htmlFor="t2-amount">Amount · USD</label>
            <input
              id="t2-amount"
              className="t2-input"
              inputMode="decimal"
              placeholder="0.00"
              autoComplete="off"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="t2-est">
            <span>
              ≈{" "}
              <b>
                {units !== null ? units.toFixed(units >= 100 ? 2 : 4) : "—"}{" "}
                {instrument.label}
              </b>
            </span>
            <span>
              1 {instrument.label} ={" "}
              <b>{price ? formatPrice(price, currency) : "—"}</b>
            </span>
          </div>

          <div className="t2-kv">
            <div className="r">
              <span className="k">Venue</span>
              <span className="w">
                {token.tradeVenue} · {token.chain}
              </span>
            </div>
            <div className="r">
              <span className="k">Contract</span>
              <span className="w" title={token.address}>
                {shortAddr(token.address)}
              </span>
            </div>
            <div className="r">
              <span className="k">Verified</span>
              <span className="w">{token.verifiedVia}</span>
            </div>
          </div>

          {routed ? (
            <div className="t2-routed">
              <span className="t">route ready · {routed.venue}</span>
              <a
                className={`t2-cta t2-cta-link ${side}`}
                href={routed.executeUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {side} {instrument.label} on {routed.venue} ↗
              </a>
              <span className="t2-fine" style={{ marginTop: 0 }}>
                Nothing has executed yet. The order confirms in your own
                wallet on {routed.venue}.
              </span>
            </div>
          ) : (
            <button
              type="button"
              className={`t2-cta ${side}`}
              onClick={route}
              disabled={busy}
            >
              {busy ? "routing…" : `Route ${side} order`}
            </button>
          )}

          {error && <p className="t2-err">{error}</p>}
        </>
      ) : (
        <div className="t2-none">
          <span className="t">no execution route</span>
          {instrument?.label ?? "This instrument"} has no verified on-chain
          route. Buy and sell routing covers tokens with a verified contract
          and a public pool; no exchange or broker is connected for listed
          equities or futures.
        </div>
      )}

      <p className="t2-fine">
        Routes resolve to the external venue and execute in your own wallet
        (MetaMask, Phantom). GEOM never holds funds, brokers, or executes
        orders. Informational only, not investment advice.
      </p>
    </aside>
  );
}
