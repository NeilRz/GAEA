"use client";

import type { CatalogRow } from "@/lib/oracle-catalog";

/* Inline sparkline, one polyline scaled into a fixed box. Flat data still
   draws a visible line because the y-range is padded. */
function Sparkline({ values }: { values: number[] }) {
  const W = 96;
  const H = 28;
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

export default function DatasetCatalog({
  rows,
  onOpen,
}: {
  rows: CatalogRow[];
  onOpen: (id: string) => void;
}) {
  return (
    <section>
      <p className="panel-title">
        Dataset catalog <span className="badge good">all attested</span>
      </p>
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
            {rows.map((r) => (
              <tr
                key={r.id}
                className="catalog-row"
                onClick={() => onOpen(r.id)}
              >
                <td>
                  <span className="mono catalog-name">{r.id}</span>
                  <br />
                  <span className="dim" style={{ fontSize: 12 }}>{r.title}</span>
                </td>
                <td>
                  <span className="badge plain">{r.category}</span>
                </td>
                <td className="mono dim">{r.records}</td>
                <td className="mono dim">v{r.version}</td>
                <td className="mono dim">{r.updated}</td>
                <td>
                  {r.spark ? (
                    <Sparkline values={r.spark} />
                  ) : (
                    <span className="dimmer mono" style={{ fontSize: 11 }}>
                      registry
                    </span>
                  )}
                </td>
                <td className="mono catalog-go" aria-hidden="true">→</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="dimmer" style={{ fontSize: 12, marginTop: 8 }}>
        Every row is fingerprinted, signed, and anchored. Click a dataset for
        its data, digests, and verification tools.
      </p>
    </section>
  );
}
