"use client";

import { useMemo, useState } from "react";
import { FOLDERS, type LibraryRow } from "@/lib/tracker-folders";

export type { LibraryRow };

export default function TrackerLibrary({ rows }: { rows: LibraryRow[] }) {
  const [folder, setFolder] = useState<string>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => m.set(r.folder, (m.get(r.folder) ?? 0) + 1));
    return m;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (folder !== "all" && r.folder !== folder) return false;
      if (!q) return true;
      return [r.symbol, r.name, r.issuer, r.underlying, r.chains, r.note, r.folder]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [rows, folder, query]);

  const grouped = useMemo(
    () =>
      FOLDERS.filter((f) => filtered.some((r) => r.folder === f.id)).map(
        (f) => ({
          folder: f.id,
          rows: filtered.filter((r) => r.folder === f.id),
        })
      ),
    [filtered]
  );

  return (
    <section className="dl-section">
      <div className="dl-head">
        <span className="left">
          <span className="tick" />
          CATALOG :: {rows.length} ENTRIES
        </span>
        <span className="status">{filtered.length} matching</span>
      </div>

      <div style={{ padding: 12, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="lib-search"
            placeholder="filter by name, issuer, underlying, folder…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Filter registry"
          />
          <button
            className="dl-chip"
            style={{ flexShrink: 0 }}
            onClick={() => {
              setQuery("");
              setFolder("all");
            }}
          >
            CLEAR
          </button>
        </div>

        <div className="dl-chips">
          <button
            className={`dl-chip ${folder === "all" ? "on" : ""}`}
            onClick={() => setFolder("all")}
          >
            ALL <span className="n">· {rows.length}</span>
          </button>
          {FOLDERS.filter((f) => counts.has(f.id)).map((f) => (
            <button
              key={f.id}
              className={`dl-chip ${folder === f.id ? "on" : ""}`}
              onClick={() => setFolder(folder === f.id ? "all" : f.id)}
            >
              {f.id.toUpperCase()} <span className="n">· {counts.get(f.id)}</span>
            </button>
          ))}
        </div>

        <div className="table-wrap" style={{ borderRadius: 4 }}>
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
    </section>
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
