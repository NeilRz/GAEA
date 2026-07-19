"use client";

import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Candle } from "@/lib/quotes";
import { formatPrice, formatVolume, formatBarDate } from "@/lib/format";

const INK3 = "#7e97a6";
const GRID = "#1f2e35";
const UP = "#2ba57e";
const DOWN = "#cc4a57";
const VOL = "#2e4650";

const axisTick = { fill: INK3, fontSize: 11, fontFamily: "var(--font-mono)" };

interface Row {
  t: number;
  /* Floating bar: Recharts gives the custom shape the pixel box spanning
     [low, high], which is all we need to place open and close by hand. */
  wick: [number, number];
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  up: boolean;
}

/** Draws one candle inside the pixel box Recharts computed for [low, high]. */
function Candlestick(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: Row;
}) {
  const { x, y, width, height, payload } = props;
  if (x == null || y == null || width == null || height == null || !payload) return null;

  const { o, c, h, l, up } = payload;
  const colour = up ? UP : DOWN;
  const span = h - l;

  // Map a price onto the box: top edge is the high, bottom edge is the low.
  // A doji whose high equals its low collapses the box, so pin to the top.
  const yFor = (p: number) => (span === 0 ? y : y + ((h - p) / span) * height);

  const bodyW = Math.max(Math.min(width * 0.62, 14), 1);
  const bodyX = x + (width - bodyW) / 2;
  const centre = x + width / 2;

  const yo = yFor(o);
  const yc = yFor(c);
  const bodyTop = Math.min(yo, yc);
  // A body thinner than a hairline vanishes; a flat open/close should still
  // read as a line, which is the conventional doji mark.
  const bodyH = Math.max(Math.abs(yc - yo), 1);

  return (
    <g>
      <line
        x1={centre}
        x2={centre}
        y1={y}
        y2={y + height}
        stroke={colour}
        strokeWidth={1}
        shapeRendering="crispEdges"
      />
      <rect
        x={bodyX}
        y={bodyTop}
        width={bodyW}
        height={bodyH}
        fill={colour}
        shapeRendering="crispEdges"
      />
    </g>
  );
}

function CandleTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: { payload?: Row }[];
  currency: string;
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;

  const rows: [string, string][] = [
    ["O", formatPrice(row.o, currency)],
    ["H", formatPrice(row.h, currency)],
    ["L", formatPrice(row.l, currency)],
    ["C", formatPrice(row.c, currency)],
  ];

  return (
    <div className="chart-tooltip">
      <div className="t-label">{formatBarDate(row.t, true)}</div>
      <div className="ohlc-grid">
        {rows.map(([k, v]) => (
          <span key={k} className="ohlc-cell">
            <span className="ohlc-k">{k}</span>
            <span style={{ color: row.up ? UP : DOWN }}>{v}</span>
          </span>
        ))}
      </div>
      {row.v > 0 && (
        <div className="t-row" style={{ marginTop: 4 }}>
          <span className="ohlc-k">VOL</span> {formatVolume(row.v)}
        </div>
      )}
    </div>
  );
}

export function CandleChart({
  candles,
  currency = "USD",
  height = 340,
}: {
  candles: Candle[];
  currency?: string;
  height?: number;
}) {
  const data: Row[] = candles.map((k) => ({
    t: k.t,
    wick: [k.l, k.h],
    o: k.o,
    h: k.h,
    l: k.l,
    c: k.c,
    v: k.v,
    up: k.c >= k.o,
  }));

  const lows = data.map((d) => d.l);
  const highs = data.map((d) => d.h);
  const min = Math.min(...lows);
  const max = Math.max(...highs);
  const pad = (max - min) * 0.08 || max * 0.05 || 1;
  // On a wide range (VEEE spans $1.50–$128 over 6m) the padding exceeds the
  // low, and an axis tick reading "$-1.60" is nonsense for a price.
  const floor = Math.max(0, min - pad);

  const maxVol = Math.max(...data.map((d) => d.v), 0);

  // Thin out ticks so the axis never crowds — roughly six labels at any width.
  const step = Math.max(1, Math.ceil(data.length / 6));
  const ticks = data.filter((_, i) => i % step === 0).map((d) => d.t);

  return (
    <div className="chart-frame" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="t"
            type="category"
            ticks={ticks}
            tickFormatter={(t: number) => formatBarDate(t)}
            tick={axisTick}
            axisLine={{ stroke: GRID }}
            tickLine={false}
            interval={0}
            minTickGap={0}
          />
          <YAxis
            yAxisId="price"
            orientation="right"
            domain={[floor, max + pad]}
            tick={axisTick}
            tickFormatter={(v: number) => formatPrice(v, currency)}
            axisLine={false}
            tickLine={false}
            width={78}
          />
          {/* Volume shares the plot but is scaled to the bottom ~18% so it
              reads as a footprint rather than competing with price. */}
          <YAxis
            yAxisId="vol"
            domain={[0, maxVol > 0 ? maxVol * 5.5 : 1]}
            hide
          />
          <Tooltip
            content={<CandleTooltip currency={currency} />}
            cursor={{ fill: "rgba(94,139,166,0.07)" }}
          />
          <Bar yAxisId="vol" dataKey="v" fill={VOL} isAnimationActive={false} maxBarSize={14} />
          <Bar
            yAxisId="price"
            dataKey="wick"
            shape={<Candlestick />}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
