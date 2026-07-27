"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import type { Candle } from "@/lib/quotes";
import { formatPrice, formatVolume, formatBarDate } from "@/lib/format";

/* TradingView's open-source charting engine, the same library behind the
   Dexscreener-style terminals. Candles keep standard terminal conventions
   (green/red), the chrome around them stays GEOM. */
const UP = "#26a69a";
const DOWN = "#ef5350";
const INK3 = "#7e97a6";
const VOL_UP = "rgba(38, 166, 154, 0.35)";
const VOL_DOWN = "rgba(239, 83, 80, 0.35)";

export function PriceChart({
  candles,
  currency = "USD",
  height = 400,
}: {
  candles: Candle[];
  currency?: string;
  height?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  /* Refs so the one-time chart callbacks always see the latest props
     without tearing the chart down on every data change. */
  const candlesRef = useRef<Candle[]>(candles);
  const currencyRef = useRef(currency);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    candlesRef.current = candles;
    currencyRef.current = currency;
  }, [candles, currency]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const mono =
      getComputedStyle(document.body).getPropertyValue("--font-mono").trim() ||
      "ui-monospace, monospace";

    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: INK3,
        fontSize: 11,
        fontFamily: mono,
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.04)" },
        horzLines: { color: "rgba(255, 255, 255, 0.06)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "rgba(143, 180, 201, 0.55)",
          style: LineStyle.Dashed,
          labelBackgroundColor: "#182730",
        },
        horzLine: {
          color: "rgba(143, 180, 201, 0.55)",
          style: LineStyle.Dashed,
          labelBackgroundColor: "#182730",
        },
      },
      rightPriceScale: { borderColor: "rgba(255, 255, 255, 0.09)" },
      timeScale: { borderColor: "rgba(255, 255, 255, 0.09)", rightOffset: 2 },
      localization: {
        locale: "en-GB", // match the board's date formatting, not the browser
        priceFormatter: (p: number) => formatPrice(p, currencyRef.current),
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: UP,
      downColor: DOWN,
      borderVisible: false,
      wickUpColor: UP,
      wickDownColor: DOWN,
      priceLineStyle: LineStyle.Dashed,
    });

    const volSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "", // overlay scale, volume rides the bottom of the pane
      lastValueVisible: false,
      priceLineVisible: false,
    });
    volSeries
      .priceScale()
      .applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });

    chart.subscribeCrosshairMove((param) => {
      if (param.time == null) {
        setHover(null);
        return;
      }
      const t = param.time as number;
      const idx = candlesRef.current.findIndex((k) => k.t === t);
      setHover(idx >= 0 ? idx : null);
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volSeriesRef.current = volSeries;

    return () => {
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    const cs = candleSeriesRef.current;
    const vs = volSeriesRef.current;
    if (!cs || !vs) return;

    cs.setData(
      candles.map((k) => ({
        time: k.t as UTCTimestamp,
        open: k.o,
        high: k.h,
        low: k.l,
        close: k.c,
      })),
    );
    vs.setData(
      candles.map((k) => ({
        time: k.t as UTCTimestamp,
        value: k.v,
        color: k.c >= k.o ? VOL_UP : VOL_DOWN,
      })),
    );
    chartRef.current?.timeScale().fitContent();
    setHover(null);
  }, [candles]);

  /* Legend reads the crosshair bar, falling back to the latest print. */
  const last = candles[candles.length - 1];
  const active = hover != null && candles[hover] ? candles[hover] : last;
  const activeIdx = hover ?? candles.length - 1;
  const prev = activeIdx > 0 ? candles[activeIdx - 1] : null;
  const up = active ? active.c >= active.o : true;
  const barChangePct =
    active && prev && prev.c !== 0 ? ((active.c - prev.c) / prev.c) * 100 : null;

  return (
    <div>
      {active && (
        <div className="ohlc-legend">
          <span className="ohlc-date">{formatBarDate(active.t, true)}</span>
          {(
            [
              ["O", active.o],
              ["H", active.h],
              ["L", active.l],
              ["C", active.c],
            ] as [string, number][]
          ).map(([k, v]) => (
            <span key={k} className="ohlc-pair">
              <span className="ohlc-k">{k}</span>
              <span style={{ color: up ? UP : DOWN }}>
                {formatPrice(v, currency)}
              </span>
            </span>
          ))}
          {barChangePct !== null && (
            <span className="ohlc-pair" style={{ color: up ? UP : DOWN }}>
              {barChangePct >= 0 ? "+" : "−"}
              {Math.abs(barChangePct).toFixed(2)}%
            </span>
          )}
          <span className="ohlc-pair">
            <span className="ohlc-k">VOL</span>
            <span style={{ color: INK3 }}>{formatVolume(active.v)}</span>
          </span>
        </div>
      )}

      <div ref={wrapRef} className="chart-frame" style={{ height }} />
    </div>
  );
}
