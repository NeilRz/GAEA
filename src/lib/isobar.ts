import bs58 from "bs58";
import nacl from "tweetnacl";
import eia from "@/data/eia.json";
import rounds from "@/forecasts/rounds.json";
import { canonicalize, sha256Hex, getSigner } from "@/lib/attest";

/**
 * Isobar — the forecast attestation layer.
 *
 * GEOM already proves what it published and when: datasets are canonicalized,
 * hashed, Ed25519-signed, and their manifest digest is anchored on Solana.
 * Isobar points the same machinery at forecasts. A forecast is committed as a
 * salted hash before the release, the round manifest is anchored, and when the
 * EIA prints, the outcome is read out of the *same signed dataset* the oracle
 * already publishes. Nobody at GEOM can move the goalposts without breaking
 * the anchor.
 *
 * Scope is physical fundamentals only. See FORECASTABLE_SERIES: prices,
 * spreads, valuations and directional calls are out of scope by construction,
 * not by policy note. See docs/isobar.md.
 */

export const FORECAST_DOMAIN = "GAEA-FORECAST-V1";

/* ── scope boundary ─────────────────────────────────────────────────────── */

/** Physical fundamentals GEOM will forecast. Everything absent from this set
 *  is refused: no price, spread, crack, basis, valuation or direction. This
 *  is the compliance boundary and it lives in code so it cannot drift out of
 *  sync with the copy. */
export const FORECASTABLE_SERIES = [
  "crude_stocks",
  "spr_stocks",
  "crude_production",
  "refiner_inputs",
  "refinery_utilization",
  "crude_imports",
  "gasoline_stocks",
  "distillate_stocks",
] as const;

export type SeriesId = (typeof FORECASTABLE_SERIES)[number];

const FORECASTABLE = new Set<string>(FORECASTABLE_SERIES);

export function isForecastable(seriesId: string): seriesId is SeriesId {
  return FORECASTABLE.has(seriesId);
}

export class OutOfScopeError extends Error {
  constructor(readonly seriesId: string) {
    super(
      `'${seriesId}' is out of scope. Isobar forecasts physical fundamentals only — never prices, spreads, valuations or direction.`
    );
    this.name = "OutOfScopeError";
  }
}

export function assertForecastable(seriesId: string): asserts seriesId is SeriesId {
  if (!isForecastable(seriesId)) throw new OutOfScopeError(seriesId);
}

/* ── the $IBAR token ────────────────────────────────────────────────────── */

/** Not deployed. Staged the same way GEOM_TOKEN is in board.ts: an empty mint
 *  means every stake in the UI is notional and must be labelled as such. */
export const IBAR_TOKEN = {
  symbol: "IBAR",
  name: "Isobar",
  chain: "solana" as const,
  mint: "",
  supply: 100_000_000,
  emission: "none — settlement is redistribution among participants",
};

export const IBAR_IS_LIVE = IBAR_TOKEN.mint.length > 0;

/* ── ledger types ───────────────────────────────────────────────────────── */

export interface ForecastPoint {
  /** Point forecast, in the series' own unit. */
  point: number;
  /** 80% interval. */
  lo: number;
  hi: number;
}

export interface InputRef {
  dataset: string;
  version: string;
  sha256: string;
}

export interface Reveal {
  salt: string;
  points: Record<string, ForecastPoint>;
  rationale: string;
  inputs: InputRef[];
  revealedAt: string;
}

export interface Commit {
  forecaster: string;
  label: string;
  kind: "agent" | "desk" | "model";
  /** Notional until $IBAR exists. */
  stake: number;
  commitHash: string;
  committedAt: string;
  /** The agent publishes in the open at commit time; it is the intelligence
   *  product. Staked forecasters commit blind and reveal after the seal. */
  open?: boolean;
  reveal: Reveal | null;
}

export interface Round {
  id: string;
  /** EIA week-ending date this round resolves against, YYYY-MM-DD. */
  targetPeriod: string;
  series: string[];
  opensAt: string;
  sealsAt: string;
  resolvesAt: string;
  status: "open" | "sealed" | "resolved";
  /** Anchor transaction signature for the sealed commit manifest, once one
   *  exists. Null means the commit times are not yet provable. */
  anchorSignature: string | null;
  /** "seed" marks illustrative commits written after the outcome was known.
   *  Surfaced in the UI on every round; the whole product is the difference
   *  between this and a real anchored commit. */
  provenance: "seed" | "live";
  commits: Commit[];
}

interface RoundLedger {
  meta: { id: string; title: string; note: string; version: string };
  rounds: Round[];
}

const LEDGER = rounds as unknown as RoundLedger;

/* ── the signed dataset the rounds resolve against ──────────────────────── */

interface EiaPoint {
  period: string;
  value: number;
}
interface EiaSeries {
  id: string;
  label: string;
  unit: string;
  latest: EiaPoint;
  points: EiaPoint[];
}

const SERIES: EiaSeries[] = eia.series as EiaSeries[];

function seriesById(id: string): EiaSeries | null {
  return SERIES.find((s) => s.id === id) ?? null;
}

export function seriesMeta(id: string): { label: string; unit: string } | null {
  const s = seriesById(id);
  return s ? { label: s.label, unit: s.unit } : null;
}

/** The resolution source, pinned. A verifier pulls /api/datasets/eia,
 *  recomputes the digest, checks it against the anchored manifest, and can
 *  then re-derive every score in this file independently. */
export function resolutionSource(): InputRef {
  return {
    dataset: "eia",
    version: eia.meta.version,
    sha256: sha256Hex(canonicalize(eia)),
  };
}

/* ── baselines ──────────────────────────────────────────────────────────── */

export interface Baselines {
  /** Last published value carried forward. The number to beat. */
  naive: number;
  /** Last value plus the mean of the trailing 4 week-over-week changes. */
  trend4: number | null;
  /** Last value plus the same-week change one year earlier. */
  seasonal: number | null;
  /** Stdev of the trailing 52 week-over-week changes, measured strictly
   *  before the target week. The natural error scale for this series. */
  scale: number;
  /** Period the baselines were carried forward from. */
  basePeriod: string;
}

function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const v = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(v);
}

/**
 * Baselines for `seriesId` at `targetPeriod`, computed only from points
 * strictly before the target. Nothing here may touch the outcome week: a
 * scale that leaked the target would flatter every forecast in the round.
 */
export function baselinesFor(
  seriesId: string,
  targetPeriod: string
): Baselines | null {
  const s = seriesById(seriesId);
  if (!s) return null;

  /* The target week may not have printed yet, so locate the base as the last
     point strictly before it rather than indexing off the target itself. */
  let base = -1;
  for (let i = 0; i < s.points.length; i++) {
    if (s.points[i].period < targetPeriod) base = i;
    else break;
  }
  if (base < 1) return null;

  const v = s.points.map((p) => p.value);
  const diffs: number[] = [];
  for (let i = Math.max(1, base - 51); i <= base; i++) diffs.push(v[i] - v[i - 1]);

  const last4 = diffs.slice(-4);
  const trend4 =
    last4.length === 4
      ? v[base] + last4.reduce((a, b) => a + b, 0) / 4
      : null;

  // Same-week change a year earlier: weekly stocks are strongly seasonal, so
  // this is a materially harder baseline than naive in spring and autumn.
  const seasonal =
    base >= 52 ? v[base] + (v[base - 51] - v[base - 52]) : null;

  const scale = stdev(diffs);

  return {
    naive: v[base],
    trend4: trend4 === null ? null : round2(trend4),
    seasonal: seasonal === null ? null : round2(seasonal),
    // A zero scale would divide by zero downstream; a flat series has no
    // resolvable skill either way, so fall back to 1 unit.
    scale: scale > 0 ? scale : 1,
    basePeriod: s.points[base].period,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** The printed outcome for a round's target week, or null if it has not
 *  published yet. Read straight out of the signed dataset. */
export function actualFor(seriesId: string, targetPeriod: string): number | null {
  const s = seriesById(seriesId);
  if (!s) return null;
  return s.points.find((p) => p.period === targetPeriod)?.value ?? null;
}

/* ── commit hashing ─────────────────────────────────────────────────────── */

/** A commit binds a forecast without publishing it: the salt makes the hash
 *  unguessable even though the plausible value range is narrow. Reveal is
 *  checked back against this. */
export function commitHash(reveal: Omit<Reveal, "revealedAt">): string {
  return sha256Hex(
    canonicalize({
      salt: reveal.salt,
      points: reveal.points,
      rationale: reveal.rationale,
      inputs: reveal.inputs,
    })
  );
}

export function revealMatchesCommit(c: Commit): boolean {
  if (!c.reveal) return false;
  return commitHash(c.reveal) === c.commitHash;
}

/* ── scoring ────────────────────────────────────────────────────────────── */

export interface SeriesScore {
  seriesId: string;
  label: string;
  unit: string;
  forecast: ForecastPoint;
  actual: number;
  baselines: Baselines;
  absError: number;
  naiveAbsError: number;
  /** Error in units of the series' own weekly volatility. */
  z: number;
  naiveZ: number;
  /** Did the 80% interval contain the outcome. */
  hit: boolean;
}

export interface ForecasterScore {
  forecaster: string;
  label: string;
  kind: Commit["kind"];
  stake: number;
  /** Null when the commit was never revealed or the reveal did not hash to
   *  the commit — either way the stake is forfeited. */
  skill: number | null;
  forfeited: boolean;
  forfeitReason: "no-reveal" | "hash-mismatch" | null;
  series: SeriesScore[];
  /** Share of 80% intervals containing the outcome. */
  calibration: number | null;
  payout: number;
}

export interface RoundResult {
  round: Round;
  resolved: boolean;
  source: InputRef;
  scores: ForecasterScore[];
  /** The three baselines per series, and the outcome once it prints. Carried
   *  on the result so an open round can show the number to beat before any
   *  score exists. */
  reference: Record<
    string,
    { label: string; unit: string; baselines: Baselines; actual: number | null }
  >;
  pool: number;
  /** Stake-weighted median across revealed forecasts, per series. The
   *  published consensus print. */
  consensus: Record<string, number>;
}

/**
 * Skill against the naive baseline, aggregated across the round's series.
 *
 *   z      = |forecast − actual| / scale
 *   skill  = 1 − ( Σ z_forecast / Σ z_naive )
 *
 * The errors are normalized and summed *before* the ratio is taken. Doing it
 * the other way — a mean of per-series skill ratios — blows up whenever the
 * naive error is near zero, which on crude production happens most weeks, and
 * one such series would swamp the round.
 */
function skillFrom(series: SeriesScore[]): number | null {
  if (series.length === 0) return null;
  const f = series.reduce((a, s) => a + s.z, 0);
  const n = series.reduce((a, s) => a + s.naiveZ, 0);
  if (n === 0) return null;
  return round4(1 - f / n);
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function weightedMedian(
  pairs: Array<{ value: number; weight: number }>
): number | null {
  if (pairs.length === 0) return null;
  const sorted = [...pairs].sort((a, b) => a.value - b.value);
  const total = sorted.reduce((a, p) => a + p.weight, 0);
  if (total <= 0) return sorted[Math.floor(sorted.length / 2)].value;
  let acc = 0;
  for (const p of sorted) {
    acc += p.weight;
    if (acc >= total / 2) return p.value;
  }
  return sorted[sorted.length - 1].value;
}

export function scoreRound(round: Round): RoundResult {
  const source = resolutionSource();

  const actuals: Record<string, number | null> = {};
  for (const id of round.series) actuals[id] = actualFor(id, round.targetPeriod);
  const resolved = round.series.every((id) => actuals[id] !== null);

  const scores: ForecasterScore[] = round.commits.map((c) => {
    const base: Omit<ForecasterScore, "skill" | "series" | "calibration" | "payout"> = {
      forecaster: c.forecaster,
      label: c.label,
      kind: c.kind,
      stake: c.stake,
      forfeited: false,
      forfeitReason: null,
    };

    if (!c.reveal) {
      // Unrevealed during an open round is normal; unrevealed once the
      // outcome exists is a forfeit. That asymmetry is what makes the blind
      // commit window safe to run.
      return {
        ...base,
        forfeited: resolved,
        forfeitReason: resolved ? "no-reveal" : null,
        skill: null,
        series: [],
        calibration: null,
        payout: 0,
      };
    }

    if (!revealMatchesCommit(c)) {
      return {
        ...base,
        forfeited: true,
        forfeitReason: "hash-mismatch",
        skill: null,
        series: [],
        calibration: null,
        payout: 0,
      };
    }

    const series: SeriesScore[] = [];
    for (const id of round.series) {
      const actual = actuals[id];
      const fc = c.reveal.points[id];
      const bl = baselinesFor(id, round.targetPeriod);
      if (actual === null || !fc || !bl) continue;
      const meta = seriesMeta(id)!;
      const absError = Math.abs(fc.point - actual);
      const naiveAbsError = Math.abs(bl.naive - actual);
      series.push({
        seriesId: id,
        label: meta.label,
        unit: meta.unit,
        forecast: fc,
        actual,
        baselines: bl,
        absError: round2(absError),
        naiveAbsError: round2(naiveAbsError),
        z: round4(absError / bl.scale),
        naiveZ: round4(naiveAbsError / bl.scale),
        hit: actual >= fc.lo && actual <= fc.hi,
      });
    }

    return {
      ...base,
      skill: skillFrom(series),
      series,
      calibration:
        series.length > 0
          ? round4(series.filter((s) => s.hit).length / series.length)
          : null,
      payout: 0,
    };
  });

  /* Settlement: zero-sum redistribution, no emission. Beat the naive
     baseline and you take a share of the pool proportional to stake × how
     far you beat it. Fail to beat it, or forfeit, and your stake funds
     those who did. */
  const pool = round.commits.reduce((a, c) => a + c.stake, 0);
  if (resolved) {
    const weights = scores.map((s) =>
      s.skill !== null && s.skill > 0 ? s.stake * s.skill : 0
    );
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    if (totalWeight > 0) {
      scores.forEach((s, i) => {
        s.payout = round2((pool * weights[i]) / totalWeight);
      });
    } else {
      // Nobody beat the baseline: stakes return rather than vanish.
      scores.forEach((s) => {
        s.payout = s.forfeited ? 0 : s.stake;
      });
    }
  }

  const consensus: Record<string, number> = {};
  for (const id of round.series) {
    const pairs = round.commits
      .filter((c) => c.reveal?.points[id])
      .map((c) => ({ value: c.reveal!.points[id].point, weight: c.stake }));
    const m = weightedMedian(pairs);
    if (m !== null) consensus[id] = m;
  }

  const reference: RoundResult["reference"] = {};
  for (const id of round.series) {
    const bl = baselinesFor(id, round.targetPeriod);
    const meta = seriesMeta(id);
    if (!bl || !meta) continue;
    reference[id] = { ...meta, baselines: bl, actual: actuals[id] };
  }

  return { round, resolved, source, scores, reference, pool, consensus };
}

/* ── attestation ────────────────────────────────────────────────────────── */

export interface ForecastAttestation {
  domain: string;
  scheme: "ed25519";
  round: string;
  forecaster: string;
  commitHash: string;
  committedAt: string;
  message: string;
  signer: string;
  signature: string;
  signedAt: string;
  devSigner: boolean;
  /** Null until the round's commit manifest is anchored. Without it the
   *  signature proves authorship but not commit time. */
  anchorSignature: string | null;
}

export function forecastMessage(
  roundId: string,
  forecaster: string,
  hash: string
): string {
  return `${FORECAST_DOMAIN}|${roundId}|${forecaster}|${hash}`;
}

export function attestForecast(
  roundId: string,
  forecaster: string
): ForecastAttestation | null {
  const round = findRound(roundId);
  const commit = round?.commits.find((c) => c.forecaster === forecaster);
  if (!round || !commit) return null;
  const message = forecastMessage(roundId, forecaster, commit.commitHash);
  const { keypair, dev } = getSigner();
  const signature = nacl.sign.detached(
    new TextEncoder().encode(message),
    keypair.secretKey
  );
  return {
    domain: FORECAST_DOMAIN,
    scheme: "ed25519",
    round: roundId,
    forecaster,
    commitHash: commit.commitHash,
    committedAt: commit.committedAt,
    message,
    signer: bs58.encode(keypair.publicKey),
    signature: bs58.encode(signature),
    signedAt: new Date().toISOString(),
    devSigner: dev,
    anchorSignature: round.anchorSignature,
  };
}

/**
 * The commit manifest for a round: what gets hashed and written to Solana at
 * seal time. One transaction commits to every forecast in the round at once,
 * exactly as anchorManifest() does for datasets.
 */
export function roundManifest(roundId: string): {
  domain: string;
  round: string;
  targetPeriod: string;
  commits: Array<{ forecaster: string; commitHash: string; stake: number }>;
} | null {
  const round = findRound(roundId);
  if (!round) return null;
  return {
    domain: FORECAST_DOMAIN,
    round: round.id,
    targetPeriod: round.targetPeriod,
    commits: round.commits
      .map((c) => ({
        forecaster: c.forecaster,
        commitHash: c.commitHash,
        stake: c.stake,
      }))
      .sort((a, b) => (a.forecaster < b.forecaster ? -1 : 1)),
  };
}

export function roundManifestHash(roundId: string): string | null {
  const m = roundManifest(roundId);
  return m ? sha256Hex(canonicalize(m)) : null;
}

/* ── ledger access + the view the UI renders ────────────────────────────── */

export function allRounds(): Round[] {
  return LEDGER.rounds;
}

export function findRound(id: string): Round | null {
  return LEDGER.rounds.find((r) => r.id === id) ?? null;
}

export interface LeaderboardRow {
  forecaster: string;
  label: string;
  kind: Commit["kind"];
  rounds: number;
  meanSkill: number | null;
  bestSkill: number | null;
  worstSkill: number | null;
  calibration: number | null;
  forfeits: number;
  staked: number;
  returned: number;
}

export function leaderboard(): LeaderboardRow[] {
  const results = allRounds().map(scoreRound).filter((r) => r.resolved);
  const byForecaster = new Map<string, ForecasterScore[]>();
  for (const r of results) {
    for (const s of r.scores) {
      const list = byForecaster.get(s.forecaster) ?? [];
      list.push(s);
      byForecaster.set(s.forecaster, list);
    }
  }

  const rows: LeaderboardRow[] = [];
  for (const [forecaster, entries] of byForecaster) {
    const scored = entries.filter((e) => e.skill !== null);
    const skills = scored.map((e) => e.skill!);
    const calibs = scored
      .map((e) => e.calibration)
      .filter((c): c is number => c !== null);
    rows.push({
      forecaster,
      label: entries[0].label,
      kind: entries[0].kind,
      rounds: entries.length,
      meanSkill:
        skills.length > 0
          ? round4(skills.reduce((a, b) => a + b, 0) / skills.length)
          : null,
      bestSkill: skills.length > 0 ? Math.max(...skills) : null,
      worstSkill: skills.length > 0 ? Math.min(...skills) : null,
      calibration:
        calibs.length > 0
          ? round4(calibs.reduce((a, b) => a + b, 0) / calibs.length)
          : null,
      forfeits: entries.filter((e) => e.forfeited).length,
      staked: entries.reduce((a, e) => a + e.stake, 0),
      returned: round2(entries.reduce((a, e) => a + e.payout, 0)),
    });
  }

  return rows.sort((a, b) => (b.meanSkill ?? -99) - (a.meanSkill ?? -99));
}

export interface IsobarView {
  tokenLive: boolean;
  tokenSymbol: string;
  source: InputRef;
  latestPeriod: string;
  results: RoundResult[];
  leaderboard: LeaderboardRow[];
  /** Baselines for the open round, so the UI can show the number to beat
   *  next to every forecast. */
  scope: Array<{ id: string; label: string; unit: string }>;
}

export function isobarView(): IsobarView {
  return {
    tokenLive: IBAR_IS_LIVE,
    tokenSymbol: IBAR_TOKEN.symbol,
    source: resolutionSource(),
    latestPeriod: eia.meta.version,
    // Newest round first; the ledger is written oldest-first.
    results: [...allRounds()].reverse().map(scoreRound),
    leaderboard: leaderboard(),
    scope: FORECASTABLE_SERIES.map((id) => {
      const m = seriesMeta(id)!;
      return { id, label: m.label, unit: m.unit };
    }),
  };
}
