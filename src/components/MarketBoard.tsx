"use client";

import { useCallback, useEffect, useState } from "react";
import { CandleChart } from "@/components/CandleChart";
import type { Candle, QuoteMeta } from "@/lib/quotes";
import {
  BOARD,
  RANGES,
  DEFAULT_RANGE,
  DEFAULT_SYMBOL,
  findInstrument,
  GEOM_TOKEN,
  GEOM_IS_TRADEABLE,
} from "@/lib/board";
import {
  formatPrice,
  formatChange,
  formatPct,
  formatStamp,
  changeTone,
} from "@/lib/format";

const REFRESH_MS = 60_000;

interface SeriesPayload {
  meta: QuoteMeta;
  candles: Candle[];
}

/** Last completed load, tagged with the request it answered. Comparing its
 *  key against the current selection derives `loading` without a setState
 *  in the effect body — and lets the previous chart stay on screen, dimmed,
 *  instead of collapsing to a spinner on every range change. */
interface LoadResult {
  key: string;
  series: SeriesPayload | null;
  error: string | null;
}

export function MarketBoard() {
  const [quotes, setQuotes] = useState<Record<string, QuoteMeta | null>>({});
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);
  const [rangeId, setRangeId] = useState(DEFAULT_RANGE);
  const [result, setResult] = useState<LoadResult | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const instrument = findInstrument(symbol);
  const key = `${symbol}|${rangeId}`;

  const loading = result?.key !== key;
  const series = result?.series ?? null;
  const error = result?.key === key ? result.error : null;

  /* ── ticker strip: every instrument, refreshed on an interval ── */
  const loadQuotes = useCallback((signal?: AbortSignal) => {
    return fetch("/api/quotes", { signal, cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`quotes ${res.status}`);
        return res.json() as Promise<{
          quotes: { symbol: string; quote: QuoteMeta | null }[];
        }>;
      })
      .then((body) => {
        const next: Record<string, QuoteMeta | null> = {};
        for (const q of body.quotes) next[q.symbol] = q.quote;
        setQuotes(next);
        setUpdatedAt(
          new Date().toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        );
      })
      .catch((e: Error) => {
        // A failed refresh is not fatal — the last good prices stay up.
        if (e.name !== "AbortError") console.warn("[terminal] quote refresh failed", e);
      });
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    loadQuotes(ac.signal);
    const id = setInterval(() => loadQuotes(), REFRESH_MS);
    return () => {
      ac.abort();
      clearInterval(id);
    };
  }, [loadQuotes]);

  /* ── selected instrument: full OHLC ── */
  useEffect(() => {
    const ac = new AbortController();

    fetch(`/api/quotes/${encodeURIComponent(symbol)}?range=${rangeId}`, {
      signal: ac.signal,
      cache: "no-store",
    })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
        return body as SeriesPayload;
      })
      .then((body) => setResult({ key: `${symbol}|${rangeId}`, series: body, error: null }))
      .catch((e: Error) => {
        if (e.name === "AbortError") return;
        setResult({ key: `${symbol}|${rangeId}`, series: null, error: e.message });
      });

    return () => ac.abort();
  }, [symbol, rangeId]);

  // Prefer the live strip quote (fresher) but fall back to the series meta.
  const head = quotes[symbol] ?? (loading ? null : series?.meta) ?? null;
  const currency = head?.currency ?? series?.meta.currency ?? "USD";

  return (
    <>
      <section className="panel term-head">
        <div className="term-head-row">
          <div>
            <p className="eyebrow" style={{ marginBottom: 4 }}>
              {instrument?.venue ?? "—"}
            </p>
            <h2 className="term-symbol">{instrument?.label ?? symbol}</h2>
            <p className="term-name">{head?.name ?? "—"}</p>
          </div>

          <div className="term-price-block">
            <span className={`term-price tone-${changeTone(head?.change ?? null)}`}>
              {head ? formatPrice(head.price, currency) : "—"}
            </span>
            <span className={`term-delta tone-${changeTone(head?.change ?? null)}`}>
              {formatChange(head?.change ?? null, currency)} (
              {formatPct(head?.changePct ?? null)})
            </span>
            <span className="term-stamp">
              last print {formatStamp(head?.marketTime ?? null)}
            </span>
          </div>
        </div>

        <div className="term-controls">
          <div className="range-switch" role="group" aria-label="Chart range">
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`range-btn${r.id === rangeId ? " is-active" : ""}`}
                aria-pressed={r.id === rangeId}
                onClick={() => setRangeId(r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>
          <span className="term-52w">
            52w{" "}
            {head?.fiftyTwoWeekLow != null ? formatPrice(head.fiftyTwoWeekLow, currency) : "—"}
            {" · "}
            {head?.fiftyTwoWeekHigh != null ? formatPrice(head.fiftyTwoWeekHigh, currency) : "—"}
          </span>
        </div>

        {error ? (
          <div className="term-empty">
            <p className="mono" style={{ color: "var(--critical)", marginBottom: 4 }}>
              feed error
            </p>
            <p className="dim" style={{ margin: 0, fontSize: 13 }}>
              {error}
            </p>
          </div>
        ) : series ? (
          <div
            style={{
              opacity: loading ? 0.5 : 1,
              transition: "opacity 160ms var(--ease)",
            }}
          >
            <CandleChart
              candles={series.candles}
              currency={series.meta.currency}
            />
          </div>
        ) : (
          <div className="term-empty">
            <p className="mono dim" style={{ margin: 0 }}>
              loading {symbol}…
            </p>
          </div>
        )}

        {instrument && <p className="term-note">{instrument.note}</p>}
      </section>

      <p className="term-updated">
        {updatedAt ? `board refreshed ${updatedAt} · auto every 60s` : "connecting…"}
      </p>

      {BOARD.map((group) => (
        <section className="panel" key={group.id} style={{ marginBottom: 16 }}>
          <p className="chart-title">{group.title}</p>
          <p className="chart-sub">{group.blurb}</p>
          <div className="quote-grid">
            {group.instruments.map((ins) => {
              const q = quotes[ins.symbol];
              const tone = changeTone(q?.change ?? null);
              return (
                <button
                  key={ins.symbol}
                  type="button"
                  className={`quote-tile${ins.symbol === symbol ? " is-active" : ""}`}
                  onClick={() => setSymbol(ins.symbol)}
                  aria-pressed={ins.symbol === symbol}
                  title={ins.note}
                >
                  <span className="quote-sym">{ins.label}</span>
                  <span className="quote-venue">{ins.venue}</span>
                  <span className="quote-price">
                    {q ? formatPrice(q.price, q.currency) : "—"}
                  </span>
                  <span className={`quote-delta tone-${tone}`}>
                    {formatPct(q?.changePct ?? null)}
                  </span>
                </button>
              );
            })}

            {group.id === "tokenized" && <GeomTile />}
          </div>
        </section>
      ))}
    </>
  );
}

/** $GEOM has no market yet. This tile says so rather than drawing a price
 *  that does not exist; it becomes a Jupiter route the moment a mint is set
 *  in `GEOM_TOKEN.contractAddress`. */
function GeomTile() {
  if (GEOM_IS_TRADEABLE) {
    return (
      <a
        className="quote-tile geom-tile is-live"
        href={GEOM_TOKEN.jupiterUrl(GEOM_TOKEN.contractAddress)}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className="quote-sym">GEOM</span>
        <span className="quote-venue">Jupiter · Solana</span>
        <span className="quote-price">Trade</span>
        <span className="quote-delta">open route ↗</span>
      </a>
    );
  }

  return (
    <div className="quote-tile geom-tile" aria-label="GEOM — not tradeable yet">
      <span className="quote-sym">GEOM</span>
      <span className="quote-venue">Solana</span>
      <span className="quote-price geom-status">NOT TRADEABLE YET</span>
      <span className="quote-delta dim">contract address TBA</span>
    </div>
  );
}
