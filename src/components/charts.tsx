"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  LabelList,
} from "recharts";
import market from "@/data/market.json";
import tokenized from "@/data/tokenized.json";

/* Categorical order (CVD-validated on #0A1220): blue, amber, teal, violet, rose */
const C = ["#3e90cb", "#c67c1b", "#2ba57e", "#8a75e8", "#cc5b7e"];
const INK2 = "#9fb2c9";
const INK3 = "#64778f";
const GRID = "#1e2f4a";
const GOOD = "#2ba57e";
const CRITICAL = "#cc4a57";

interface TooltipEntry {
  name?: string | number;
  value?: number | string | Array<number | string>;
  color?: string;
}

function ChartTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="t-label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="t-row">
          <span className="t-swatch" style={{ background: p.color }} />
          <span>
            {p.name}: {typeof p.value === "number" ? p.value.toFixed(1) : p.value}
            {unit ? ` ${unit}` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

const axisTick = { fill: INK3, fontSize: 11, fontFamily: "var(--font-mono)" };

export function FuturesCurveChart() {
  const { months, series, unit } = market.futuresCurve;
  const data = months.map((m, i) => ({
    month: m,
    WTI: series[0].values[i],
    Brent: series[1].values[i],
  }));
  return (
    <div className="chart-frame" style={{ height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 44, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="month" tick={axisTick} axisLine={{ stroke: GRID }} tickLine={false} />
          <YAxis
            tick={axisTick}
            axisLine={false}
            tickLine={false}
            domain={["dataMin - 1", "dataMax + 1"]}
            width={42}
          />
          <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ stroke: GRID }} />
          <Legend
            wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-mono)", color: INK2 }}
            iconType="plainline"
          />
          <Line
            type="monotone"
            dataKey="Brent"
            stroke={C[1]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "#0a1220" }}
          >
            <LabelList
              dataKey="Brent"
              content={(props) => <EndLabel {...props} lastIndex={data.length - 1} text="Brent" color={C[1]} />}
            />
          </Line>
          <Line
            type="monotone"
            dataKey="WTI"
            stroke={C[0]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "#0a1220" }}
          >
            <LabelList
              dataKey="WTI"
              content={(props) => <EndLabel {...props} lastIndex={data.length - 1} text="WTI" color={C[0]} />}
            />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* Direct label at the last point of a line series */
function EndLabel(props: {
  x?: string | number;
  y?: string | number;
  index?: number;
  lastIndex: number;
  text: string;
  color: string;
}) {
  const { x, y, index, lastIndex, text, color } = props;
  if (index !== lastIndex || x == null || y == null) return null;
  return (
    <text
      x={Number(x) + 8}
      y={Number(y) + 4}
      fill={color}
      fontSize={11}
      fontFamily="var(--font-mono)"
    >
      {text}
    </text>
  );
}

export function CrackSpreadChart() {
  const { weeks, values, unit } = market.crackSpread;
  const data = weeks.map((w, i) => ({ week: w, spread: values[i] }));
  return (
    <div className="chart-frame" style={{ height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="week" tick={axisTick} axisLine={{ stroke: GRID }} tickLine={false} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} width={36} domain={["dataMin - 2", "dataMax + 2"]} />
          <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ stroke: GRID }} />
          <Line
            type="monotone"
            dataKey="spread"
            name="3-2-1 crack"
            stroke={C[2]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "#0a1220" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function InventoryChart() {
  const { weeks, values, unit } = market.inventories;
  const data = weeks.map((w, i) => ({ week: w, change: values[i] }));
  return (
    <div className="chart-frame" style={{ height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }} barCategoryGap="30%">
          <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="week" tick={axisTick} axisLine={{ stroke: GRID }} tickLine={false} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} width={36} />
          <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: "rgba(62,144,203,0.06)" }} />
          <ReferenceLine y={0} stroke={INK3} strokeWidth={1} />
          <Bar dataKey="change" name="Weekly change" radius={[4, 4, 0, 0]} maxBarSize={26}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.change < 0 ? CRITICAL : GOOD} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="legend-row" style={{ marginTop: 6, gap: 16 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: GOOD }} /> build
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: CRITICAL }} /> draw
        </span>
      </div>
    </div>
  );
}

export function TokenizationGapChart() {
  const g = tokenized.gap;
  const rows = [
    { name: "Oil & gas equity market cap", value: g.oilEquityMarketCapUSD / 1e9, color: C[0] },
    { name: "Tokenized commodities (all, mostly gold)", value: g.tokenizedCommodityRWAUSD / 1e9, color: C[1] },
    { name: "Tokenized crude oil", value: g.tokenizedOilUSD / 1e9, color: C[4] },
  ];
  const max = Math.sqrt(Math.max(...rows.map((r) => r.value)));
  const fmt = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(1)}T` : n === 0 ? "$0 — the gap" : `$${n.toFixed(1)}B`;
  return (
    <div className="chart-frame">
      {rows.map((r) => (
        <div key={r.name} style={{ margin: "14px 0" }}>
          <div style={{ fontSize: 12, color: INK2, marginBottom: 5 }}>{r.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: `${Math.max((Math.sqrt(r.value) / max) * 72, r.value > 0 ? 1 : 0)}%`,
                height: 18,
                background: r.color,
                borderRadius: "0 4px 4px 0",
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: r.value === 0 ? "#e87a85" : INK2,
                whiteSpace: "nowrap",
              }}
            >
              {fmt(r.value)}
            </span>
          </div>
        </div>
      ))}
      <p className="chart-sub" style={{ marginTop: 10, marginBottom: 0 }}>
        bar length on sqrt scale · approximate orders of magnitude, seed data
      </p>
    </div>
  );
}
