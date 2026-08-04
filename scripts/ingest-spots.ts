/**
 * GEOM spots ingest — EIA daily spot prices → src/data/spots.json.
 *
 * Daily spot prices for the benchmark barrel and products from the EIA v2
 * API (public domain, api.eia.gov), plus a computed 3-2-1 crack spread.
 * EIA stopped publishing NYMEX futures prices in April 2024, so spot series
 * are the deepest price data that remains public-domain; the futures curve
 * stays out of the public record until exchange data is licensed.
 *
 * Deterministic by construction, same as ingest-eia: period+value pairs
 * only, meta.version = latest data period, so unchanged source data
 * produces byte-identical output and an unchanged anchor manifest.
 *
 * Usage:  npm run ingest:spots
 * Env:    EIA_API_KEY   free key from eia.gov/opendata (also read from
 *                       .env.local when run locally)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_PATH = join(ROOT, "src", "data", "spots.json");

// v1-style series IDs via the v2 compat route. Daily frequency.
const SERIES: Array<{
  key: string;
  eiaSeries: string; // full v1 id including route prefix
  label: string;
  unit: string;
}> = [
  { key: "wti_cushing", eiaSeries: "PET.RWTC.D", label: "WTI crude oil spot, Cushing OK", unit: "USD/bbl" },
  { key: "brent", eiaSeries: "PET.RBRTE.D", label: "Brent crude oil spot, Europe", unit: "USD/bbl" },
  { key: "rbob_nyh", eiaSeries: "PET.EER_EPMRU_PF4_Y35NY_DPG.D", label: "Conventional gasoline spot, New York Harbor", unit: "USD/gal" },
  { key: "ulsd_nyh", eiaSeries: "PET.EER_EPD2DXL0_PF4_Y35NY_DPG.D", label: "Ultra-low-sulphur diesel spot, New York Harbor", unit: "USD/gal" },
  { key: "henry_hub", eiaSeries: "NG.RNGWHHD.D", label: "Henry Hub natural gas spot", unit: "USD/MMBtu" },
];

const DAYS = 504; // roughly two years of trading days per series
const GAL_PER_BBL = 42;

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
  const url = `https://api.eia.gov/v2/seriesid/${eiaSeries}?api_key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`EIA API ${res.status} for ${eiaSeries}: ${(await res.text()).slice(0, 200)}`);
  }
  const body = (await res.json()) as { response?: { data?: EiaRow[] }; error?: string };
  const rows = body.response?.data;
  if (!rows?.length) {
    throw new Error(`EIA API returned no data for ${eiaSeries}${body.error ? `: ${body.error}` : ""}`);
  }
  return rows
    .filter((r) => r.value !== null && r.value !== undefined && r.period)
    .map((r) => ({ period: r.period, value: Number(r.value) }))
    .filter((r) => Number.isFinite(r.value))
    .sort((a, b) => (a.period < b.period ? -1 : 1))
    .slice(-DAYS);
}

/** 3-2-1 crack spread in USD/bbl: (2·RBOB + 1·ULSD)·42/3 − WTI, on dates where all three trade. */
function crack321(
  wti: Array<{ period: string; value: number }>,
  rbob: Array<{ period: string; value: number }>,
  ulsd: Array<{ period: string; value: number }>,
): Array<{ period: string; value: number }> {
  const byPeriod = (rows: Array<{ period: string; value: number }>) =>
    new Map(rows.map((r) => [r.period, r.value]));
  const r = byPeriod(rbob);
  const u = byPeriod(ulsd);
  const out: Array<{ period: string; value: number }> = [];
  for (const { period, value: w } of wti) {
    const rv = r.get(period);
    const uv = u.get(period);
    if (rv === undefined || uv === undefined) continue;
    const crack = ((2 * rv + uv) * GAL_PER_BBL) / 3 - w;
    out.push({ period, value: Math.round(crack * 100) / 100 });
  }
  return out.slice(-DAYS);
}

async function main() {
  loadLocalEnv();
  const apiKey = process.env.EIA_API_KEY;
  if (!apiKey) {
    throw new Error("EIA_API_KEY is not set (env or .env.local).");
  }

  const fetched = new Map<string, Array<{ period: string; value: number }>>();
  const series = [];
  for (const s of SERIES) {
    const points = await fetchSeries(s.eiaSeries, apiKey);
    fetched.set(s.key, points);
    const latest = points[points.length - 1];
    console.log(`${s.eiaSeries}  ${s.key.padEnd(14)} ${points.length} days, latest ${latest.period} = ${latest.value}`);
    series.push({
      id: s.key,
      eiaSeries: s.eiaSeries,
      label: s.label,
      unit: s.unit,
      latest,
      points,
    });
  }

  const crack = crack321(fetched.get("wti_cushing")!, fetched.get("rbob_nyh")!, fetched.get("ulsd_nyh")!);
  const crackLatest = crack[crack.length - 1];
  console.log(`computed      crack_321      ${crack.length} days, latest ${crackLatest.period} = ${crackLatest.value}`);
  series.push({
    id: "crack_321",
    eiaSeries: "computed",
    label: "3-2-1 crack spread, spot basis (2×gasoline + 1×diesel − 3×WTI, per barrel)",
    unit: "USD/bbl",
    latest: crackLatest,
    points: crack,
  });

  const version = series.map((s) => s.latest.period).reduce((a, b) => (a > b ? a : b));

  const dataset = {
    meta: {
      id: "spots",
      title: "Benchmark spot prices & crack spread (EIA daily)",
      description:
        "Daily spot prices for WTI Cushing, Brent, New York Harbor gasoline and diesel, and Henry Hub natural gas, from the U.S. EIA (public domain, api.eia.gov), with a 3-2-1 crack spread computed on the spot basis. EIA discontinued publication of NYMEX futures prices in April 2024; these spot series are the public-domain record of the price deck.",
      unit: "per series — see series[].unit",
      sources: ["U.S. EIA spot price series (api.eia.gov v2)"],
      cadence: "daily (EIA publication lags the trading day)",
      version,
    },
    series,
  };

  const next = JSON.stringify(dataset, null, 2) + "\n";
  const prev = existsSync(OUT_PATH) ? readFileSync(OUT_PATH, "utf8") : null;
  if (prev === next) {
    console.log(`No change — src/data/spots.json already at ${version}`);
    return;
  }
  writeFileSync(OUT_PATH, next);
  console.log(`Wrote src/data/spots.json  (version ${version}, ${series.length} series)`);
  console.log("Dataset changed — run `npm run anchor` to update the on-chain manifest.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
