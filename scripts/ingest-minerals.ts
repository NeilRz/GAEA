/**
 * GEOM ingest — USGS Mineral Commodity Summaries → src/data/minerals.json
 *
 * World production and reserves by country for ~90 nonfuel mineral
 * commodities, from the U.S. Geological Survey's Mineral Commodity
 * Summaries data release (public-domain U.S. government work, ScienceBase).
 * The authoritative annual reference for minerals statistics, and the
 * earliest comprehensive source for the prior year's world production.
 *
 * Deterministic: fixed section/statistic filter, numeric values only,
 * stable sort, version = EDITION. Bump EDITION + FILE_URL on the next
 * MCS data release.
 *
 * Usage: npm run ingest:minerals
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseCsv, columns } from "./csv";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_PATH = join(ROOT, "src", "data", "minerals.json");

/** MCS 2026 Data Release — Commodity Salient U.S. and World Statistics
 *  (ScienceBase item 69837e43b66b01367d7ec7c7, doi 10.5066/P1WKQ63T). */
const EDITION = "2026";
const FILE_URL =
  "https://www.sciencebase.gov/catalog/file/get/69837e43b66b01367d7ec7c7?f=__disk__d3%2Fac%2F84%2Fd3ac8466552946c5e8caa2c2c6338d9e1aff655d";

/** [commodity, country, stat, year, value, unit, section] */
type Row = [string, string, "production" | "reserves", number, number, string, string];

async function main() {
  const res = await fetch(FILE_URL);
  if (!res.ok) throw new Error(`MCS fetch failed: ${res.status}`);
  // The release CSV is windows-1252, not UTF-8 (em-dashes in section names).
  const text = Buffer.from(await res.arrayBuffer()).toString("latin1");
  const rows = parseCsv(text);
  const col = columns(rows[0]);

  const entries: Row[] = [];
  const criticalSet = new Set<string>();
  let skippedNonNumeric = 0;

  for (const r of rows.slice(1)) {
    const section = col(r, "Section").trim();
    if (!section.startsWith("World")) continue;
    const statRaw = col(r, "Statistics").trim();
    if (statRaw !== "Production" && statRaw !== "Reserves") continue;
    const year = Number(col(r, "Year"));
    if (!Number.isInteger(year)) continue;
    const value = Number(col(r, "Value").replace(/[, ]/g, ""));
    if (!Number.isFinite(value)) {
      skippedNonNumeric++;
      continue; // "NA", "W" (withheld), "Large", "<1" … stay in the source
    }
    const commodity = col(r, "Commodity").trim();
    if (col(r, "Is critical mineral 2025").trim() === "Yes") criticalSet.add(commodity);
    entries.push([
      commodity,
      col(r, "Country").trim(),
      statRaw === "Production" ? "production" : "reserves",
      year,
      value,
      col(r, "Unit").trim(),
      section,
    ]);
  }

  entries.sort((a, b) => {
    for (const i of [0, 1, 2] as const) {
      if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
    }
    return a[3] - b[3];
  });

  const commodities = new Set(entries.map((e) => e[0]));
  const countries = new Set(entries.map((e) => e[1]));
  console.log(
    `${entries.length} observations — ${commodities.size} commodities, ${countries.size} countries, ` +
      `${criticalSet.size} critical minerals (skipped ${skippedNonNumeric} non-numeric values)`
  );

  const dataset = {
    meta: {
      id: "minerals",
      title: "World mineral production & reserves (USGS MCS)",
      description:
        "World mine/refinery production and reserves by country for ~90 nonfuel mineral commodities, from the U.S. Geological Survey Mineral Commodity Summaries data release. Public-domain U.S. government data republished under GEOM attestation. Rows are [commodity, country, stat, year, value, unit, section]; withheld and non-numeric source values are omitted.",
      unit: "per row — see row[5]",
      sources: [
        `U.S. Geological Survey, Mineral Commodity Summaries ${EDITION} Data Release (ScienceBase, doi 10.5066/P1WKQ63T)`,
      ],
      license: "Public domain (U.S. Geological Survey)",
      cadence: "annual (MCS release, ~February)",
      version: EDITION,
    },
    criticalMinerals: [...criticalSet].sort(),
    rows: entries,
  };

  const next = JSON.stringify(dataset) + "\n";
  const prev = existsSync(OUT_PATH) ? readFileSync(OUT_PATH, "utf8") : null;
  if (prev === next) {
    console.log(`No change — src/data/minerals.json already at ${EDITION}`);
    return;
  }
  writeFileSync(OUT_PATH, next);
  console.log(`Wrote src/data/minerals.json (version ${EDITION}, ${entries.length} rows)`);
  console.log("Dataset changed — run `npm run anchor` to update the on-chain manifest.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
