/**
 * GEOM ingest — JODI-Oil World Database → src/data/jodi.json
 *
 * Monthly crude oil balances for every JODI reporting country: field
 * production, refinery intake, imports, exports and closing stock levels.
 * The Joint Organisations Data Initiative (jodidata.org) publishes these
 * figures freely; eight partner organisations (incl. OPEC, IEA, Eurostat)
 * compile the submissions.
 *
 * Deterministic: fixed product/flow/unit filters, stable sort, version =
 * newest TIME_PERIOD present in the data. Re-run monthly after the JODI
 * update (~20th), then `npm run anchor` if changed.
 *
 * Usage: npm run ingest:jodi
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseCsv, columns } from "./csv";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_PATH = join(ROOT, "src", "data", "jodi.json");

const BASE = "https://www.jodidata.org/_resources/files/downloads/oil-data/annual-csv/primary";
const FIRST_YEAR = 2021;
/** The current partial year ships under a different filename. */
const CURRENT_YEAR = 2026;

const FLOWS: Array<{ id: string; label: string; unit: string }> = [
  { id: "INDPROD", label: "Field production", unit: "kb/d" },
  { id: "REFINOBS", label: "Refinery intake", unit: "kb/d" },
  { id: "TOTIMPSB", label: "Imports", unit: "kb/d" },
  { id: "TOTEXPSB", label: "Exports", unit: "kb/d" },
  { id: "CLOSTLV", label: "Closing stocks", unit: "kbbl" },
];
/** kb/d for flow rates, kbbl for stock levels. */
const UNIT_FOR_FLOW: Record<string, string> = {
  INDPROD: "KBD",
  REFINOBS: "KBD",
  TOTIMPSB: "KBD",
  TOTEXPSB: "KBD",
  CLOSTLV: "KBBL",
};

function countryName(code: string): string {
  try {
    const n = new Intl.DisplayNames(["en"], { type: "region" }).of(code);
    return n && n !== code ? n : code;
  } catch {
    return code;
  }
}

async function fetchYear(url: string): Promise<string[][]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`JODI fetch failed (${res.status}): ${url}`);
  return parseCsv(await res.text());
}

async function main() {
  const urls: string[] = [];
  for (let y = FIRST_YEAR; y < CURRENT_YEAR; y++) urls.push(`${BASE}/${y}.csv`);
  urls.push(`${BASE}/primaryyear${CURRENT_YEAR}.csv`);

  // country -> flow -> period -> value
  const acc = new Map<string, Map<string, Map<string, number>>>();
  let latest = "";

  for (const url of urls) {
    const rows = await fetchYear(url);
    const col = columns(rows[0]);
    let kept = 0;
    for (const r of rows.slice(1)) {
      if (col(r, "ENERGY_PRODUCT") !== "CRUDEOIL") continue;
      const flow = col(r, "FLOW_BREAKDOWN");
      const wantUnit = UNIT_FOR_FLOW[flow];
      if (!wantUnit || col(r, "UNIT_MEASURE") !== wantUnit) continue;
      const value = Number(col(r, "OBS_VALUE"));
      if (!Number.isFinite(value)) continue; // "-" and "x" mark unreported values
      const area = col(r, "REF_AREA");
      const period = col(r, "TIME_PERIOD");
      let flows = acc.get(area);
      if (!flows) acc.set(area, (flows = new Map()));
      let points = flows.get(flow);
      if (!points) flows.set(flow, (points = new Map()));
      points.set(period, value);
      if (period > latest) latest = period;
      kept++;
    }
    console.log(`${url.split("/").pop()}  kept ${kept} observations`);
  }

  const countries = [...acc.keys()].sort().map((code) => {
    const flows = acc.get(code)!;
    const series: Record<string, Array<[string, number]>> = {};
    for (const f of FLOWS) {
      const points = flows.get(f.id);
      if (!points) continue;
      series[f.id] = [...points.entries()]
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([period, value]) => [period, value] as [string, number]);
    }
    return { code, name: countryName(code), series };
  });

  const nPoints = countries.reduce(
    (n, c) => n + Object.values(c.series).reduce((m, s) => m + s.length, 0),
    0
  );
  console.log(`${countries.length} countries, ${nPoints} observations, latest ${latest}`);

  const dataset = {
    meta: {
      id: "jodi",
      title: "World crude oil balances (JODI-Oil)",
      description:
        "Monthly crude oil balances per reporting country: field production, refinery intake, imports, exports (kb/d) and closing stock levels (kbbl). Compiled by the Joint Organisations Data Initiative from national submissions and republished here under GEOM attestation. Points are [YYYY-MM, value] pairs.",
      unit: "kb/d (flows) · kbbl (stock levels)",
      sources: [
        "JODI-Oil World Database, Joint Organisations Data Initiative (jodidata.org), primary annual CSV files",
      ],
      license: "JODI public data, freely available (jodidata.org)",
      cadence: `monthly (~20th) · window ${FIRST_YEAR}-01 onward`,
      version: latest,
    },
    flows: FLOWS,
    countries,
  };

  const next = JSON.stringify(dataset) + "\n";
  const prev = existsSync(OUT_PATH) ? readFileSync(OUT_PATH, "utf8") : null;
  if (prev === next) {
    console.log(`No change — src/data/jodi.json already at ${latest}`);
    return;
  }
  writeFileSync(OUT_PATH, next);
  console.log(`Wrote src/data/jodi.json (version ${latest}, ${countries.length} countries)`);
  console.log("Dataset changed — run `npm run anchor` to update the on-chain manifest.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
