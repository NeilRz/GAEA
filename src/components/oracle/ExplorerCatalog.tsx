"use client";

import { useEffect, useMemo, useState } from "react";
import tokenized from "@/data/tokenized.json";
import type { CatalogRow } from "@/lib/oracle-catalog";
import CatIcon from "./CatIcon";

/* The Pyth-explore-shaped surface: a filter rail (quick search, collapsible
   checkbox groups with live counts) beside one dense table where signed
   datasets, tokenized assets, and watchlist names are all rows of the same
   catalog. Filter changes flash a short skeleton shimmer, rows fade in. */

type Kind = "dataset" | "asset" | "watch";

interface ExploreRow {
  key: string;
  kind: Kind;
  symbol: string;
  title: string;
  category: string;
  categoryKey: string;
  color: string;
  icon: string;
  status: { cls: string; label: string };
  details: string;
  meta: string;
  spark: number[] | null;
  datasetId: string;
  record: Record<string, unknown> | null;
}

const KIND_LABEL: Record<Kind, string> = {
  dataset: "Dataset",
  asset: "Tokenized asset",
  watch: "Watchlist",
};

const ASSET_STATUS: Record<string, { cls: string; label: string }> = {
  live: { cls: "good", label: "Live" },
  partial: { cls: "warn", label: "Partial" },
  defunct: { cls: "critical", label: "Defunct" },
  gap: { cls: "info", label: "Gap" },
};

const WATCH_STATUS: Record<string, { cls: string; label: string }> = {
  "none-verified": { cls: "", label: "None verified" },
  "pending-announcement": { cls: "info", label: "Pending" },
};

const DATASET_ICON: Record<string, string> = {
  reserves: "droplet",
  fields: "rig",
  tokenized: "coin",
  market: "chart",
  sites: "hammer",
  plants: "bolt",
  pipelines: "pipe",
  eia: "bars",
};

const FOLDER_STYLE: Record<string, { color: string; icon: string }> = {
  "oil-backed": { color: "#e8a33d", icon: "droplet" },
  "commodity-gold": { color: "#c4a469", icon: "ingot" },
  "precious-metals": { color: "#cbc3b1", icon: "diamond" },
  uranium: { color: "#8fb4c9", icon: "atom" },
  "base-metals": { color: "#b26a4e", icon: "hammer" },
  "battery-metals": { color: "#2ba57e", icon: "battery" },
  "rare-earths": { color: "#8a75e8", icon: "crystal" },
  "tokenized-equity": { color: "#5e8ba6", icon: "chart" },
  "context-rwa": { color: "#7e97a6", icon: "coin" },
  "watchlist-oil-equity": { color: "#7e97a6", icon: "eye" },
  "watchlist-mining-equity": { color: "#7e97a6", icon: "eye" },
};

function pretty(id: string): string {
  return id.replace(/-/g, " ");
}

function buildRows(catalog: CatalogRow[]): ExploreRow[] {
  const datasets: ExploreRow[] = catalog.map((c) => ({
    key: `ds-${c.id}`,
    kind: "dataset" as const,
    symbol: c.id,
    title: c.title,
    category: c.category,
    categoryKey: `ds:${c.category}`,
    color: c.color,
    icon: DATASET_ICON[c.id] ?? "coin",
    status: { cls: "good", label: "Attested" },
    details: c.records,
    meta: `v${c.version}`,
    spark: c.spark,
    datasetId: c.id,
    record: null,
  }));

  const assets: ExploreRow[] = tokenized.assets.map((a) => ({
    key: `as-${a.symbol}-${a.name}`,
    kind: "asset" as const,
    symbol: a.symbol === "—" ? "···" : a.symbol,
    title: a.name,
    category: pretty(a.category),
    categoryKey: a.category,
    color: FOLDER_STYLE[a.category]?.color ?? "#7e97a6",
    icon: FOLDER_STYLE[a.category]?.icon ?? "coin",
    status: ASSET_STATUS[a.status] ?? { cls: "", label: a.status },
    details: a.issuer,
    meta: a.chains.join(", ") || "—",
    spark: null,
    datasetId: "tokenized",
    record: {
      name: a.name,
      symbol: a.symbol,
      issuer: a.issuer,
      underlying: a.underlying,
      chains: a.chains.join(", "),
      status: a.status,
      note: a.relevance,
    },
  }));

  const watch: ExploreRow[] = tokenized.watchlist.map((w) => ({
    key: `wl-${w.ticker}-${w.name}`,
    kind: "watch" as const,
    symbol: w.ticker,
    title: w.name,
    category: pretty(
      w.sector === "mining" ? "watchlist-mining-equity" : "watchlist-oil-equity"
    ),
    categoryKey:
      w.sector === "mining" ? "watchlist-mining-equity" : "watchlist-oil-equity",
    color: "#7e97a6",
    icon: "eye",
    status: WATCH_STATUS[w.tokenization] ?? { cls: "", label: w.tokenization },
    details: w.listing,
    meta: "—",
    spark: null,
    datasetId: "tokenized",
    record: {
      name: w.name,
      ticker: w.ticker,
      listing: w.listing,
      sector: w.sector,
      tokenization: w.tokenization,
      note: "Watched for a verified tokenization event",
    },
  }));

  return [...datasets, ...assets, ...watch];
}

function Sparkline({ values }: { values: number[] }) {
  const W = 88;
  const H = 22;
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
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true">
      <polyline points={pts} fill="none" stroke="var(--c1)" strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

function FilterGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: Array<{ key: string; label: string; count: number }>;
  selected: Set<string>;
  onToggle: (key: string) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="ex-group">
      <button className="ex-group-title" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>{title}</span>
        <span className={`ex-chevron ${open ? "" : "closed"}`} aria-hidden="true">
          ⌃
        </span>
      </button>
      <div className={`ex-group-body ${open ? "" : "closed"}`}>
        <div>
          {options.map((o) => (
            <label key={o.key} className="ex-check">
              <input
                type="checkbox"
                checked={selected.has(o.key)}
                onChange={() => onToggle(o.key)}
              />
              <span className="ex-box" aria-hidden="true" />
              <span className="ex-check-label">{o.label}</span>
              <span className="ex-check-count">{o.count}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

type SortCol = "symbol" | "kind" | "category" | "status" | "details" | "meta";

const SORT_KEY: Record<SortCol, (r: ExploreRow) => string> = {
  symbol: (r) => r.symbol.toLowerCase(),
  kind: (r) => r.kind,
  category: (r) => r.category,
  status: (r) => r.status.label,
  details: (r) => r.details.toLowerCase(),
  meta: (r) => r.meta.toLowerCase(),
};

const SKELETON_WIDTHS = [72, 48, 64, 52, 88, 44, 60];

export default function ExplorerCatalog({
  catalog,
  onOpenDataset,
  onOpenRecord,
}: {
  catalog: CatalogRow[];
  onOpenDataset: (id: string) => void;
  onOpenRecord: (datasetId: string, record: Record<string, unknown>) => void;
}) {
  const rows = useMemo(() => buildRows(catalog), [catalog]);
  const [query, setQuery] = useState("");
  const [kinds, setKinds] = useState<Set<string>>(new Set());
  const [cats, setCats] = useState<Set<string>>(new Set());
  const [statuses, setStatuses] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<{ col: SortCol; dir: 1 | -1 } | null>(null);

  /* Short skeleton shimmer on checkbox-filter changes (not while typing),
     the Pyth-style "results refreshing" beat. */
  const [pending, setPending] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const bumpEpoch = () => {
    setEpoch((e) => e + 1);
    setPending(true);
  };
  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => setPending(false), 300);
    return () => clearTimeout(t);
  }, [pending, kinds, cats, statuses]);

  const toggle =
    (set: Set<string>, apply: (s: Set<string>) => void) => (key: string) => {
      const next = new Set(set);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      bumpEpoch();
      apply(next);
    };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (kinds.size && !kinds.has(r.kind)) return false;
      if (cats.size && !cats.has(r.categoryKey)) return false;
      if (statuses.size && !statuses.has(r.status.label)) return false;
      if (
        q &&
        !`${r.symbol} ${r.title} ${r.category} ${r.details}`.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
    if (sort) {
      const key = SORT_KEY[sort.col];
      out.sort((a, b) => (key(a) < key(b) ? -sort.dir : key(a) > key(b) ? sort.dir : 0));
    }
    return out;
  }, [rows, query, kinds, cats, statuses, sort]);

  const { kindCounts, statusCounts, catOptions } = useMemo(() => {
    const kind = new Map<string, number>();
    const status = new Map<string, number>();
    const catLabels = new Map<string, string>();
    const cat = new Map<string, number>();
    for (const r of rows) {
      kind.set(r.kind, (kind.get(r.kind) ?? 0) + 1);
      status.set(r.status.label, (status.get(r.status.label) ?? 0) + 1);
      cat.set(r.categoryKey, (cat.get(r.categoryKey) ?? 0) + 1);
      if (!catLabels.has(r.categoryKey)) catLabels.set(r.categoryKey, r.category);
    }
    return {
      kindCounts: kind,
      statusCounts: status,
      catOptions: Array.from(catLabels.entries()).map(([key, label]) => ({
        key,
        label,
        count: cat.get(key) ?? 0,
      })),
    };
  }, [rows]);

  const anyFilter = kinds.size > 0 || cats.size > 0 || statuses.size > 0 || query.length > 0;
  const clearAll = () => {
    bumpEpoch();
    setKinds(new Set());
    setCats(new Set());
    setStatuses(new Set());
    setQuery("");
  };

  const open = (r: ExploreRow) => {
    if (r.record) onOpenRecord(r.datasetId, r.record);
    else onOpenDataset(r.datasetId);
  };

  const clickSort = (col: SortCol) => {
    setSort((prev) =>
      !prev || prev.col !== col
        ? { col, dir: 1 }
        : prev.dir === 1
          ? { col, dir: -1 }
          : null
    );
  };

  const caret = (col: SortCol) =>
    sort?.col === col ? (sort.dir === 1 ? "↑" : "↓") : "⇅";

  const sortableTh = (col: SortCol, label: string) => (
    <th>
      <button className="th-sort" onClick={() => clickSort(col)}>
        {label} <span className={`th-caret ${sort?.col === col ? "on" : ""}`}>{caret(col)}</span>
      </button>
    </th>
  );

  return (
    <div className="ex-shell">
      <aside className="ex-rail">
        <input
          className="lib-search"
          placeholder="Quick search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search the catalog"
        />
        <div className="ex-rail-head">
          <span>Filters</span>
          {anyFilter && (
            <button className="ex-clear" onClick={clearAll}>
              Clear all
            </button>
          )}
        </div>
        <FilterGroup
          title="Type"
          options={(["dataset", "asset", "watch"] as Kind[]).map((k) => ({
            key: k,
            label: KIND_LABEL[k],
            count: kindCounts.get(k) ?? 0,
          }))}
          selected={kinds}
          onToggle={toggle(kinds, setKinds)}
        />
        <FilterGroup
          title="Category"
          options={catOptions}
          selected={cats}
          onToggle={toggle(cats, setCats)}
        />
        <FilterGroup
          title="Status"
          options={Array.from(statusCounts.entries()).map(([k, count]) => ({
            key: k,
            label: k,
            count,
          }))}
          selected={statuses}
          onToggle={toggle(statuses, setStatuses)}
        />
        <p className="ex-rail-note">
          Datasets are signed and Solana-anchored. Registry rows ship inside
          the <span className="mono">tokenized</span> dataset.
        </p>
      </aside>

      <div className="ex-body">
        <table className="data catalog explore">
          <thead>
            <tr>
              {sortableTh("symbol", "Symbol")}
              {sortableTh("kind", "Type")}
              {sortableTh("category", "Category")}
              {sortableTh("status", "Status")}
              {sortableTh("details", "Details")}
              {sortableTh("meta", "Version · Chains")}
              <th>Trend · 52w</th>
              <th aria-hidden="true"></th>
            </tr>
          </thead>
          {pending ? (
            <tbody>
              {SKELETON_WIDTHS.map((w, i) => (
                <tr key={i} className="ex-skel-row">
                  <td>
                    <span className="cat-id">
                      <span className="ex-avatar ex-skel" />
                      <span className="ex-skel ex-skel-bar" style={{ width: w + 30 }} />
                    </span>
                  </td>
                  {[0, 1, 2, 3, 4].map((c) => (
                    <td key={c}>
                      <span
                        className="ex-skel ex-skel-bar"
                        style={{ width: SKELETON_WIDTHS[(i + c + 1) % SKELETON_WIDTHS.length] }}
                      />
                    </td>
                  ))}
                  <td></td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          ) : (
            <tbody key={epoch} className="ex-rows">
              {filtered.map((r) => (
                <tr key={r.key} className="catalog-row" onClick={() => open(r)}>
                  <td>
                    <span className="cat-id">
                      <span
                        className="ex-avatar"
                        style={{ background: `${r.color}22`, color: r.color }}
                      >
                        <CatIcon icon={r.icon} />
                        {r.kind === "dataset" && (
                          <span className="ex-avatar-badge" title="Attested dataset">
                            ✓
                          </span>
                        )}
                      </span>
                      <span>
                        <span className="mono catalog-name">{r.symbol}</span>
                        <br />
                        <span className="dim" style={{ fontSize: 11.5 }}>{r.title}</span>
                      </span>
                    </span>
                  </td>
                  <td className="mono dim" style={{ fontSize: 11 }}>{KIND_LABEL[r.kind]}</td>
                  <td className="mono dim" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {r.category}
                  </td>
                  <td>
                    <span className={`badge ${r.status.cls}`}>{r.status.label}</span>
                  </td>
                  <td className="dim" style={{ fontSize: 12 }}>{r.details}</td>
                  <td className="mono dim" style={{ fontSize: 11.5 }}>{r.meta}</td>
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
          )}
        </table>
        <div className="ex-foot mono">
          {filtered.length} results · {rows.length} in catalog · informational
          only, not investment advice
        </div>
      </div>
    </div>
  );
}
