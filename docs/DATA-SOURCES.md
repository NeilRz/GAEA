# GEOM data sourcing roadmap

Status of the data layer and the acquisition pipeline behind it. The free,
redistributable tier is live and attested; this file tracks what comes next.
Companion to the "Source databases" provenance table on `/app?m=overview`
and the dataset table in `README.md`.

## Tier 0 — live today (free, redistribution-safe, attested)

| upstream | dataset id | why it's here |
|---|---|---|
| GEM Global Oil & Gas Extraction Tracker | `goget` | asset-level upstream inventory, CC BY 4.0 |
| GEM Global Oil Infrastructure Tracker | `goit` | routed oil/NGL pipelines, CC BY 4.0 |
| JODI-Oil World Database | `jodi` | monthly country crude balances |
| NRGI National Oil Company Database | `noc` | NOC financials and fiscal transfers |
| USGS Mineral Commodity Summaries | `minerals` | world minerals production + reserves, public domain |
| Ember yearly electricity data | `electricity` | generation by fuel, CC BY 4.0 |
| WRI Global Power Plant Database | `plants` | 34,936 plants, CC BY 4.0 |
| U.S. EIA WPSR | `eia` | weekly U.S. petroleum fundamentals, public domain |

## Tier 1 — free, worth ingesting next

- **BGS World Mineral Statistics** (British Geological Survey): long-run
  minerals production/trade time series; free download, complements USGS
  with deeper history.
- **GEM full tracker releases** (Excel behind a name/email form): adds
  production, reserves and discovery volumes missing from the map CSVs we
  ingest today. Same CC BY 4.0 license.
- **UN Comtrade**: commodity trade flows (ores, concentrates, crude, refined
  products) by country pair; free API with rate limits.
- **Eurostat / ENTSO-E**: European energy balances and power system data.
- **NASA/NOAA environmental layers** for the map (flaring detection via
  VIIRS Nightfire is public and would be a striking oracle dataset).

## Tier 2 — request access / permission (free or negotiated)

- **GOGEL (urgewald)**: the Global Oil & Gas Exit List — 1,800 companies
  with expansion plans. Public to browse, but redistribution under GEOM
  attestation needs urgewald's written permission. Framing note: it is an
  advocacy product; treat as intelligence input, not a neutral registry.
- **JODI secretariat**: confirm "data redistribution agency" status so the
  attested `jodi` mirror is formally blessed.
- **IAEA PRIS**: reactor-level nuclear data; no bulk export today — worth a
  written request for a feed.
- **OPEC**: the Annual Statistical Bulletin tables are free; ask about
  redistribution of the machine-readable series.

## Tier 3 — commercial databases (buy when the budget exists)

Ranked by what they unlock for GEOM, with the module they feed. All are
quote-based enterprise licenses unless noted; none permit public
redistribution, so they power *internal* intelligence and derived analytics,
never attested public datasets.

### Price assessments (the terminal's missing spine)
1. **S&P Global Commodity Insights (Platts)** — Dated Brent, WTI, JKM and
   product assessments. The reference prices the industry settles on;
   licensing them is the difference between "indicative" and "quotable".
2. **Argus Media** — crude/products alternative to Platts plus strong
   rare-earth and minor-metals assessments (directly on-thesis for REE).
3. **Fastmarkets** — lithium, cobalt, nickel, battery-materials price
   assessments; the benchmark for battery supply-chain pricing.
4. **Benchmark Mineral Intelligence** — lithium-ion supply chain: mine to
   cathode capacity, contracts, prices. Critical-minerals depth beyond USGS.

### Upstream asset intelligence (map + oracle depth)
5. **Rystad Energy UCube** — field-by-field production, economics, and
   forecasts for every upstream asset globally. The analytical standard.
6. **Wood Mackenzie Lens Upstream** — asset valuations, cost curves,
   company benchmarking; strongest on commercial asset detail.
7. **GlobalData Oil & Gas** — field production histories and capex across
   140+ countries; cheaper than Rystad/WoodMac for breadth.
8. **Enverus** — U.S. well-level data: permits, rigs, completions,
   production by well. The shale ground truth.
9. **WellDatabase** — lower-cost U.S. well data alternative to Enverus.
10. **Industrial Info Resources (IIR)** — project-level tracking of
    gathering systems, NGL plants, LNG liquefaction; strong on capex
    pipelines and outages.

### Flows and logistics (a future "physical flows" module)
11. **Kpler** — satellite + AIS cargo tracking: crude/LNG/products flows by
    vessel, port, and country. Would let GEOM show physical trade live.
12. **Vortexa** — alternative flows analytics, strong freight coverage.

### Metals & mining depth
13. **S&P Capital IQ Pro (SNL Metals & Mining)** — mine-level production,
    reserves, costs, ownership across all metals.
14. **CRU** — metals cost curves and market outlooks.

### Macro & official statistics
15. **IEA data services** — World Energy Balances, Monthly Oil Data
    Service; authoritative but strictly licensed (no redistribution).

## Rules that govern every acquisition

1. Public attested datasets come only from sources whose license permits
   byte-exact redistribution (public domain, CC BY, or written permission).
2. Commercial data may inform derived analytics and internal tooling but
   never ships through `/api/datasets` or the anchor manifest.
3. Every ingested source gets: an `ingest-*.ts` script, `meta.sources` +
   `meta.license` attribution, a row in the provenance table, and an anchor
   refresh (`npm run anchor`).
