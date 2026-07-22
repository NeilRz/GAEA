import type { Metadata } from "next";
import market from "@/data/market.json";
import {
  FuturesCurveChart,
  CrackSpreadChart,
  InventoryChart,
} from "@/components/charts";
import { MarketBoard } from "@/components/MarketBoard";

export const metadata: Metadata = {
  title: "Terminal · GEOM",
  description:
    "Live candlestick board: partner equities, tokenized real-world assets, energy, minerals and benchmarks.",
};

export default function TerminalPage() {
  return (
    <main className="main">
      <p className="eyebrow">MOD-03</p>
      <h1 className="page-title">Terminal</h1>
      <p className="page-lede">
        Live market structure across the instruments we track, partner
        equities, tokenized real-world assets, the energy complex, critical
        minerals, and the benchmarks underneath all of them. The terminal reads
        the shape of the market. It does not call price, and nothing here is
        advice.
      </p>
      <p style={{ margin: "8px 0 20px" }}>
        <span className="badge">Live quotes · 60s refresh</span>
      </p>

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
