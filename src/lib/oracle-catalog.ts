import { DATASETS, datasetHashes } from "@/lib/attest";
import eia from "@/data/eia.json";

/**
 * Presentation metadata for the oracle explorer. The signed datasets stay
 * untouched; this module only shapes what the catalog and detail pages show.
 */

interface DatasetMetaBlock {
  id: string;
  title: string;
  unit?: string;
  note?: string;
  description?: string;
  cadence?: string;
  sources?: string[];
  license?: string;
  version: string;
}

interface EiaSeries {
  id: string;
  unit: string;
  points: Array<{ period: string; value: number }>;
}

const count = (id: string, key: string): number =>
  ((DATASETS[id].data as Record<string, unknown>)[key] as unknown[]).length;

const DISPLAY: Record<
  string,
  { category: string; recordsKey: string | null; recordsNoun: string; schedule?: string }
> = {
  reserves: { category: "Crude reserves", recordsKey: "countries", recordsNoun: "countries" },
  fields: { category: "Upstream assets", recordsKey: "fields", recordsNoun: "fields" },
  tokenized: { category: "RWA registry", recordsKey: "assets", recordsNoun: "assets" },
  market: { category: "Market structure", recordsKey: null, recordsNoun: "sample series" },
  sites: { category: "Minerals & nuclear", recordsKey: "sites", recordsNoun: "sites" },
  plants: { category: "Power infrastructure", recordsKey: "plants", recordsNoun: "plants" },
  pipelines: { category: "Midstream", recordsKey: "pipelines", recordsNoun: "pipelines" },
  eia: {
    category: "Weekly fundamentals",
    recordsKey: null,
    recordsNoun: "series",
    schedule: "WPSR release Wednesdays ~10:30 ET · ingested Wed 21:30 UTC (Fri catch-up)",
  },
};

const SERIES_LABELS: Record<string, string> = {
  crude_stocks: "Commercial crude stocks",
  spr_stocks: "Strategic Petroleum Reserve",
  crude_production: "Field production",
  refiner_inputs: "Refiner net inputs",
  refinery_utilization: "Refinery utilization",
  crude_imports: "Crude imports",
  gasoline_stocks: "Gasoline stocks",
  distillate_stocks: "Distillate stocks",
};

function metaOf(id: string): DatasetMetaBlock {
  return (DATASETS[id].data as { meta: DatasetMetaBlock }).meta;
}

function recordsLabel(id: string): string {
  const d = DISPLAY[id];
  if (id === "eia") {
    const s = (eia as { series: EiaSeries[] }).series;
    return `${s.length} series · ${s[0]?.points.length ?? 0} weeks`;
  }
  if (id === "market") return "3 sample series";
  if (!d.recordsKey) return "—";
  return `${count(id, d.recordsKey).toLocaleString("en-US")} ${d.recordsNoun}`;
}

export interface CatalogRow {
  id: string;
  title: string;
  category: string;
  records: string;
  version: string;
  updated: string;
  timeseries: boolean;
  spark: number[] | null;
}

export function catalogRows(): CatalogRow[] {
  return datasetHashes().map(({ id, title, version }) => {
    const timeseries = id === "eia";
    let spark: number[] | null = null;
    if (timeseries) {
      const crude = (eia as { series: EiaSeries[] }).series.find(
        (s) => s.id === "crude_stocks"
      );
      spark = crude ? crude.points.slice(-52).map((p) => p.value) : null;
    }
    return {
      id,
      title,
      category: DISPLAY[id]?.category ?? "Dataset",
      records: recordsLabel(id),
      version,
      updated: timeseries ? `week of ${version}` : `registry v${version}`,
      timeseries,
      spark,
    };
  });
}

export interface DatasetDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  cadence: string;
  schedule: string | null;
  sources: string[];
  license: string | null;
  unit: string | null;
  version: string;
  records: string;
  sha256: string;
  timeseries: boolean;
  series: Array<{
    id: string;
    label: string;
    unit: string;
    points: Array<{ time: string; value: number }>;
  }> | null;
}

export function datasetIds(): string[] {
  return Object.keys(DATASETS);
}

export function datasetDetail(id: string): DatasetDetail | null {
  if (!DATASETS[id]) return null;
  const meta = metaOf(id);
  const hash = datasetHashes().find((h) => h.id === id)!;
  const timeseries = id === "eia";
  return {
    id,
    title: DATASETS[id].title,
    description: meta.description ?? meta.note ?? "",
    category: DISPLAY[id]?.category ?? "Dataset",
    cadence: meta.cadence ?? "static registry · updated on revision",
    schedule: DISPLAY[id]?.schedule ?? null,
    sources: meta.sources ?? [],
    license: meta.license ?? null,
    unit: meta.unit ?? null,
    version: hash.version,
    records: recordsLabel(id),
    sha256: hash.sha256,
    timeseries,
    series: timeseries
      ? (eia as { series: EiaSeries[] }).series.map((s) => ({
          id: s.id,
          label: SERIES_LABELS[s.id] ?? s.id,
          unit: s.unit,
          points: s.points.map((p) => ({ time: p.period, value: p.value })),
        }))
      : null,
  };
}
