<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# GEOM app — guide for agents & collaborators

This repo now hosts **both the GEOM brand site and the GEOM application**. The
marketing landing is the homepage (`/`); the application (map, tracker,
terminal, oracle) sits behind the "Enter" button, which targets `/overview`.
Production: https://gaea-gray.vercel.app, deployed on Vercel; the geom.org
brand domain is being pointed at this project.

Read `README.md` for the product/API overview. This file is the working
contract: stack facts, hard invariants, and gotchas that have already cost
debugging time.

## Stack

- Next.js 16.2.10, App Router (see the block above — check
  `node_modules/next/dist/docs/` before writing framework code).
- React 19 · TypeScript · maplibre-gl 5.24 · Tailwind v4 (imported, but most
  styling is hand-rolled CSS custom properties in `src/app/globals.css`).
- No component library, no CSS-in-JS, charts via recharts only. Keep it that
  way unless explicitly asked.

## Commands

```bash
npm run dev      # Turbopack dev server — fine for development
npm run build    # next build --webpack — the flag is LOAD-BEARING (see below)
npm run lint
npm run anchor   # writes a new Solana anchor after dataset changes
```

## Hard invariants — do not violate

1. **`src/data/*.json` are cryptographically signed datasets.** The oracle
   (`/oracle`, `src/lib/attest.ts`) hashes and signs their exact bytes, and
   the digest manifest is anchored on Solana. Any content change requires:
   bump that file's `meta.version` → `npm run anchor` → rebuild. Otherwise
   the live oracle shows "anchor stale".
2. **Never edit `src/data/anchors.json` by hand.** It is append-only history
   written by `scripts/anchor.ts`; each entry corresponds to a real on-chain
   transaction.
3. **Never change the protocol strings** `GAEA-ATTEST-V2` and
   `GAEA-ANCHOR-V1` (in `src/lib/attest.ts`). Existing signatures and
   on-chain anchors depend on those exact bytes. The legacy GAEA prefix is
   intentional — do not "fix" it to GEOM.
4. **`src/data/plants.json` and `public/data/plants.json` must stay
   byte-identical.** The first is the signed source of truth; the second is
   the CDN copy that `/api/datasets/plants` 307-redirects to (Vercel caps
   function responses at ~4.5 MB). Regenerate both together or neither.
5. **`npm run build` must stay on webpack.** Turbopack production builds
   break maplibre-gl silently (map inits, tiles never draw, zero errors).
   Turbopack *dev* is fine.
6. **Never commit secrets.** `ORACLE_SIGNER_KEY` lives in `.env.local` /
   Vercel env only. Without it the app signs with a publicly-derivable dev
   key (fine locally, meaningless in production). `.keys/` is gitignored.
7. **Pushing to `main` deploys production** (Vercel git integration). Use a
   branch + PR for anything you wouldn't demo live.

## Compliance copy rules

GEOM is intelligence-only, pre-Clarity-Act, and counsel watches the wording:

- Never add investment advice, recommendations, or price targets to UI copy.
- Keep the "informational only — not investment advice" footers intact.
- The oracle is a **data attestation layer**: it attests to integrity and
  publication time, not accuracy. Never describe it as issuing, custodying,
  trading, or settling anything.

## Design system (matched to geom.org)

Tokens live in `src/app/globals.css`. Night `#0c1519` surfaces; ice
`#5e8ba6` / glacier `#8fb4c9` accents; mineral warms (sandstone `#c4a469`,
terracotta `#b26a4e`, carbonate `#cbc3b1`). Type: Instrument Serif for
display (italic accents in glacier), Space Mono for data labels, expanded
Archivo for the logotype, system sans body.

Gotcha: the `--font-*` stacks are declared on `body`, **not** `:root` —
next/font attaches its variables to `<body>`, and a `var()` referencing them
from `:root` silently invalidates the whole `font-family`.

## Marketing site (landing + corporate pages)

The public brand pages were ported verbatim from the signed-off static
geom.org site and kept pixel-identical, so they render as raw HTML, not
idiomatic React. Treat them as one self-contained unit.

- **Routes.** `/` is the landing (`src/components/geom/GeomLanding.tsx`, a
  client component). `/news`, `/investors`, `/terms`, `/privacy` are static
  corporate pages. Neil's original overview is preserved at `/overview`, which
  is where "Enter" lands.
- **How they render.** Each page injects an exact HTML string
  (`src/components/geom/landingHtml.ts`, `corpHtml.ts`) via
  `dangerouslySetInnerHTML` inside a scoped wrapper. The landing's original
  vanilla scripts (pump scroll-scrub, hero video fade-loop, scroll reveals,
  nav-on-scroll) run as one cleaned-up effect in GeomLanding. To change landing
  copy, edit the source and re-port, or edit the JSON-encoded string in
  `landingHtml.ts`.
- **CSS is wrapper-scoped.** `geom-site.css` is scoped under `.geom-site`,
  `geom-corp.css` under `.geom-corp`. These fragments reuse generic class
  names, so the scoping is what stops them leaking onto the app, and the app
  globals leaking onto them. Ten class names collided with the globals and were
  renamed with `gs-`/`gc-` prefixes (hero, eyebrow, grid, lede, mono, n, k, v,
  nav, brand, on). Do not un-prefix them or add unscoped rules for these
  fragments.
- **Gotcha: `overflow-x: clip`, not `hidden`.** `.geom-site` uses
  `overflow-x: clip`. `hidden` turns the wrapper into a scroll container and
  silently breaks the pump's `position: sticky` (its stationary scroll-scrub).
- **Chrome.** `Nav` and `SiteFooter` return `null` on the marketing routes;
  the app top bar and footer only appear on the app routes. The marketing pages
  carry their own header and footer.
- **Assets** live in `public/`: `seq/` (120-frame WebP pump sequence),
  `fonts/`, `img/` (hero + chapter posters), `partners/`, and the hero and
  chapter background videos as both `.mp4` and `.webm` (VP9).
- **No em-dashes in any brand-facing copy** (titles, meta, page text). It is a
  hard brand rule on the marketing side; the app footer and app page titles
  still use them and have not been swept.

## Map gotchas (src/components/ReserveMap.tsx)

- GeoJSON source URLs in the style must be **absolute**
  (`window.location.origin + path`) — a bare path throws Invalid URL and
  silently kills every source in the style.
- `line-dasharray` is **not data-driven** in MapLibre — a data expression
  there aborts layer setup; use separate filtered layers.
- MapLibre 5 parses its style behind `requestAnimationFrame`: in a **hidden
  browser window/tab the map never loads** (no errors, no requests). When
  testing headlessly, check `document.visibilityState`; if hidden, patch
  `requestAnimationFrame` to `setTimeout(cb, 16)` and remount. Debug handles:
  `window.__geomMap`, `window.__geomMapErrors`.
- Satellite imagery (NASA GIBS) has native max zoom 8 and crossfades into the
  dark basemap beyond it — by design. Terrain is opt-in via the panel toggle.
- Map visual config: `src/lib/map-config.ts`. Icon glyphs:
  `src/lib/map-icons.ts` (canvas-drawn, colors baked per category).

## Repo map

```
src/app/            marketing: / (landing), /overview, /news, /investors,
                    /terms, /privacy · app: /map, /tracker, /terminal, /oracle
src/app/api/        datasets, attest, quotes route handlers
src/app/*.css       globals.css (app) + geom-site.css / geom-corp.css (scoped
                    marketing styles)
src/components/geom/ GeomLanding + landingHtml.ts / corpHtml.ts (ported brand site)
src/components/     ReserveMap (globe), TrackerLibrary, MarketBoard,
                    CandleChart, AttestPanel, OracleQuickstart, Nav,
                    SiteFooter, charts
src/lib/            attest.ts (oracle core), map-config, map-icons,
                    tracker-folders, quotes/board/format (terminal)
src/data/           SIGNED datasets (see invariants) + anchors.json history
public/data/        CDN copies: plants.json (signed twin), boundaries.geojson
public/             seq/ (pump frames), fonts/, img/, partners/, brand videos
scripts/anchor.ts   Solana Memo anchoring (npm run anchor)
```

## Local project memory (repo owner's machine only)

`vault/` is a personal Obsidian vault used as cross-session memory on the
owner's machine. It is intentionally **not in git** — if it doesn't exist in
your checkout, skip this section. If it does exist: read `vault/HOME.md` and
the latest `vault/sessions/` note at session start, record decisions in
`vault/decisions/`, and write a session note before finishing.
