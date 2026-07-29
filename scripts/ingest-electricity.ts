/**
 * GEOM ingest — Ember yearly electricity data → src/data/electricity.json
 *
 * Electricity generation by fuel (TWh) per country per year, from Ember's
 * yearly full release (ember-energy.org), CC BY 4.0. Ember compiles and
 * harmonizes national sources, EIA, Eurostat and UN data; it is the most
 * widely cited open electricity dataset.
 *
 * Deterministic: fixed category/unit/fuel filter, values rounded to 2
 * decimals (source precision), stable sort, version = newest data year.
 *
 * Usage: npm run ingest:electricity
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseCsv, columns } from "./csv";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_PATH = join(ROOT, "src", "data", "electricity.json");

const SOURCE_URL =
  "https://storage.googleapis.com/emb-prod-bkt-publicdata/public-downloads/yearly_full_release_long_format.csv";

const FIRST_YEAR = 2015;

const FUELS: Array<{ id: string; variable: string }> = [
  { id: "coal", variable: "Coal" },
  { id: "gas", variable: "Gas" },
  { id: "other_fossil", variable: "Other Fossil" },
  { id: "nuclear", variable: "Nuclear" },
  { id: "hydro", variable: "Hydro" },
  { id: "wind", variable: "Wind" },
  { id: "solar", variable: "Solar" },
  { id: "bioenergy", variable: "Bioenergy" },
  { id: "other_renewables", variable: "Other Renewables" },
  { id: "total", variable: "Total Generation" },
];

async function main() {
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`Ember fetch failed: ${res.status}`);
  const rows = parseCsv(await res.text());
  const col = columns(rows[0]);
  const byVariable = new Map(FUELS.map((f) => [f.variable, f.id]));

  // area key -> { name, series: fuel -> year -> value }
  const acc = new Map<string, { name: string; data: Map<string, Map<number, number>> }>();
  let latestYear = 0;

  for (const r of rows.slice(1)) {
    if (col(r, "Category") !== "Electricity generation") continue;
    if (col(r, "Unit") !== "TWh") continue;
    const fuel = byVariable.get(col(r, "Variable"));
    if (!fuel) continue;
    const year = Number(col(r, "Year"));
    if (!Number.isInteger(year) || year < FIRST_YEAR) continue;
    const iso = col(r, "ISO 3 code").trim();
    const area = col(r, "Area").trim();
    const isCountry = col(r, "Area type") === "Country or economy" && iso !== "";
    const isWorld = area === "World";
    if (!isCountry && !isWorld) continue;
    const value = Number(col(r, "Value"));
    if (!Number.isFinite(value)) continue;
    const key = isWorld ? "WLD" : iso;
    let entry = acc.get(key);
    if (!entry) acc.set(key, (entry = { name: area, data: new Map() }));
    let series = entry.data.get(fuel);
    if (!series) entry.data.set(fuel, (series = new Map()));
    series.set(year, Number(value.toFixed(2)));
    if (year > latestYear) latestYear = year;
  }

  const areas = [...acc.keys()].sort().map((code) => {
    const { name, data } = acc.get(code)!;
    const series: Record<string, Array<[number, number]>> = {};
    for (const f of FUELS) {
      const s = data.get(f.id);
      if (!s) continue;
      series[f.id] = [...s.entries()].sort(([a], [b]) => a - b);
    }
    return { code, name, series };
  });

  const nPoints = areas.reduce(
    (n, a) => n + Object.values(a.series).reduce((m, s) => m + s.length, 0),
    0
  );
  console.log(`${areas.length} areas, ${nPoints} observations, latest year ${latestYear}`);

  const dataset = {
    meta: {
      id: "electricity",
      title: "World electricity generation by fuel (Ember)",
      description:
        "Annual electricity generation in TWh per country and fuel (coal, gas, other fossil, nuclear, hydro, wind, solar, bioenergy, other renewables, total), plus the world aggregate (code WLD), compiled by Ember's yearly full release and republished here under GEOM attestation. Points are [year, TWh] pairs.",
      unit: "TWh",
      sources: [
        "Ember, Yearly electricity data (yearly full release long format, ember-energy.org)",
      ],
      license: "CC BY 4.0 (Ember)",
      cadence: `annual with in-year revisions · window ${FIRST_YEAR} onward`,
      version: String(latestYear),
    },
    fuels: FUELS.map((f) => f.id),
    areas,
  };

  const next = JSON.stringify(dataset) + "\n";
  const prev = existsSync(OUT_PATH) ? readFileSync(OUT_PATH, "utf8") : null;
  if (prev === next) {
    console.log(`No change — src/data/electricity.json already at ${latestYear}`);
    return;
  }
  writeFileSync(OUT_PATH, next);
  console.log(`Wrote src/data/electricity.json (version ${latestYear}, ${areas.length} areas)`);
  console.log("Dataset changed — run `npm run anchor` to update the on-chain manifest.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
