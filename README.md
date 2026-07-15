# GAEA° — Greenland Arctic Energy Association

**The intelligence layer for digital oil capital markets.**

GAEA maps the world's oil, tracks what is — and isn't — tokenized, publishes
agentic research with a tamper-evident audit trail, and cryptographically signs
every dataset it ships. Pre-Clarity Act, GAEA is intelligence only: data, not
advice, no execution. The same attestation rails are designed to become
settlement infrastructure when digital commodity rules are final.

## Modules (V1)

| Module | Route | Status |
|---|---|---|
| **Reserve Map** — interactive map of proven reserves, supergiant fields, Arctic assets | `/map` | Live (seed data) |
| **Tokenization Tracker** — registry of tokenized oil/commodity RWAs + the gap chart | `/tracker` | Live (seed registry) |
| **Agentic Intel** — structured briefs + hash-attested forecast ledger | `/intel` | Format live (specimen content) |
| **Terminal** — read-only market structure: curve, cracks, inventories | `/terminal` | Sample data (feeds pending) |
| **Oracle** — signed SHA-256 attestations over every dataset, browser-verifiable | `/oracle` | Live |

## Oracle scheme

Datasets are canonicalized (recursively sorted keys), hashed with SHA-256, and
signed over `GAEA-ATTEST-V1|<dataset>|<version>|<sha256>` using EIP-191
personal-message signing. Anyone can recompute the hash from the raw dataset
and recover the signer.

```
GET /api/datasets          # dataset ids + current digests
GET /api/datasets/:id      # raw canonical dataset
GET /api/attest/:id        # signed attestation
```

Set `ORACLE_SIGNER_KEY` (hex private key) in the environment for a real signer.
Without it a **dev key derived from a public string** is used — fine for local
demos, meaningless for production.

## Run it

```bash
npm install
npm run dev     # http://localhost:3000
```

## Data provenance

All V1 datasets under `src/data/` are **seed data**: reserves and field figures
are approximate compilations from public OPEC ASB / EIA material, the
tokenization registry is compiled from public issuer documentation, and all
terminal series are clearly-labeled illustrative samples. Everything requires
verification against primary sources before external publication.

## Roadmap

- Live market data feeds (EIA API, exchange/vendor curves) into the Terminal
- AIS tanker-flow layer and Northern Sea Route transit tracking on the map
- Agent pipeline (Claude API) generating scheduled briefs against live feeds
- On-chain anchoring of attestation digests; attestation history
- GAEA index family (Digital Oil Index, Arctic Energy Index)
- Well-level & royalty analytics (Texas RRC / ND DMR public data)

## Compliance posture

GAEA publishes verifiable market intelligence. It does not provide investment
advice, recommendations, or price targets, and operates no trading or
settlement functionality pre-regulatory-clarity.
