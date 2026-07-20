/**
 * GAEA EIA ingest — U.S. weekly petroleum fundamentals → src/data/eia.json.
 *
 * Pulls the core Weekly Petroleum Status Report series from the EIA v2 API
 * (public domain, api.eia.gov) and writes them as a signed-dataset JSON in
 * the standard {meta, series} shape. Deterministic by construction: the
 * output contains only period+value pairs and meta.version is the latest
 * data period, so the same source data always produces the same bytes —
 * and therefore the same SHA-256 and the same anchor manifest.
 *
 * Usage:  npm run ingest:eia
 * Env:    EIA_API_KEY   free key from eia.gov/opendata (also read from
 *                       .env.local when run locally)
 *
 * After a change: bump happens automatically (version = data period);
 * run `npm run anchor` so the manifest on Solana matches. The GitHub
 * Action .github/workflows/eia-ingest.yml does both weekly.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_PATH = join(ROOT, "src", "data", "eia.json");

// The WPSR headline series. v1-style series IDs served through the v2
// backwards-compatibility route /v2/seriesid/{id}. Weekly frequency.
const SERIES: Array<{
  key: string;
  eiaSeries: string;
  label: string;
  unit: string;
}> = [
  { key: "crude_stocks", eiaSeries: "WCESTUS1", label: "Crude oil stocks, commercial (excl. SPR)", unit: "thousand barrels" },
  { key: "spr_stocks", eiaSeries: "WCSSTUS1", label: "Crude oil stocks, Strategic Petroleum Reserve", unit: "thousand barrels" },
  { key: "crude_production", eiaSeries: "WCRFPUS2", label: "U.S. field production of crude oil", unit: "thousand barrels/day" },
  { key: "refiner_inputs", eiaSeries: "WCRRIUS2", label: "Refiner net input of crude oil", unit: "thousand barrels/day" },
  { key: "refinery_utilization", eiaSeries: "WPULEUS3", label: "Refinery percent utilization", unit: "percent" },
  { key: "crude_imports", eiaSeries: "WCRIMUS2", label: "U.S. imports of crude oil", unit: "thousand barrels/day" },
  { key: "gasoline_stocks", eiaSeries: "WGTSTUS1", label: "Total motor gasoline stocks", unit: "thousand barrels" },
  { key: "distillate_stocks", eiaSeries: "WDISTUS1", label: "Distillate fuel oil stocks", unit: "thousand barrels" },
];

const WEEKS = 104; // two years of history per series

// tsx does not auto-load .env.local; Next only loads it for the app.
function loadLocalEnv() {
  const envPath = join(ROOT, ".env.local");
  if (!existsSync(envPath)) return;
  const text = readFileSync(envPath, "utf8").replace(/^﻿/, "");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim();
  }
}

interface EiaRow {
  period: string;
  value: number | string | null;
}

async function fetchSeries(eiaSeries: string, apiKey: string): Promise<Array<{ period: string; value: number }>> {
  // The v2 compat route needs the full v1 ID: PET.{series}.W for weekly petroleum.
  const url = `https://api.eia.gov/v2/seriesid/PET.${eiaSeries}.W?api_key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`EIA API ${res.status} for ${eiaSeries}: ${(await res.text()).slice(0, 200)}`);
  }
  const body = (await res.json()) as {
    response?: { data?: EiaRow[] };
    error?: string;
  };
  const rows = body.response?.data;
  if (!rows?.length) {
    throw new Error(`EIA API returned no data for ${eiaSeries}${body.error ? `: ${body.error}` : ""}`);
  }
  return rows
    .filter((r) => r.value !== null && r.value !== undefined && r.period)
    .map((r) => ({ period: r.period, value: Number(r.value) }))
    .filter((r) => Number.isFinite(r.value))
    .sort((a, b) => (a.period < b.period ? -1 : 1))
    .slice(-WEEKS);
}

async function main() {
  loadLocalEnv();
  const apiKey = process.env.EIA_API_KEY;
  if (!apiKey) {
    throw new Error("EIA_API_KEY is not set (env or .env.local).");
  }

  const series = [];
  for (const s of SERIES) {
    const points = await fetchSeries(s.eiaSeries, apiKey);
    const latest = points[points.length - 1];
    console.log(`${s.eiaSeries}  ${s.key.padEnd(22)} ${points.length} wks, latest ${latest.period} = ${latest.value}`);
    series.push({
      id: s.key,
      eiaSeries: s.eiaSeries,
      label: s.label,
      unit: s.unit,
      latest,
      points,
    });
  }

  // Version = newest data period across all series. Same data → same
  // version → byte-identical file → unchanged hash and anchor manifest.
  const version = series
    .map((s) => s.latest.period)
    .reduce((a, b) => (a > b ? a : b));

  const dataset = {
    meta: {
      id: "eia-wpsr",
      title: "U.S. weekly petroleum fundamentals (EIA WPSR)",
      description:
        "Headline series from the U.S. EIA Weekly Petroleum Status Report: crude and product stocks, field production, refiner inputs and utilization, imports. Public-domain U.S. government data, ingested from api.eia.gov and republished under GEOM attestation.",
      unit: "per series — see series[].unit",
      sources: ["U.S. EIA Weekly Petroleum Status Report (api.eia.gov v2)"],
      cadence: "weekly (WPSR release, Wednesdays ~10:30 ET)",
      version,
    },
    series,
  };

  const next = JSON.stringify(dataset, null, 2) + "\n";
  const prev = existsSync(OUT_PATH) ? readFileSync(OUT_PATH, "utf8") : null;
  if (prev === next) {
    console.log(`No change — src/data/eia.json already at ${version}`);
    return;
  }
  writeFileSync(OUT_PATH, next);
  console.log(`Wrote src/data/eia.json  (version ${version}, ${series.length} series)`);
  console.log("Dataset changed — run `npm run anchor` to update the on-chain manifest.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
