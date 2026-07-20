# GEOM — Real assets from the far north

**The intelligence layer for real-world resources: oil, gas, minerals, rare
earths, and nuclear.**

GEOM maps the physical resource world on a 3D globe, tracks what is — and
isn't — tokenized, streams live market colour, and cryptographically signs
every dataset it publishes, anchoring each publication on Solana. Pre-Clarity
Act, GEOM is intelligence only: data, not advice, no execution.

Production: **https://gaea-gray.vercel.app** · Brand site: **https://geom.org**

## Modules

| Module | Route | What it is |
|---|---|---|
| **Physical Layer Map** | `/map` | MapLibre 3D globe (dark satellite, opt-in terrain): 110 curated assets (43 oil & gas fields, 67 mines / REE deposits / nuclear facilities), 34,936 power plants as typed icon clusters, trunk pipelines, reserve bubbles, Arctic/Greenland focus |
| **Tokenization Tracker** | `/tracker` | Library-style registry of tokenized resource instruments (45 entries, 11 folders). Headline finding: tokenized crude **and** tokenized rare earths are both $0 |
| **Terminal** | `/terminal` | Live candlestick board, 16 instruments (partner equities, tokenized RWAs, energy, minerals, benchmarks), 60 s refresh via `/api/quotes` proxy |
| **Oracle** | `/oracle` | The trust layer: SHA-256 + Ed25519 attestations over every dataset, anchored on Solana, verifiable in-browser or from anyone's machine |

## Linking from the brand site (the "Enter" button)

The brand site's Enter button should link to the app root
(`https://gaea-gray.vercel.app`, or `/map` to land on the globe). Cleanest
setup: point a subdomain like `app.geom.org` at this Vercel project (one DNS
record + `vercel domains add`), so the button never exposes a vercel.app URL.

The app is fully self-contained — no shared state or auth with the brand
site is required. If the brand site wants to *embed* data (fetch the API
cross-origin from geom.org) rather than link, CORS headers need enabling
first — ask before assuming.

**Working on this codebase?** Read `AGENTS.md` first — it lists hard
invariants (signed datasets, protocol strings, webpack-only builds,
deploy-on-push) that are easy to violate accidentally.

## For frontend integration (the API)

Base URL: `https://gaea-gray.vercel.app` (or your own deployment).
All endpoints are public JSON over HTTPS — no key, no account, CORS-open
same-origin usage; ask if you need CORS headers for another domain.

```
GET /api/datasets            # index: all dataset ids, versions, current SHA-256 digests
GET /api/datasets/:id        # the raw canonical dataset (see shapes below)
GET /api/attest/:id          # signed attestation for the dataset (Ed25519)
GET /api/quotes              # live quote board (16 symbols, cached 60s)
GET /api/quotes/:symbol      # OHLC candles for one symbol (?range=1d|5d|1mo|6mo|1y)
```

### Datasets (all signed & anchored)

| id | records | contents |
|---|---|---|
| `reserves` | 23 | proven crude reserves by country (billion bbl) |
| `fields` | 43 | major oil & gas fields, production figures, Arctic flags |
| `sites` | 67 | mines, REE deposits, uranium mines, nuclear plants — operator, figure, status |
| `plants` | 34,936 | global power plants, all fuels (WRI GPPD v1.3.0, CC-BY 4.0) |
| `pipelines` | 12 | trunk pipeline schematic routes (waypoint polylines) |
| `tokenized` | 45 | tokenized-RWA registry + watchlists |
| `market` | — | illustrative market-structure series |

Every dataset has the same shape — a `meta` block, then the records:

```json
{
  "meta": { "id": "reserves-v1", "title": "…", "unit": "…", "sources": ["…"], "version": "0.1.0" },
  "countries": [ { "iso": "VE", "name": "Venezuela", "reserves": 303, "lat": 8.5, "lng": -66, "status": "constrained", "note": "…" } ]
}
```

Note: `plants` is ~4.3 MB, above Vercel's function response limit, so
`/api/datasets/plants` returns a **307 redirect** to the byte-identical static
file `/data/plants.json` (CDN-served). Standard `fetch`/`curl -L` follow it
transparently; the attestation hash matches either way.

### Verifying an attestation (the oracle)

Datasets are canonicalized (recursively sorted keys, no whitespace), hashed
with SHA-256, and signed over `GAEA-ATTEST-V2|<dataset>|<version>|<sha256>`
with the oracle key — a standard Solana Ed25519 keypair
(`DDBT4er8HAHoHvg7xWHfqBY3sdrDhD7uZJW8SctxD9hY`). Verification is ~5 lines
with any Ed25519 library:

```js
import nacl from "tweetnacl";
import bs58 from "bs58";
const att = await (await fetch(BASE + "/api/attest/reserves")).json();
const ok = nacl.sign.detached.verify(
  new TextEncoder().encode(att.message),
  bs58.decode(att.signature),
  bs58.decode(att.signer)
);
```

The full self-contained verifier (recomputes the SHA-256 too) is on
`/oracle` under "Verify from your own machine".

Each publication window, the manifest of all digests is anchored on Solana
via a Memo transaction (`GAEA-ANCHOR-V1|<manifest sha256>`) signed by the
same oracle key: `npm run anchor` (history in `src/data/anchors.json`,
displayed with explorer links on `/oracle`). Currently devnet; mainnet
anchoring is roadmap. The protocol domain strings retain the legacy `GAEA`
prefix on purpose — existing signatures and on-chain anchors depend on those
exact bytes.

## Run it locally

```bash
npm install
npm run dev        # http://localhost:3000 (Turbopack dev is fine)
npm run build      # production build — MUST stay webpack (--webpack in the script);
                   # Turbopack production builds break maplibre-gl
npm run start
npm run anchor     # write a new Solana anchor after changing any dataset
```

Environment (see `.env.example`): `ORACLE_SIGNER_KEY` (base58 or solana-keygen
JSON array — without it a publicly-derivable dev key signs, fine for local
work only), `SOLANA_RPC_URL` / `SOLANA_CLUSTER` for anchoring, and optional
`NEXT_PUBLIC_SATELLITE_*` to swap the map's satellite tile provider (default
is NASA GIBS Blue Marble, public domain, native max zoom 8).

**If you change any file in `src/data/`**: bump its `meta.version`, run
`npm run anchor`, then rebuild — the oracle page bakes anchor state at build
time and will otherwise show "anchor stale".

## Design system

Matched to geom.org: Instrument Serif display (italic accents in glacier
blue), Space Mono data labels, expanded Archivo logotype; night `#0c1519`
surfaces, ice `#5e8ba6` / glacier `#8fb4c9`, sandstone `#c4a469`, terracotta
`#b26a4e`, carbonate `#cbc3b1`. Tokens live in `src/app/globals.css`; map
visual config in `src/lib/map-config.ts`; map icon glyphs in
`src/lib/map-icons.ts`.

## Data provenance & licensing

Curated datasets (`reserves`, `fields`, `sites`, `tokenized`, `pipelines`)
are **seed data** compiled from public sources (OPEC ASB, EIA, operator
disclosures, mining rankings, WNA) — approximate figures requiring
verification before formal publication. `plants` is republished from the
**WRI Global Power Plant Database v1.3.0 under CC-BY 4.0** (attribution
required and included). Map imagery: NASA GIBS (public domain), CARTO
basemap/labels (© OpenStreetMap contributors, © CARTO), terrain © Mapzen/AWS,
boundaries: Natural Earth (public domain). Quotes are proxied from the
unofficial Yahoo Finance chart API — delayed, indicative market colour, not a
licensed trading feed.

The oracle attests to **integrity and publication time** — that a dataset is
byte-for-byte what GEOM published, and when — not to the accuracy of
underlying third-party figures.

## Compliance posture

GEOM publishes verifiable market intelligence. It does not provide investment
advice, recommendations, or price targets, and operates no trading, issuance,
custody, or settlement functionality pre-regulatory-clarity. Nothing is
issued, deployed, or custodied through the oracle.
