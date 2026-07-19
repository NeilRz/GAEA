"use client";

import { useMemo, useState } from "react";

export interface LibraryRow {
  key: string;
  symbol: string;
  name: string;
  issuer: string;
  underlying: string;
  chains: string;
  folder: string;
  status: { cls: string; label: string };
  note: string;
}

const FOLDER_LABELS: Record<string, string> = {
  "oil-backed": "oil-backed",
  "commodity-gold": "commodity-gold",
  "tokenized-equity": "tokenized-equity",
  "context-rwa": "context-rwa",
  "equity-watchlist": "equity-watchlist",
};

export default function TrackerLibrary({ rows }: { rows: LibraryRow[] }) {
  const [folder, setFolder] = useState<string>("all");
  const [query, setQuery] = useState("");

  const folders = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach((r) => counts.set(r.folder, (counts.get(r.folder) ?? 0) + 1));
    return Object.keys(FOLDER_LABELS)
      .filter((f) => counts.has(f))
      .map((f) => ({ id: f, label: FOLDER_LABELS[f], count: counts.get(f)! }));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (folder !== "all" && r.folder !== folder) return false;
      if (!q) return true;
      return [r.symbol, r.name, r.issuer, r.underlying, r.chains, r.note]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [rows, folder, query]);

  const grouped = useMemo(() => {
    const order = Object.keys(FOLDER_LABELS).filter((f) =>
      filtered.some((r) => r.folder === f)
    );
    return order.map((f) => ({
      folder: f,
      rows: filtered.filter((r) => r.folder === f),
    }));
  }, [filtered]);

  return (
    <div className="lib-grid">
      <aside className="panel" style={{ padding: 14 }}>
        <p className="panel-title" style={{ marginBottom: 10 }}>
          Library
        </p>
        <div className="folder-list">
          <button
            className={`folder-btn ${folder === "all" ? "on" : ""}`}
            onClick={() => setFolder("all")}
          >
            <span>
              <span className="glyph">▾</span> all entries
            </span>
            <span className="count">{rows.length}</span>
          </button>
          {folders.map((f) => (
            <button
              key={f.id}
              className={`folder-btn ${folder === f.id ? "on" : ""}`}
              onClick={() => setFolder(folder === f.id ? "all" : f.id)}
            >
              <span>
                <span className="glyph">{folder === f.id ? "▾" : "▸"}</span>{" "}
                {f.label}
              </span>
              <span className="count">{f.count}</span>
            </button>
          ))}
        </div>
      </aside>

      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            className="lib-search"
            placeholder="filter by name, issuer, underlying…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Filter registry"
          />
          {(query || folder !== "all") && (
            <button
              className="btn"
              onClick={() => {
                setQuery("");
                setFolder("all");
              }}
            >
              Clear
            </button>
          )}
        </div>

        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Issuer / listing</th>
                <th>Underlying</th>
                <th>Chains</th>
                <th>Status</th>
                <th>Why it&apos;s tracked</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="dim" style={{ fontSize: 13 }}>
                    No entries match — clear the filter or pick another folder.
                  </td>
                </tr>
              )}
              {grouped.map((g) => (
                <FolderGroup key={g.folder} folder={g.folder} rows={g.rows} />
              ))}
            </tbody>
          </table>
        </div>

        <p className="dimmer mono" style={{ fontSize: 11, margin: 0 }}>
          {filtered.length} of {rows.length} entries ·{" "}
          {folder === "all" ? "all folders" : `library/${folder}`}
        </p>
      </div>
    </div>
  );
}

function FolderGroup({ folder, rows }: { folder: string; rows: LibraryRow[] }) {
  return (
    <>
      <tr className="folder-head">
        <td colSpan={6}>
          library/<b>{folder}</b> · {rows.length}{" "}
          {rows.length === 1 ? "entry" : "entries"}
        </td>
      </tr>
      {rows.map((r) => (
        <tr key={r.key}>
          <td>
            <span className="mono" style={{ color: "var(--ink)" }}>
              {r.symbol}
            </span>
            <br />
            <span className="dim" style={{ fontSize: 12 }}>
              {r.name}
            </span>
          </td>
          <td className="dim">{r.issuer}</td>
          <td className="dim">{r.underlying}</td>
          <td className="dim mono" style={{ fontSize: 12 }}>
            {r.chains || "—"}
          </td>
          <td>
            <span className={`badge ${r.status.cls}`}>{r.status.label}</span>
          </td>
          <td className="dim" style={{ fontSize: 12, maxWidth: 280 }}>
            {r.note}
          </td>
        </tr>
      ))}
    </>
  );
}
