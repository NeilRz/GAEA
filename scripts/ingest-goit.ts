/**
 * GEOM ingest — GEM Global Oil Infrastructure Tracker (GOIT)
 * → src/data/goit.json
 *
 * Global oil and NGL pipeline inventory with route geometry, ownership,
 * status and capacity, from Global Energy Monitor's public tracker
 * dataset (the CSV behind GEM's own tracker map). Licensed CC BY 4.0.
 *
 * Deterministic: fixed field mapping, stable sort, version = RELEASE.
 *
 * Usage: npm run ingest:goit
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseCsv, columns } from "./csv";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_PATH = join(ROOT, "src", "data", "goit.json");

const SOURCE_URL =
  "https://greeninfo-network.github.io/global-oil-infrastructure-tracker/static/data/data.csv";

/** GEM tracker release this ingest corresponds to (see tracker page). */
const RELEASE = "2026-02";

interface Pipeline {
  project: string;
  unit?: string;
  type: string;
  parent?: string;
  countries: string;
  status: string;
  startYear?: string;
  /** Capacity as published by the tracker (barrels per day where stated). */
  capacity?: number;
  /** lat,lng waypoint chain "lat,lng:lat,lng:…" as published. */
  route?: string;
  wiki?: string;
}

async function main() {
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`GOIT fetch failed: ${res.status}`);
  const rows = parseCsv(await res.text());
  const col = columns(rows[0]);

  const pipelines: Pipeline[] = rows.slice(1).map((r) => {
    const str = (v: string) => (v.trim() === "" ? undefined : v.trim());
    const capRaw = col(r, "capacity").trim();
    const cap = Number(capRaw);
    return {
      project: col(r, "project").trim(),
      unit: str(col(r, "unit")),
      type: col(r, "type").trim(),
      parent: str(col(r, "parent")),
      countries: col(r, "countries").trim(),
      status: col(r, "status").trim(),
      startYear: str(col(r, "start_year")),
      capacity: capRaw !== "" && Number.isFinite(cap) ? cap : undefined,
      route: str(col(r, "route")),
      wiki: str(col(r, "url")),
    };
  });

  pipelines.sort((a, b) =>
    a.project === b.project
      ? (a.unit ?? "") < (b.unit ?? "")
        ? -1
        : 1
      : a.project < b.project
        ? -1
        : 1
  );

  const types = new Map<string, number>();
  for (const p of pipelines) types.set(p.type, (types.get(p.type) ?? 0) + 1);
  console.log(
    `${pipelines.length} pipeline units — ` +
      [...types.entries()].map(([t, n]) => `${t}: ${n}`).join(", ")
  );

  const dataset = {
    meta: {
      id: "goit",
      title: "Global oil & NGL pipelines (GEM GOIT)",
      description:
        "Global inventory of crude oil and NGL pipelines: project, ownership, status, capacity and full route waypoints. Compiled by Global Energy Monitor's Global Oil Infrastructure Tracker and republished here byte-exact under GEOM attestation.",
      unit: "pipeline units",
      sources: [
        `Global Oil Infrastructure Tracker, Global Energy Monitor, ${RELEASE} release (globalenergymonitor.org)`,
      ],
      license: "CC BY 4.0 (Global Energy Monitor)",
      cadence: "tracker releases, roughly twice yearly",
      version: RELEASE,
    },
    pipelines,
  };

  const next = JSON.stringify(dataset, null, 2) + "\n";
  const prev = existsSync(OUT_PATH) ? readFileSync(OUT_PATH, "utf8") : null;
  if (prev === next) {
    console.log(`No change — src/data/goit.json already at ${RELEASE}`);
    return;
  }
  writeFileSync(OUT_PATH, next);
  console.log(`Wrote src/data/goit.json (version ${RELEASE}, ${pipelines.length} units)`);
  console.log("Dataset changed — run `npm run anchor` to update the on-chain manifest.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
