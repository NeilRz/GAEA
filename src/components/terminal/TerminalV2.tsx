"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import market from "@/data/market.json";
import { PriceChart } from "@/components/PriceChart";
import type { Candle, QuoteMeta } from "@/lib/quotes";
import {
  BOARD,
  RANGES,
  DEFAULT_RANGE,
  DEFAULT_SYMBOL,
  findInstrument,
  type Instrument,
} from "@/lib/board";
import {
  formatPrice,
  formatChange,
  formatPct,
  formatStamp,
  changeTone,
} from "@/lib/format";
import {
  FuturesCurveChart,
  CrackSpreadChart,
  InventoryChart,
} from "@/components/charts";
import { OrderTicket } from "./OrderTicket";
import { useAppNav } from "@/components/app/GeomApp";

const REFRESH_MS = 60_000;

interface SeriesPayload {
  meta: QuoteMeta;
  candles: Candle[];
}

/** Last completed load, tagged with the request it answered. Comparing its
 *  key against the current selection derives `loading` without a setState
 *  in the effect body, and lets the previous chart stay on screen, dimmed,
 *  instead of collapsing to a spinner on every range change. */
interface LoadResult {
  key: string;
  series: SeriesPayload | null;
  error: string | null;
}

const STRUCT_TABS = [
  { id: "curve", label: "Curve", sub: `WTI vs Brent · ${market.futuresCurve.asOfLabel}` },
  { id: "crack", label: "Cracks", sub: market.crackSpread.label },
  { id: "inv", label: "Inventories", sub: market.inventories.label },
] as const;

type StructTab = (typeof STRUCT_TABS)[number]["id"];

/** GEOM Terminal v2: one full-height workspace — markets rail, chart
 *  surface, trade ticket, structure pane — hairline-divided, mono-set. */
export default function TerminalV2() {
  const nav = useAppNav();
  const [quotes, setQuotes] = useState<Record<string, QuoteMeta | null>>({});
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);
  const [rangeId, setRangeId] = useState(DEFAULT_RANGE);
  const [result, setResult] = useState<LoadResult | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [structTab, setStructTab] = useState<StructTab>("curve");

  const instrument = findInstrument(symbol);
  const key = `${symbol}|${rangeId}`;

  const loading = result?.key !== key;
  const series = result?.series ?? null;
  const error = result?.key === key ? result.error : null;

  /* ── markets rail: every instrument, refreshed on an interval ── */
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
        // A failed refresh is not fatal, the last good prices stay up.
        if (e.name !== "AbortError")
          console.warn("[terminal] quote refresh failed", e);
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
      .then((body) =>
        setResult({ key: `${symbol}|${rangeId}`, series: body, error: null }),
      )
      .catch((e: Error) => {
        if (e.name === "AbortError") return;
        setResult({ key: `${symbol}|${rangeId}`, series: null, error: e.message });
      });

    return () => ac.abort();
  }, [symbol, rangeId]);

  // Prefer the live rail quote (fresher) but fall back to the series meta.
  const head = quotes[symbol] ?? (loading ? null : series?.meta) ?? null;
  const currency = head?.currency ?? series?.meta.currency ?? "USD";
  const tone = changeTone(head?.change ?? null);

  const groups = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return BOARD;
    return BOARD.map((g) => ({
      ...g,
      instruments: g.instruments.filter(
        (i) =>
          i.label.toLowerCase().includes(q) ||
          i.symbol.toLowerCase().includes(q) ||
          i.venue.toLowerCase().includes(q) ||
          i.note.toLowerCase().includes(q),
      ),
    })).filter((g) => g.instruments.length > 0);
  }, [filter]);

  return (
    <div className="t2">
      <div className="t2-body">
        {/* ── markets rail ── */}
        <aside className="t2-rail">
          <div className="t2-filter-wrap">
            <input
              className="t2-filter"
              placeholder="Filter markets"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Filter markets"
            />
          </div>
          <div className="t2-list">
            {groups.map((group) => (
              <div key={group.id}>
                <p className="t2-group" title={group.blurb}>
                  {group.title}
                </p>
                {group.instruments.map((ins) => (
                  <MarketRow
                    key={ins.symbol}
                    ins={ins}
                    quote={quotes[ins.symbol]}
                    active={ins.symbol === symbol}
                    onSelect={() => setSymbol(ins.symbol)}
                  />
                ))}
              </div>
            ))}
            {groups.length === 0 && (
              <p className="t2-group">no match — clear the filter</p>
            )}
          </div>
        </aside>

        {/* ── chart surface ── */}
        <section className="t2-center">
          <header className="t2-head">
            <div className="t2-id">
              <h2 className="t2-sym">
                {instrument?.label ?? symbol}
                {instrument?.token && (
                  <span className="t2-route-dot" title="on-chain route available" />
                )}
              </h2>
              <p className="t2-name" title={head?.name ?? undefined}>
                {instrument?.venue ?? "—"} · {head?.name ?? "—"}
              </p>
            </div>

            <div className="t2-cell">
              <span className={`t2-px tone-${tone}`}>
                {head ? formatPrice(head.price, currency) : "—"}
              </span>
              <span className={`t2-dx tone-${tone}`}>
                {formatChange(head?.change ?? null, currency)} (
                {formatPct(head?.changePct ?? null)})
              </span>
            </div>

            <div className="t2-cell">
              <span className="k">52w range</span>
              <CoreSample
                low={head?.fiftyTwoWeekLow ?? null}
                high={head?.fiftyTwoWeekHigh ?? null}
                price={head?.price ?? null}
                currency={currency}
              />
            </div>

            <div className="t2-cell">
              <span className="k">last print</span>
              <span className="w">{formatStamp(head?.marketTime ?? null)}</span>
            </div>

            <div className="t2-seg" role="group" aria-label="Chart range">
              {RANGES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={r.id === rangeId ? "on" : undefined}
                  aria-pressed={r.id === rangeId}
                  onClick={() => setRangeId(r.id)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </header>

          <div className="t2-chart">
            {error ? (
              <div className="t2-empty">feed error · {error}</div>
            ) : series ? (
              <div
                className="chart-fill"
                style={{
                  opacity: loading ? 0.5 : 1,
                  transition: "opacity 160ms var(--ease)",
                }}
              >
                <PriceChart
                  candles={series.candles}
                  currency={series.meta.currency}
                  fill
                />
              </div>
            ) : (
              <div className="t2-empty">loading {symbol}…</div>
            )}
          </div>

          {instrument && (
            <p className="t2-note" title={instrument.note}>
              {instrument.note}
            </p>
          )}

          {/* ── structure pane: curve, cracks, inventories ── */}
          <div className="t2-struct">
            <div className="t2-struct-bar" role="tablist" aria-label="Structural series">
              {STRUCT_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={structTab === t.id}
                  className={`t2-tab${structTab === t.id ? " on" : ""}`}
                  onClick={() => setStructTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
              <span className="t2-note" style={{ padding: 0, flex: 1 }}>
                {STRUCT_TABS.find((t) => t.id === structTab)?.sub}
              </span>
              <span className="t2-sample" title="Exchange and vendor feed integration is the next milestone.">
                sample data
              </span>
            </div>
            <div className="t2-struct-body">
              {structTab === "curve" && <FuturesCurveChart />}
              {structTab === "crack" && <CrackSpreadChart />}
              {structTab === "inv" && <InventoryChart />}
            </div>
          </div>
        </section>

        {/* ── trade ticket ── */}
        <OrderTicket
          instrument={instrument}
          price={head?.price ?? null}
          currency={currency}
        />
      </div>

      <footer className="t2-statusbar">
        <span className="t2-live">
          <span className="t2-pulse" aria-hidden />
          {updatedAt ? `refreshed ${updatedAt} · auto 60s` : "connecting…"}
        </span>
        <span>quotes: yahoo chart api · unofficial · delayed</span>
        <button className="t2-statuslink" onClick={() => nav.openDataset("market")}>
          series on oracle →
        </button>
        <span className="t2-status-right">
          informational only · not investment advice · geom never holds funds
          or executes
        </span>
      </footer>
    </div>
  );
}

function MarketRow({
  ins,
  quote,
  active,
  onSelect,
}: {
  ins: Instrument;
  quote: QuoteMeta | null | undefined;
  active: boolean;
  onSelect: () => void;
}) {
  const tone = changeTone(quote?.change ?? null);
  return (
    <button
      type="button"
      className={`t2-row${active ? " on" : ""}`}
      onClick={onSelect}
      aria-pressed={active}
      title={ins.note}
    >
      <span className="s">
        {ins.label}
        {ins.token && <span className="t2-route-dot" aria-hidden />}
      </span>
      <span className="v">{ins.venue}</span>
      <span className="p">{quote ? formatPrice(quote.price, quote.currency) : "—"}</span>
      <span className={`d tone-${tone}`}>{formatPct(quote?.changePct ?? null)}</span>
    </button>
  );
}

/** The core sample: the 52-week range drawn as a thin strata bar, the
 *  current price as the drill marker. */
function CoreSample({
  low,
  high,
  price,
  currency,
}: {
  low: number | null;
  high: number | null;
  price: number | null;
  currency: string;
}) {
  const pct =
    low !== null && high !== null && price !== null && high > low
      ? Math.min(1, Math.max(0, (price - low) / (high - low)))
      : null;
  return (
    <span className="t2-core-wrap">
      <span>{low !== null ? formatPrice(low, currency) : "—"}</span>
      <span className="t2-core">
        {pct !== null && (
          <span className="t2-core-mark" style={{ left: `${pct * 100}%` }} />
        )}
      </span>
      <span>{high !== null ? formatPrice(high, currency) : "—"}</span>
    </span>
  );
}
