"use client";

import market from "@/data/market.json";
import {
  FuturesCurveChart,
  CrackSpreadChart,
  InventoryChart,
} from "@/components/charts";
import { MarketBoard } from "@/components/MarketBoard";
import { useAppNav } from "./GeomApp";

export default function TerminalModule() {
  const nav = useAppNav();
  return (
    <main className="main">
      <div className="mod-intro-row">
        <p className="mod-intro">
          Live market structure across the instruments we track. The terminal
          reads the shape of the market; it does not call price, and nothing
          here is advice.
        </p>
        <span style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
          <span className="badge">Live quotes · 60s refresh</span>
          <button className="dl-chip" onClick={() => nav.openDataset("market")}>
            SERIES ON ORACLE →
          </button>
        </span>
      </div>

      <MarketBoard />

      <section className="panel" style={{ marginTop: 28 }}>
        <p className="chart-title">Structural series</p>
        <p className="chart-sub">
          Curve, cracks and inventories, the shape behind the tape. These three
          remain{" "}
          <strong style={{ color: "var(--ink)" }}>illustrative samples</strong>;
          exchange and vendor feed integration is the next milestone.
        </p>
        <p style={{ margin: "8px 0 4px" }}>
          <span className="badge warn">Sample data, not live quotes</span>
        </p>
      </section>

      <div className="grid grid-2">
        <section className="panel" style={{ gridColumn: "1 / -1" }}>
          <p className="chart-title">Futures curve, WTI vs Brent</p>
          <p className="chart-sub">
            USD/bbl by contract month · {market.futuresCurve.asOfLabel}
          </p>
          <FuturesCurveChart />
          <p className="dim" style={{ fontSize: 13, marginBottom: 0 }}>
            {market.futuresCurve.reading}
          </p>
        </section>

        <section className="panel">
          <p className="chart-title">3-2-1 crack spread</p>
          <p className="chart-sub">{market.crackSpread.label}</p>
          <CrackSpreadChart />
        </section>

        <section className="panel">
          <p className="chart-title">Crude inventories</p>
          <p className="chart-sub">{market.inventories.label}</p>
          <InventoryChart />
        </section>
      </div>

      <p className="provenance">
        Live quotes proxied from the Yahoo Finance chart API (unofficial,
        delayed, unlicensed) and cached 60s, market colour, not a trading feed.
        Structural series: {market.meta.note}
      </p>
    </main>
  );
}
