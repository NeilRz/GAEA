import type { Metadata } from "next";
import market from "@/data/market.json";
import {
  FuturesCurveChart,
  CrackSpreadChart,
  InventoryChart,
} from "@/components/charts";

export const metadata: Metadata = {
  title: "Terminal — GAEA",
  description:
    "Read-only oil market structure: futures curve, crack spreads, inventories.",
};

export default function TerminalPage() {
  return (
    <main className="main">
      <p className="eyebrow">MOD-04</p>
      <h1 className="page-title">Terminal</h1>
      <p className="page-lede">
        Read-only market structure. The terminal reads the shape of the market
        — curve, cracks, inventories — rather than calling price. All series
        below are <strong style={{ color: "var(--ink)" }}>illustrative
        samples</strong> demonstrating the wiring; exchange and vendor feed
        integration is the next milestone.
      </p>
      <p style={{ margin: "8px 0 20px" }}>
        <span className="badge warn">Sample data — not live quotes</span>
      </p>

      <div className="grid grid-2">
        <section className="panel" style={{ gridColumn: "1 / -1" }}>
          <p className="chart-title">Futures curve — WTI vs Brent</p>
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

      <p className="provenance">{market.meta.note}</p>
    </main>
  );
}
