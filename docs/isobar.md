# Isobar — the forecast attestation layer

Isobar is GEOM's fifth module: an AI forecasting agent for physical oil
fundamentals, wrapped in a protocol that makes every forecast **provably
timestamped, publicly scored, and settled against a dataset GEOM already
signs and anchors on Solana**.

It is not a trading signal service and it does not forecast prices. That
distinction is a hard product boundary, enforced in code, not just in copy.

---

## 1. Why this and not "an AI oil trading bot"

Every "AI predicts oil" product on the internet has the same two problems,
and neither is a modelling problem:

1. **You cannot check whether the forecast was made before the outcome.**
   Track records are screenshots. Anyone can delete the bad calls, and
   everyone does. There is no way to distinguish a good forecaster from a
   good editor.
2. **You cannot check what the model was fed.** "Trained on proprietary
   data" is unfalsifiable. If the inputs are not pinned, the output is not
   reproducible, and a backtest is just a story.

GEOM is one of very few places where both problems are already solved as a
side effect of infrastructure that exists:

- `src/lib/attest.ts` hashes each dataset's canonical bytes, signs the digest
  with an Ed25519 key, and `scripts/anchor.ts` writes the manifest hash to
  Solana via the Memo program. That gives an **immutable publication clock**.
- `eia.json` is ingested automatically every week by
  `.github/workflows/eia-ingest.yml` from the EIA Weekly Petroleum Status
  Report, then re-signed and re-anchored. That gives a **settlement source
  that is already attested** and that nobody at GEOM can quietly revise.

So: commit the forecast hash on-chain before the release, cite the input
datasets by digest, and resolve against the signed dataset when it prints.
The result is a forecasting track record that is expensive to fake and cheap
to verify — which is exactly the shape of everything else GEOM sells.

**The one-line pitch:** the oracle already proves what GEOM published and
when. Isobar points the same machinery at what GEOM *predicted* and when.

---

## 2. Scope boundary (compliance)

GEOM is intelligence-only and pre-Clarity-Act. Isobar forecasts **physical
fundamentals only**:

| Forecastable | Not forecastable, ever |
|---|---|
| Crude stocks (commercial, SPR) | Any price, spot or forward |
| Field production | Any spread, crack, or basis |
| Refiner inputs, refinery utilization | Any equity or token valuation |
| Crude imports | Any buy/sell/hold direction |
| Gasoline and distillate stocks | Any price target or range |

`src/lib/isobar.ts` exports `FORECASTABLE_SERIES` as an allowlist and
`assertForecastable()`, which throws on anything else. The submission API
rejects out-of-scope series with `422 out_of_scope` rather than silently
dropping them. A forecast of "crude stocks draw 2.1 MMbbl next Wednesday" is
a data forecast about a government statistic. It is not advice, not a
recommendation, and not a price target, and the code keeps it that way.

The agent also never emits a directional statement. Its rationale field
describes which fundamentals moved and why it weighted them; it does not say
what anyone should do about it.

---

## 3. Protocol

### 3.1 Round

One round targets one EIA WPSR release week.

```
open ──► sealed ──► resolved
```

| Phase | What happens |
|---|---|
| **open** | Anyone may commit. A commit is `sha256(canonical({points, rationale, inputs, salt}))` plus a stake. The forecast body stays private. |
| **sealed** | Commit window closes ~24h before the release. Committed hashes are collected into a round manifest, hashed, and anchored on Solana. **After this point no forecast can be added, altered, or withdrawn.** Reveal window opens. |
| **resolved** | EIA prints. `npm run ingest:eia` writes the new `eia.json`, its version bumps, `npm run anchor` re-anchors. Isobar reads the actual value out of the signed dataset, verifies each reveal against its commit hash, scores, and settles. |

The commitment is what carries the weight. The anchor transaction is a
Solana slot number: a forecast committed at slot *N* is checkable against a
release published later, by anyone, forever, without trusting GEOM.

### 3.2 Resolution source

Resolution reads `eia.json → series[id] → points[period == targetPeriod]`.
The round records the dataset version and SHA-256 it resolved against, so a
verifier can pull `/api/datasets/eia`, recompute the digest, confirm it
matches the anchored manifest, and re-derive every score independently.

GEOM cannot move the goalposts: changing the resolution value would change
the dataset digest, which would break the anchor, which is visible on the
Status module as "anchor stale".

### 3.3 Scoring

Naive forecasts of weekly inventory data are surprisingly good, so the only
honest question is **whether a forecaster beats the dumb model**. Isobar
publishes three baselines alongside every forecast and scores against the
first:

| Baseline | Definition |
|---|---|
| `naive` | last published value carried forward |
| `trend4` | last value plus the mean of the trailing 4 week-over-week changes |
| `seasonal` | last value plus the same-week change one year earlier |

Errors are normalized before they are aggregated, because the series have
wildly different scales and volatilities (crude production barely moves
week to week; distillate stocks swing by millions of barrels).

```
scale(s)      = stdev of the trailing 52 week-over-week changes,
                measured strictly before the target week
z(f, a, s)    = |f − a| / scale(s)
skill         = 1 − ( Σ z_forecast / Σ z_naive )      summed across series
```

Aggregating the normalized errors **before** taking the ratio is deliberate.
Per-series skill ratios explode when the naive error happens to be near zero
— which happens constantly on crude production — and a mean of per-series
skills would let one lucky week dominate a whole round. Summing first is the
standard MASE-style construction and it is well-behaved.

`skill > 0` means you beat carrying the last number forward. `skill = 0` is
the baseline. Negative means the dumb model beat you.

Interval calibration is tracked separately: each forecast carries an 80%
interval, and the leaderboard reports hit rate. A forecaster whose 80%
intervals contain the outcome 80% of the time is calibrated; one at 100% is
hedging with useless width, one at 40% is overconfident. Neither is punished
by the skill score, so calibration is reported on its own.

### 3.4 Settlement

Zero-sum among participants, no emissions, no treasury subsidy.

```
pool          = Σ stakes in the round (including forfeits)
weight(i)     = stake(i) × max(0, skill(i))
payout(i)     = pool × weight(i) / Σ weight
```

- Beat the naive baseline and you take a share of the pool proportional to
  both your stake and how far you beat it.
- Fail to beat it and your stake goes to those who did.
- Commit and never reveal, or reveal something that does not hash to your
  commit, and your stake is forfeited to the pool. This is what makes the
  blind commit window safe.

Because settlement is pure redistribution, **the protocol needs no token
emission to function**. That is unusual and it is the point: there is no
inflation schedule to defend and no yield to promise.

---

## 4. $IBAR

**Not deployed.** `IBAR_TOKEN.mint` is empty and `IBAR_IS_LIVE` is `false`,
mirroring how `GEOM_TOKEN` is staged in `src/lib/board.ts`. Every stake in
the shipped module is notional and labelled as such in the UI. Nothing below
describes a live instrument.

### Mechanics

| Function | Detail |
|---|---|
| **Stake to submit** | A commit requires locking $IBAR. Makes spamming a thousand forecasts to farm one lucky hit expensive instead of free. |
| **Conviction weighting** | Your stake sets your weight in the published **consensus print** — the stake-weighted median across revealed forecasts. Influence and risk are the same dial; you cannot buy weight without exposing it. |
| **Accuracy settlement** | The redistribution in §3.4. |
| **Access tier** | Holding (not spending) a threshold unlocks the API: full per-series distributions, the agent's reasoning trace, and round history in bulk. The headline consensus number and every verification endpoint stay free and public — GEOM is a publisher first. |
| **Non-transferable reputation** | Skill history binds to the forecaster identity and is anchored. Stake is buyable; track record is not. A funded new wallet starts at zero credibility, which is the anti-sybil property that matters. |

### Supply

Fixed, no inflation. Settlement is redistribution, so the system is
self-funding at any supply. Allocation, vesting, and launch venue are out of
scope for this document and are a separate decision.

### The agent stakes on the same terms

The Isobar agent commits from a treasury position, appears on the same
leaderboard, is scored by the same metric, and can lose. There is no
special-casing in the settlement path. This is the entire credibility
argument: every other "AI signal" product asks you to trust a track record
it controls, and this one publishes a track record it cannot edit.

The seeded rounds in `src/forecasts/rounds.json` deliberately include a
round the agent loses.

---

## 5. The agent

Inputs, all pinned by digest at commit time:

- `eia` — the 8 WPSR series, 104 aligned weekly points
- `jodi` — monthly crude balances for 81 countries (supply-side context)
- `goget` / `goit` — extraction assets and pipeline capacity (structural)
- `noc` — national oil company production and capex (structural)

Output per series: a point forecast, an 80% interval, and a rationale that
cites which datasets and which digests it used. The reasoning is auditable
because the inputs are byte-pinned: anyone can pull the same digests and
check whether the stated reasoning is consistent with the stated inputs.

The three baselines ship in the same payload. Publishing the number you have
to beat, next to your number, is a small thing that almost nobody does.

---

## 6. What is built vs. what is not

**Built and working in this repo:**

- `src/lib/isobar.ts` — round model, commit hashing, `GAEA-FORECAST-V1`
  attestation, the three baselines computed live from the signed `eia.json`,
  the normalized skill metric, calibration tracking, and settlement.
- `src/forecasts/rounds.json` — the round ledger with seeded commits.
- `/api/isobar/rounds`, `/api/isobar/rounds/:id`, `/api/isobar/attest/:round/:forecaster`
- The Isobar module in the app shell and the lobby.

Resolution and scoring are **not mocked** — they read the real signed
dataset and recompute every number on each build.

**Not built, and honest about it:**

- No $IBAR contract. Stakes are notional integers.
- No on-chain settlement. `settleRound()` computes payouts; nothing transfers.
- The seeded commits in resolved rounds are illustrative. They were written
  after the outcomes were known and are marked `provenance: "seed"` in the
  ledger. Only rounds whose manifest is anchored carry a provable commit
  time, and the UI says so on every seeded round. Faking this would
  contradict the entire thesis of the product.
- The agent's forecasts are currently authored, not model-generated. Wiring
  a model behind `AgentForecast` is the next step and does not change the
  protocol.

---

## 7. Next steps

1. Anchor round manifests. `scripts/anchor.ts` already writes a Memo; a
   sibling `scripts/anchor-round.ts` with domain `GAEA-FORECAST-V1` is a
   short file, and from that moment every commit is genuinely provable.
2. Register `forecasts` as an attested dataset in `DATASETS`. Note this
   changes the anchor manifest and requires `npm run anchor` with the
   mainnet signer.
3. Wire a model to produce the agent's commits, reading inputs through
   `/api/datasets/:id` so its inputs are pinned by the same digests
   everyone else can verify.
4. Deploy $IBAR and move settlement on-chain.
