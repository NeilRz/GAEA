"use client";

import { useMemo, useState } from "react";
import type { CatalogRow } from "@/lib/oracle-catalog";

/* Inline sparkline, one polyline scaled into a fixed box. Flat data still
   draws a visible line because the y-range is padded. */
function Sparkline({ values }: { values: number[] }) {
  const W = 96;
  const H = 24;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min || 1) * 0.12;
  const lo = min - pad;
  const hi = max + pad;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * W;
      const y = H - ((v - lo) / (hi - lo)) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      className="spark"
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      aria-hidden="true"
    >
      <polyline
        points={pts}
        fill="none"
        stroke="var(--c1)"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* The Pyth-explore-shaped catalog: a toolbar with live filtering, then a
   dense table where every row is one attested dataset. */
export default function DatasetCatalog({
  rows,
  onOpen,
}: {
  rows: CatalogRow[];
  onOpen: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      `${r.id} ${r.title} ${r.category}`.toLowerCase().includes(q)
    );
  }, [rows, query]);

  return (
    <section>
      <div className="o-toolbar">
        <input
          className="lib-search"
          style={{ maxWidth: 300 }}
          placeholder="filter datasets…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Filter datasets"
        />
        <span className="mono dimmer" style={{ fontSize: 11, letterSpacing: "0.08em" }}>
          {filtered.length}/{rows.length} DATASETS
        </span>
        <span className="badge good" style={{ marginLeft: "auto" }}>
          all attested
        </span>
      </div>
      <div className="table-wrap">
        <table className="data catalog">
          <thead>
            <tr>
              <th>Dataset</th>
              <th>Category</th>
              <th>Records</th>
              <th>Version</th>
              <th>Updated</th>
              <th>Trend · 52w</th>
              <th aria-hidden="true"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr
                key={r.id}
                className="catalog-row"
                onClick={() => onOpen(r.id)}
              >
                <td>
                  <span className="cat-id">
                    <span className="cat-dot" style={{ background: r.color }} />
                    <span>
                      <span className="mono catalog-name">{r.id}</span>
                      <br />
                      <span className="dim" style={{ fontSize: 11.5 }}>{r.title}</span>
                    </span>
                  </span>
                </td>
                <td className="mono dim" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {r.category}
                </td>
                <td className="mono dim">{r.records}</td>
                <td className="mono dim">v{r.version}</td>
                <td className="mono dim">{r.updated}</td>
                <td>
                  {r.spark ? (
                    <Sparkline values={r.spark} />
                  ) : (
                    <span className="dimmer mono" style={{ fontSize: 11 }}>—</span>
                  )}
                </td>
                <td className="mono catalog-go" aria-hidden="true">→</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
