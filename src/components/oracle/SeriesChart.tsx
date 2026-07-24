"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  AreaSeries,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";

/* Weekly fundamentals chart in the terminal's chrome: same grid, crosshair
   and mono type as PriceChart, but a single area series over weekly data. */

const LINE = "#3e90cb"; // categorical 1, validated chart palette
const INK3 = "#7e97a6";

export interface SeriesData {
  id: string;
  label: string;
  unit: string;
  points: Array<{ time: string; value: number }>;
}

function formatValue(v: number, unit: string): string {
  if (unit === "percent") return `${v.toFixed(1)}%`;
  if (unit === "thousand barrels") return `${(v / 1000).toFixed(1)}M bbl`;
  if (unit === "thousand barrels/day") return `${(v / 1000).toFixed(2)}M b/d`;
  return v.toLocaleString("en-US");
}

export default function SeriesChart({ series }: { series: SeriesData[] }) {
  const [activeId, setActiveId] = useState(series[0]?.id ?? "");
  const [hover, setHover] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const areaRef = useRef<ISeriesApi<"Area"> | null>(null);
  /* Ref so the one-time crosshair callback always sees the active series. */
  const activeRef = useRef<SeriesData | undefined>(series[0]);

  const active = series.find((s) => s.id === activeId) ?? series[0];

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
        locale: "en-GB",
        priceFormatter: (v: number) =>
          formatValue(v, activeRef.current?.unit ?? ""),
      },
    });

    const area = chart.addSeries(AreaSeries, {
      lineColor: LINE,
      lineWidth: 2,
      topColor: "rgba(62, 144, 203, 0.28)",
      bottomColor: "rgba(62, 144, 203, 0.02)",
      priceLineStyle: LineStyle.Dashed,
    });

    chart.subscribeCrosshairMove((param) => {
      if (param.time == null) {
        setHover(null);
        return;
      }
      const t = param.time as string;
      const idx =
        activeRef.current?.points.findIndex((p) => p.time === t) ?? -1;
      setHover(idx >= 0 ? idx : null);
    });

    chartRef.current = chart;
    areaRef.current = area;
    return () => {
      chart.remove();
      chartRef.current = null;
      areaRef.current = null;
    };
  }, []);

  useEffect(() => {
    activeRef.current = active;
    const area = areaRef.current;
    if (!area || !active) return;
    area.setData(
      active.points.map((p) => ({ time: p.time as Time, value: p.value }))
    );
    chartRef.current?.timeScale().fitContent();
    setHover(null);
  }, [active]);

  if (!active) return null;

  const idx = hover ?? active.points.length - 1;
  const pt = active.points[idx];
  const prev = idx > 0 ? active.points[idx - 1] : null;
  const wow = prev ? pt.value - prev.value : null;
  const tone = wow == null || wow === 0 ? "tone-flat" : wow > 0 ? "tone-up" : "tone-down";

  return (
    <div className="panel">
      <p className="panel-title">Series · {active.label.toLowerCase()}</p>
      <div className="series-chips">
        {series.map((s) => (
          <button
            key={s.id}
            className={`dl-chip ${s.id === activeId ? "on" : ""}`}
            onClick={() => setActiveId(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="ohlc-legend" style={{ paddingTop: 10 }}>
        <span className="ohlc-date">{pt.time}</span>
        <span className="ohlc-pair">
          <span className="ohlc-k">VALUE</span>
          <span>{formatValue(pt.value, active.unit)}</span>
        </span>
        {wow != null && (
          <span className={`ohlc-pair ${tone}`}>
            <span className="ohlc-k">WK/WK</span>
            <span>
              {wow >= 0 ? "+" : "−"}
              {formatValue(Math.abs(wow), active.unit)}
            </span>
          </span>
        )}
        <span className="ohlc-pair">
          <span className="ohlc-k">UNIT</span>
          <span className="dimmer">{active.unit}</span>
        </span>
      </div>
      <div ref={wrapRef} className="chart-frame" style={{ height: 360 }} />
      <p className="provenance">
        Source: U.S. EIA Weekly Petroleum Status Report, public-domain U.S.
        government data republished under GEOM attestation. Informational
        only, not investment advice.
      </p>
    </div>
  );
}
