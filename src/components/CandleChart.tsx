"use client";

import { useState } from "react";
import {
  ComposedChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { Candle } from "@/lib/quotes";
import { formatPrice, formatVolume, formatBarDate } from "@/lib/format";

/* Standard terminal conventions, not the GEOM categorical palette: candles
   read green/red the way every trading screen does, and traders parse that
   faster than any house colour. The chrome around them stays GEOM. */
const UP = "#26a69a";
const DOWN = "#ef5350";
const INK3 = "#7e97a6";
const GRID = "#1b272d";
const CROSSHAIR = "#8fb4c9";

const axisTick = { fill: INK3, fontSize: 11, fontFamily: "var(--font-mono)" };

interface Row {
  t: number;
  /* Floating bar: Recharts hands the custom shape the pixel box spanning
     [low, high], which is all we need to place open and close by hand. */
  wick: [number, number];
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  up: boolean;
}

/** One candle, drawn inside the pixel box Recharts computed for [low, high]. */
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

  // Standard proportions: body fills the slot leaving a ~1px gutter, so at
  // dense ranges the candles read as a continuous block the way a terminal does.
  const bodyW = Math.max(width - 1.4, 1);
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

/** Vertical crosshair snapped to the hovered bar. */
function CrosshairCursor(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}) {
  const { x, y, width, height } = props;
  if (x == null || y == null || width == null || height == null) return null;
  const cx = x + width / 2;
  return (
    <line
      x1={cx}
      x2={cx}
      y1={y}
      y2={y + height}
      stroke={CROSSHAIR}
      strokeWidth={1}
      strokeDasharray="3 3"
      opacity={0.6}
    />
  );
}

/** Price tag pinned to the right axis at the last close — the marker every
 *  terminal puts there so you can find the current print instantly. */
function LastPriceTag({
  viewBox,
  value,
  currency,
  up,
}: {
  viewBox?: { x?: number; y?: number; width?: number };
  value: number;
  currency: string;
  up: boolean;
}) {
  const y = viewBox?.y;
  const x = viewBox?.x;
  const w = viewBox?.width;
  if (y == null || x == null || w == null) return null;

  const text = formatPrice(value, currency);
  const boxW = Math.max(text.length * 6.6 + 12, 48);

  return (
    <g transform={`translate(${x + w}, ${y})`}>
      <rect x={2} y={-8.5} width={boxW} height={17} rx={2} fill={up ? UP : DOWN} />
      <text
        x={2 + boxW / 2}
        y={4}
        textAnchor="middle"
        fill="#08120f"
        fontSize={11}
        fontFamily="var(--font-mono)"
        fontWeight={700}
      >
        {text}
      </text>
    </g>
  );
}

export function CandleChart({
  candles,
  currency = "USD",
  height = 360,
}: {
  candles: Candle[];
  currency?: string;
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);

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

  const min = Math.min(...data.map((d) => d.l));
  const max = Math.max(...data.map((d) => d.h));
  const pad = (max - min) * 0.08 || max * 0.05 || 1;
  // On a wide range (VEEE spans $1.50–$128 over 6m) the padding exceeds the
  // low, and an axis tick reading "$-1.60" is nonsense for a price.
  const floor = Math.max(0, min - pad);

  const maxVol = Math.max(...data.map((d) => d.v), 0);
  const last = data[data.length - 1];

  // The legend reads the hovered bar, falling back to the latest — so the
  // OHLC line is always populated rather than blank until you mouse over.
  const active = hover != null && data[hover] ? data[hover] : last;
  const prev = hover != null && hover > 0 ? data[hover - 1] : data[data.length - 2];
  const barChangePct =
    prev && prev.c !== 0 ? ((active.c - prev.c) / prev.c) * 100 : null;

  // Thin out ticks so the axis never crowds — roughly six labels at any width.
  const step = Math.max(1, Math.ceil(data.length / 6));
  const ticks = data.filter((_, i) => i % step === 0).map((d) => d.t);

  return (
    <div>
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
            <span style={{ color: active.up ? UP : DOWN }}>{formatPrice(v, currency)}</span>
          </span>
        ))}
        {barChangePct !== null && (
          <span className="ohlc-pair" style={{ color: active.up ? UP : DOWN }}>
            {barChangePct >= 0 ? "+" : "−"}
            {Math.abs(barChangePct).toFixed(2)}%
          </span>
        )}
        <span className="ohlc-pair">
          <span className="ohlc-k">VOL</span>
          <span style={{ color: INK3 }}>{formatVolume(active.v)}</span>
        </span>
      </div>

      <div className="chart-frame" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
            onMouseMove={(s) => {
              // recharts types this as number | TooltipIndex | null | undefined
              const i = (s as { activeTooltipIndex?: unknown })?.activeTooltipIndex;
              setHover(typeof i === "number" ? i : null);
            }}
            onMouseLeave={() => setHover(null)}
          >
            <CartesianGrid stroke={GRID} vertical={false} />
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
              width={82}
            />
            {/* Volume rides a hidden axis scaled so it occupies the bottom
                ~18% — the conventional overlay footprint, close enough to a
                separate pane without stealing height from price. */}
            <YAxis yAxisId="vol" domain={[0, maxVol > 0 ? maxVol * 5.5 : 1]} hide />

            <Tooltip content={() => null} cursor={<CrosshairCursor />} />

            <Bar yAxisId="vol" dataKey="v" isAnimationActive={false}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.up ? UP : DOWN} fillOpacity={0.3} />
              ))}
            </Bar>
            <Bar
              yAxisId="price"
              dataKey="wick"
              shape={<Candlestick />}
              isAnimationActive={false}
            />

            <ReferenceLine
              yAxisId="price"
              y={last.c}
              stroke={last.up ? UP : DOWN}
              strokeDasharray="2 3"
              strokeOpacity={0.75}
              label={
                <LastPriceTag value={last.c} currency={currency} up={last.up} />
              }
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
