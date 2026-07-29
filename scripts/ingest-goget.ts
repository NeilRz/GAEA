/**
 * GEOM ingest — GEM Global Oil & Gas Extraction Tracker (GOGET)
 * → src/data/goget.json
 *
 * Asset-level oil & gas extraction projects (fields and discoveries)
 * worldwide, from Global Energy Monitor's public tracker dataset (the
 * exact CSV that powers GEM's own tracker map). Licensed CC BY 4.0;
 * redistribution with attribution is expressly permitted, which is what
 * makes it attestable here.
 *
 * Deterministic: fixed field mapping, stable sort, version = RELEASE.
 * Bump RELEASE when GEM publishes a new tracker release, re-run, then
 * `npm run anchor`.
 *
 * Usage: npm run ingest:goget
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseCsv, columns } from "./csv";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_PATH = join(ROOT, "src", "data", "goget.json");

const SOURCE_URL =
  "https://greeninfo-network.github.io/global-oil-gas-extraction-tracker/data/data.csv";

/** GEM tracker release this ingest corresponds to (see tracker page). */
const RELEASE = "2026-03";

interface Asset {
  project: string;
  country: string;
  status: string;
  fuel: string;
  type: string;
  discoveryYear?: string;
  startYear?: string;
  operator?: string;
  parent?: string;
  lat?: number;
  lng?: number;
  wiki?: string;
}

async function main() {
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`GOGET fetch failed: ${res.status}`);
  const rows = parseCsv(await res.text());
  const col = columns(rows[0]);

  const assets: Asset[] = rows.slice(1).map((r) => {
    const num = (v: string) => {
      const n = Number(v);
      return v !== "" && Number.isFinite(n) ? n : undefined;
    };
    const str = (v: string) => (v.trim() === "" ? undefined : v.trim());
    return {
      project: col(r, "project").trim(),
      country: col(r, "country").trim(),
      status: col(r, "status").trim(),
      fuel: col(r, "fuel_type").trim(),
      type: col(r, "unit_type").trim(),
      discoveryYear: str(col(r, "discovery_year")),
      startYear: str(col(r, "start_year")),
      operator: str(col(r, "operator")),
      parent: str(col(r, "parent")),
      lat: num(col(r, "lat")),
      lng: num(col(r, "lng")),
      wiki: str(col(r, "url")),
    };
  });

  assets.sort((a, b) =>
    a.country === b.country
      ? a.project < b.project
        ? -1
        : 1
      : a.country < b.country
        ? -1
        : 1
  );

  const statuses = new Map<string, number>();
  for (const a of assets) statuses.set(a.status, (statuses.get(a.status) ?? 0) + 1);
  console.log(
    `${assets.length} assets — ` +
      [...statuses.entries()].map(([s, n]) => `${s}: ${n}`).join(", ")
  );

  const dataset = {
    meta: {
      id: "goget",
      title: "Global oil & gas extraction assets (GEM GOGET)",
      description:
        "Asset-level inventory of oil and gas extraction projects worldwide: fields and discoveries with country, development status, hydrocarbon type, operator, parent ownership and coordinates. Compiled by Global Energy Monitor's Global Oil and Gas Extraction Tracker and republished here byte-exact under GEOM attestation.",
      unit: "assets",
      sources: [
        `Global Oil and Gas Extraction Tracker, Global Energy Monitor, ${RELEASE} release (globalenergymonitor.org)`,
      ],
      license: "CC BY 4.0 (Global Energy Monitor)",
      cadence: "tracker releases, roughly twice yearly",
      version: RELEASE,
    },
    assets,
  };

  const next = JSON.stringify(dataset, null, 2) + "\n";
  const prev = existsSync(OUT_PATH) ? readFileSync(OUT_PATH, "utf8") : null;
  if (prev === next) {
    console.log(`No change — src/data/goget.json already at ${RELEASE}`);
    return;
  }
  writeFileSync(OUT_PATH, next);
  console.log(`Wrote src/data/goget.json (version ${RELEASE}, ${assets.length} assets)`);
  console.log("Dataset changed — run `npm run anchor` to update the on-chain manifest.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
