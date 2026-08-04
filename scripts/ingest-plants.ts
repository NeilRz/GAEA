/**
 * GEOM plants ingest — GEM Global Integrated Power Tracker → src/data/plants.json
 * (and the byte-identical CDN copy public/data/plants.json — invariant #4).
 *
 * Replaces the retired WRI GPPD v1.3.0 (2021-era) dataset with Global Energy
 * Monitor's integrated power tracker: unit-level records for all fuels,
 * aggregated here to plant level, operating plants only. Licensed CC BY 4.0;
 * redistribution with attribution is expressly permitted, which is what makes
 * it attestable. Source is GEM's public ArcGIS feature service (Living
 * Atlas), which requires no key and no form.
 *
 * Deterministic: fixed field mapping, stable aggregation and sort, version =
 * RELEASE. Bump RELEASE when the service picks up a new GEM release, re-run,
 * then `npm run anchor`.
 *
 * Usage: npm run ingest:plants
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_PATHS = [
  join(ROOT, "src", "data", "plants.json"),
  join(ROOT, "public", "data", "plants.json"),
];

const SERVICE =
  "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/Global_Integrated_Power_v1/FeatureServer/0/query";

/** GEM release the service currently carries (service lastEditDate 2026-02-18). */
const RELEASE = "2026-02";

const PAGE = 2000;

/** Utility-scale floor: keeps the fleet comparable to the retired GPPD cut
 *  and the client download reasonable (GIPT otherwise counts every small
 *  solar phase). */
const MIN_MW = 10;

/** Map GIPT Type (+ Fuel detail for oil/gas) onto the GPPD fuel vocabulary
 *  the map's cluster buckets already understand (see ReserveMap FUEL_GROUP). */
function fuelOf(type: string, fuelDetail: string): string {
  switch (type) {
    case "coal": return "Coal";
    case "hydropower": return "Hydro";
    case "solar": return "Solar";
    case "wind": return "Wind";
    case "nuclear": return "Nuclear";
    case "geothermal": return "Geothermal";
    case "bioenergy": return "Biomass";
    case "oil/gas": {
      const f = (fuelDetail || "").toLowerCase();
      return /oil|diesel|hfo|liquid|kerosene|naphtha/.test(f) ? "Oil" : "Gas";
    }
    default: return "Other";
  }
}

interface Attrs {
  Type: string;
  Fuel: string | null;
  Country_area: string;
  Plant___Project_name: string;
  Capacity__MW_: number | null;
  Status: string;
  Latitude: number | null;
  Longitude: number | null;
}

async function fetchPage(offset: number): Promise<Attrs[]> {
  const params = new URLSearchParams({
    where: "Status = 'operating'",
    outFields: "Type,Fuel,Country_area,Plant___Project_name,Capacity__MW_,Status,Latitude,Longitude",
    returnGeometry: "false",
    orderByFields: "OBJECTID",
    resultOffset: String(offset),
    resultRecordCount: String(PAGE),
    f: "json",
  });
  const res = await fetch(`${SERVICE}?${params}`);
  if (!res.ok) throw new Error(`GIPT query ${res.status} at offset ${offset}`);
  const body = (await res.json()) as { features?: Array<{ attributes: Attrs }>; error?: { message?: string } };
  if (body.error) throw new Error(`GIPT query error at offset ${offset}: ${body.error.message}`);
  return (body.features ?? []).map((f) => f.attributes);
}

async function main() {
  const units: Attrs[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const page = await fetchPage(offset);
    units.push(...page);
    process.stdout.write(`\rfetched ${units.length} operating units…`);
    if (page.length < PAGE) break;
  }
  console.log("");

  // Aggregate units to plant level: sum capacity, dominant fuel by MW,
  // first valid coordinates.
  interface Agg {
    name: string;
    country: string;
    mw: number;
    fuelMw: Map<string, number>;
    lat?: number;
    lng?: number;
  }
  const plantsByKey = new Map<string, Agg>();
  let skippedNoName = 0;
  for (const u of units) {
    const name = (u.Plant___Project_name || "").trim();
    const country = (u.Country_area || "").trim();
    if (!name || !country) { skippedNoName++; continue; }
    const key = `${name}|${country}`;
    let a = plantsByKey.get(key);
    if (!a) {
      a = { name, country, mw: 0, fuelMw: new Map() };
      plantsByKey.set(key, a);
    }
    const mw = Number(u.Capacity__MW_);
    const fuel = fuelOf(u.Type, u.Fuel ?? "");
    if (Number.isFinite(mw) && mw > 0) {
      a.mw += mw;
      a.fuelMw.set(fuel, (a.fuelMw.get(fuel) ?? 0) + mw);
    } else {
      a.fuelMw.set(fuel, a.fuelMw.get(fuel) ?? 0);
    }
    if (a.lat === undefined && Number.isFinite(Number(u.Latitude)) && Number.isFinite(Number(u.Longitude))) {
      a.lat = Math.round(Number(u.Latitude) * 1e4) / 1e4;
      a.lng = Math.round(Number(u.Longitude) * 1e4) / 1e4;
    }
  }

  const plants = [...plantsByKey.values()]
    .filter((a) => a.lat !== undefined && a.lng !== undefined && a.mw >= MIN_MW)
    .map((a) => {
      const fuel = [...a.fuelMw.entries()].sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1))[0][0];
      const id = "GEM" + createHash("sha256").update(`${a.name}|${a.country}`).digest("hex").slice(0, 10);
      return {
        id,
        name: a.name,
        country: a.country,
        fuel,
        mw: Math.round(a.mw * 10) / 10,
        lat: a.lat!,
        lng: a.lng!,
      };
    })
    .sort((x, y) => (x.country < y.country ? -1 : x.country > y.country ? 1 : x.name < y.name ? -1 : x.name > y.name ? 1 : 0));

  console.log(`aggregated ${plants.length} operating plants (${skippedNoName} unnamed units skipped)`);
  const byFuel = new Map<string, number>();
  for (const p of plants) byFuel.set(p.fuel, (byFuel.get(p.fuel) ?? 0) + 1);
  console.log([...byFuel.entries()].sort((a, b) => b[1] - a[1]).map(([f, n]) => `${f}:${n}`).join("  "));

  const dataset = {
    meta: {
      id: "plants-v2",
      title: "Global power plants (all fuels)",
      unit: "MW installed capacity, operating plants ≥ 10 MW",
      note:
        "Aggregated to plant level from unit-level records in Global Energy Monitor's Global Integrated Power Tracker, republished under CC BY 4.0 via GEM's public feature service. GEOM attests to the integrity and publication time of this copy, not to the accuracy of the underlying source.",
      sources: [
        "Global Energy Monitor, Global Integrated Power Tracker (via GEM/Living Atlas feature service)",
      ],
      license: "CC BY 4.0",
      version: RELEASE,
    },
    plants,
  };

  const next = JSON.stringify(dataset, null, 2) + "\n";
  const prev = existsSync(OUT_PATHS[0]) ? readFileSync(OUT_PATHS[0], "utf8") : null;
  if (prev === next) {
    console.log(`No change — plants.json already at ${RELEASE}`);
    return;
  }
  for (const p of OUT_PATHS) writeFileSync(p, next);
  console.log(`Wrote ${OUT_PATHS.length} copies of plants.json  (version ${RELEASE}, ${plants.length} plants, ${(next.length / 1e6).toFixed(1)} MB)`);
  console.log("Dataset changed — run `npm run anchor` to update the on-chain manifest.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
