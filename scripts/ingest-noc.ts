/**
 * GEOM ingest — NRGI National Oil Company Database → src/data/noc.json
 *
 * Headline indicators for 71 national oil companies from the Natural
 * Resource Governance Institute's open NOC database
 * (nationaloilcompanydata.org): revenue, net income, transfers to
 * government, capex, balance sheet totals, production, reserves and
 * headcount, per company per year.
 *
 * Deterministic: fixed indicator whitelist (financials filtered to
 * USD million), stable sort, version = newest year with any numeric
 * observation.
 *
 * Usage: npm run ingest:noc
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseCsv, columns } from "./csv";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_PATH = join(ROOT, "src", "data", "noc.json");

const SOURCE_URL = "https://www.nationaloilcompanydata.org/api/export";

/** indicatorName (trimmed) -> series id. Financials are kept in USD million only. */
const INDICATORS: Array<{
  id: string;
  name: string;
  unit: "USD million" | "from-data";
  label: string;
}> = [
  { id: "total_revenue", name: "Total revenue", unit: "USD million", label: "Total revenue" },
  { id: "net_income", name: "Net income after taxes", unit: "USD million", label: "Net income after taxes" },
  { id: "transfers_to_government", name: "Total transfers to government", unit: "USD million", label: "Transfers to government" },
  { id: "capex", name: "Capital expenditures", unit: "USD million", label: "Capital expenditures" },
  { id: "total_assets", name: "Total assets", unit: "USD million", label: "Total assets" },
  { id: "production", name: "Oil & gas production", unit: "from-data", label: "Oil & gas production" },
  { id: "reserves", name: "Reserves", unit: "from-data", label: "Reserves" },
  { id: "employees", name: "Employees", unit: "from-data", label: "Employees" },
];

interface Company {
  name: string;
  country: string;
  iso3: string;
  region: string;
  group: string;
  series: Record<string, Array<[number, number]>>;
}

async function main() {
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`NOC export fetch failed: ${res.status}`);
  const rows = parseCsv(await res.text());
  const col = columns(rows[0]);

  const byName = new Map(INDICATORS.map((i) => [i.name, i]));
  const unitSeen = new Map<string, string>();

  // company -> indicator id -> year -> value
  const acc = new Map<string, { info: Omit<Company, "series">; data: Map<string, Map<number, number>> }>();
  let latestYear = 0;

  for (const r of rows.slice(1)) {
    const ind = byName.get(col(r, "indicatorName").trim());
    if (!ind) continue;
    const unit = col(r, "units").trim();
    if (ind.unit === "USD million" && unit !== "USD million") continue;
    const raw = Number(col(r, "observation").replace(/,/g, ""));
    if (!Number.isFinite(raw) || col(r, "observation").trim() === "") continue;
    // Round to 4 decimals: NRGI's export carries 17-significant-digit
    // float artifacts, and JS/Rust JSON parsers disagree on re-emitting
    // those — which would make the attestation hash toolchain-dependent.
    const value = Number(raw.toFixed(4));
    const year = Number(col(r, "year"));
    if (!Number.isInteger(year)) continue;
    if (ind.unit === "from-data" && !unitSeen.has(ind.id)) unitSeen.set(ind.id, unit);

    const company = col(r, "company").trim();
    let entry = acc.get(company);
    if (!entry) {
      acc.set(
        company,
        (entry = {
          info: {
            name: company,
            country: col(r, "country").trim(),
            iso3: col(r, "countryISO").trim(),
            region: col(r, "region").trim(),
            group: col(r, "productionGroup").trim(),
          },
          data: new Map(),
        })
      );
    }
    let series = entry.data.get(ind.id);
    if (!series) entry.data.set(ind.id, (series = new Map()));
    series.set(year, value);
    if (year > latestYear) latestYear = year;
  }

  const companies: Company[] = [...acc.keys()].sort().map((name) => {
    const { info, data } = acc.get(name)!;
    const series: Company["series"] = {};
    for (const ind of INDICATORS) {
      const s = data.get(ind.id);
      if (!s) continue;
      series[ind.id] = [...s.entries()]
        .sort(([a], [b]) => a - b)
        .map(([y, v]) => [y, v] as [number, number]);
    }
    return { ...info, series };
  });

  const nPoints = companies.reduce(
    (n, c) => n + Object.values(c.series).reduce((m, s) => m + s.length, 0),
    0
  );
  console.log(`${companies.length} companies, ${nPoints} observations, latest year ${latestYear}`);
  for (const [id, u] of unitSeen) console.log(`  unit for ${id}: ${u}`);

  const dataset = {
    meta: {
      id: "noc",
      title: "National oil company indicators (NRGI)",
      description:
        "Headline indicators for the world's national oil companies: total revenue, net income, transfers to government, capital expenditure and total assets (USD million), plus production, reserves and employees. Compiled by the Natural Resource Governance Institute's open National Oil Company Database and republished here under GEOM attestation. Points are [year, value] pairs.",
      unit: "USD million (financials) — see indicators[].unit",
      sources: [
        "National Oil Company Database, Natural Resource Governance Institute (nationaloilcompanydata.org), full-dataset export",
      ],
      license: "Open data published by NRGI (nationaloilcompanydata.org)",
      cadence: "NRGI database revisions",
      version: String(latestYear),
    },
    indicators: INDICATORS.map(({ id, label, unit }) => ({
      id,
      label,
      unit: unit === "from-data" ? (unitSeen.get(id) ?? "as reported") : unit,
    })),
    companies,
  };

  const next = JSON.stringify(dataset) + "\n";
  const prev = existsSync(OUT_PATH) ? readFileSync(OUT_PATH, "utf8") : null;
  if (prev === next) {
    console.log(`No change — src/data/noc.json already at ${latestYear}`);
    return;
  }
  writeFileSync(OUT_PATH, next);
  console.log(`Wrote src/data/noc.json (version ${latestYear}, ${companies.length} companies)`);
  console.log("Dataset changed — run `npm run anchor` to update the on-chain manifest.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
