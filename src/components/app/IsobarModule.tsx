"use client";

import { useState } from "react";
import type { IsobarView, RoundResult, ForecastPoint } from "@/lib/isobar";

/* Isobar — the forecast attestation layer.
 *
 * GEOM already proves what it published and when. This module points the same
 * machinery at what it predicted: forecasts are committed as salted hashes
 * before the release, and resolved against the signed eia dataset when the
 * EIA prints. Everything on this page is recomputed from those bytes at build
 * time, including the baselines each forecast is scored against.
 *
 * Scope is physical fundamentals only. No price, spread, valuation or
 * direction appears anywhere in this module, and src/lib/isobar.ts refuses
 * them at the API boundary. */

function fmt(n: number, unit: string): string {
  if (unit === "percent") return n.toFixed(1);
  return Math.round(n).toLocaleString("en-US");
}

function shortHash(h: string): string {
  return `${h.slice(0, 10)}…${h.slice(-6)}`;
}

function skillTone(skill: number | null): string {
  if (skill === null) return "tone-flat";
  return skill > 0 ? "tone-up" : "tone-down";
}

function pct(n: number | null): string {
  return n === null ? "—" : `${Math.round(n * 100)}%`;
}

function day(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

/** One series on a shared scale: the 80% interval as a band, the point
 *  forecast as a solid tick, the naive baseline as the thing to beat, and the
 *  printed outcome once it exists. Marks, not a chart, so it stays legible at
 *  row height. */
function Track({
  forecast,
  naive,
  actual,
}: {
  forecast: ForecastPoint | null;
  naive: number;
  actual: number | null;
}) {
  const values = [naive, forecast?.lo, forecast?.hi, forecast?.point, actual]
    .filter((v): v is number => typeof v === "number");
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min || Math.abs(max) * 0.01 || 1) * 0.18;
  const lo = min - pad;
  const span = max + pad - lo;
  const at = (v: number) => `${((v - lo) / span) * 100}%`;

  return (
    <div className="isb-track">
      {forecast && (
        <span
          className="isb-band"
          style={{ left: at(forecast.lo), width: `${((forecast.hi - forecast.lo) / span) * 100}%` }}
        />
      )}
      <span className="isb-mark isb-naive" style={{ left: at(naive) }} title="naive baseline" />
      {forecast && (
        <span className="isb-mark isb-point" style={{ left: at(forecast.point) }} title="forecast" />
      )}
      {actual !== null && (
        <span className="isb-mark isb-actual" style={{ left: at(actual) }} title="printed outcome" />
      )}
    </div>
  );
}

export default function IsobarModule({ view }: { view: IsobarView }) {
  const [selected, setSelected] = useState(view.results[0]?.round.id ?? "");
  const round: RoundResult | undefined =
    view.results.find((r) => r.round.id === selected) ?? view.results[0];

  const agentRow = view.leaderboard.find((l) => l.kind === "agent");
  const resolvedCount = view.results.filter((r) => r.resolved).length;
  const openRound = view.results.find((r) => !r.resolved);

  if (!round) {
    return (
      <main className="main">
        <p className="dim">No forecast rounds published yet.</p>
      </main>
    );
  }

  const agentCommit = round.round.commits.find((c) => c.kind === "agent");
  const seriesIds = round.round.series;

  return (
    <main className="main">
      <section className="stat-strip">
        <div className="panel stat-tile">
          <span className="stat-value" style={{ fontSize: 20, paddingTop: 6 }}>
            {openRound ? openRound.round.targetPeriod : "—"}
          </span>
          <span className="stat-label">Open round</span>
          <span className="stat-note">
            {openRound ? `seals ${day(openRound.round.sealsAt)}` : "none open"}
          </span>
        </div>
        <div className="panel stat-tile">
          <span className={`stat-value ${skillTone(agentRow?.meanSkill ?? null)}`}>
            {agentRow?.meanSkill !== null && agentRow?.meanSkill !== undefined
              ? agentRow.meanSkill.toFixed(2)
              : "—"}
          </span>
          <span className="stat-label">Agent mean skill</span>
          <span className="stat-note">vs naive · 0 = no edge</span>
        </div>
        <div className="panel stat-tile">
          <span className="stat-value">
            {agentRow ? pct(agentRow.calibration) : "—"}
          </span>
          <span className="stat-label">Interval calibration</span>
          <span className="stat-note">80% target</span>
        </div>
        <div className="panel stat-tile">
          <span className="stat-value">
            {resolvedCount}
            <span className="unit">of {view.results.length}</span>
          </span>
          <span className="stat-label">Rounds resolved</span>
          <span className="stat-note">settled against signed data</span>
        </div>
        <div className="panel stat-tile">
          <span className="stat-value" style={{ fontSize: 20, paddingTop: 6 }}>
            {view.source.version}
          </span>
          <span className="stat-label">Resolution source</span>
          <span className="stat-note">eia · weekly ingest</span>
        </div>
        <div className="panel stat-tile">
          <span className="stat-value" style={{ fontSize: 20, paddingTop: 6 }}>
            ${view.tokenSymbol}
          </span>
          <span className="stat-label">Stake asset</span>
          <span className="stat-note">
            {view.tokenLive ? "live" : "not deployed · stakes notional"}
          </span>
        </div>
      </section>

      <section className="panel isb-thesis" style={{ marginTop: 22 }}>
        <p className="panel-title">
          What Isobar is <span className="badge info">forecast attestation</span>
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.65, margin: "0 0 10px", color: "var(--ink-2)" }}>
          Forecasting track records are unfalsifiable because nobody can check
          when a call was made or what it was fed. Isobar fixes both with
          machinery GEOM already runs: a forecast is committed as a salted hash
          and anchored on Solana before the release, it cites its input
          datasets by digest, and it resolves against the same signed{" "}
          <span className="mono" style={{ color: "var(--glacial-bright)" }}>eia</span>{" "}
          bytes the oracle publishes. GEOM cannot move the goalposts without
          breaking its own anchor.
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.65, margin: 0, color: "var(--ink-2)" }}>
          Every forecast is scored against the number it has to beat, which is
          simply last week&apos;s value carried forward. That baseline is
          published next to each call, and the agent stakes on the same terms
          as everyone else and loses rounds in public.
        </p>
      </section>

      <section style={{ marginTop: 22 }}>
        <p className="sec-label">Rounds</p>
        <div className="dl-chips" style={{ marginBottom: 14 }}>
          {view.results.map((r) => (
            <button
              key={r.round.id}
              className={`dl-chip ${r.round.id === round.round.id ? "on" : ""}`}
              onClick={() => setSelected(r.round.id)}
            >
              {r.round.targetPeriod} {r.resolved ? "✓" : "· open"}
            </button>
          ))}
        </div>

        <div className="panel">
          <p className="panel-title">
            Week ending {round.round.targetPeriod}
            <span className={`badge ${round.resolved ? "good" : "info"}`}>
              {round.resolved ? "resolved" : "open"}
            </span>
            {round.round.anchorSignature === null && (
              <span className="badge warn">commit time not anchored</span>
            )}
            {round.round.provenance === "seed" && (
              <span className="badge plain">seed round</span>
            )}
          </p>

          {round.round.provenance === "seed" && (
            <p className="isb-caveat mono">
              {round.resolved ? (
                <>
                  Seeded round. These commits were written after the outcome
                  was known and are not anchored, so their commit time is not
                  provable. The scores are real, recomputed from the signed
                  dataset, but this is a demonstration of the mechanics rather
                  than a record of calls made in advance. Claiming otherwise
                  would defeat the point of the product.
                </>
              ) : (
                <>
                  Seeded round. This forecast genuinely predates the outcome,
                  which has not printed yet, but the round manifest is not
                  anchored on Solana, so the commit time rests on GEOM&apos;s
                  word rather than on a slot number. Anchoring is what turns
                  that into proof.
                </>
              )}
            </p>
          )}

          <div className="kv-list" style={{ marginBottom: 18 }}>
            <div className="row">
              <span className="k">Commit window</span>
              <span className="v mono" style={{ fontSize: 12 }}>
                opens {day(round.round.opensAt)} · seals {day(round.round.sealsAt)} · resolves {day(round.round.resolvesAt)}
              </span>
            </div>
            <div className="row">
              <span className="k">Resolves against</span>
              <span className="v mono" style={{ fontSize: 12 }}>
                {round.source.dataset}@{round.source.version}
              </span>
            </div>
            <div className="row">
              <span className="k">Pool</span>
              <span className="v mono" style={{ fontSize: 12 }}>
                {round.pool.toLocaleString("en-US")} {view.tokenSymbol}
                {!view.tokenLive && (
                  <span className="dimmer"> (notional, token not deployed)</span>
                )}
              </span>
            </div>
          </div>

          <p className="sec-label" style={{ marginTop: 0 }}>
            The number to beat
          </p>
          <div className="table-wrap" style={{ marginBottom: 20 }}>
            <table className="data">
              <thead>
                <tr>
                  <th>Series</th>
                  <th className="num">Naive</th>
                  <th className="num">Trend 4w</th>
                  <th className="num">Seasonal</th>
                  <th className="num">Consensus</th>
                  <th className="num">Printed</th>
                  <th style={{ minWidth: 190 }}>Agent forecast · 80% interval</th>
                </tr>
              </thead>
              <tbody>
                {seriesIds.map((id) => {
                  const ref = round.reference[id];
                  if (!ref) return null;
                  const fc = agentCommit?.reveal?.points[id] ?? null;
                  return (
                    <tr key={id}>
                      <td>
                        <span style={{ fontSize: 13 }}>{ref.label}</span>
                        <br />
                        <span className="mono dimmer" style={{ fontSize: 10.5 }}>
                          {ref.unit}
                        </span>
                      </td>
                      <td className="num">{fmt(ref.baselines.naive, ref.unit)}</td>
                      <td className="num dim">
                        {ref.baselines.trend4 === null ? "—" : fmt(ref.baselines.trend4, ref.unit)}
                      </td>
                      <td className="num dim">
                        {ref.baselines.seasonal === null ? "—" : fmt(ref.baselines.seasonal, ref.unit)}
                      </td>
                      <td className="num">
                        {round.consensus[id] === undefined
                          ? "—"
                          : fmt(round.consensus[id], ref.unit)}
                      </td>
                      <td className="num">
                        {ref.actual === null ? (
                          <span className="dimmer">pending</span>
                        ) : (
                          <strong>{fmt(ref.actual, ref.unit)}</strong>
                        )}
                      </td>
                      <td>
                        <Track forecast={fc} naive={ref.baselines.naive} actual={ref.actual} />
                        <span className="mono dimmer" style={{ fontSize: 10.5 }}>
                          {fc
                            ? `${fmt(fc.point, ref.unit)}  [${fmt(fc.lo, ref.unit)} – ${fmt(fc.hi, ref.unit)}]`
                            : "not revealed"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="isb-legend mono">
            <span><i className="isb-key isb-naive" /> naive baseline</span>
            <span><i className="isb-key isb-band-key" /> 80% interval</span>
            <span><i className="isb-key isb-point" /> agent forecast</span>
            <span><i className="isb-key isb-actual" /> printed outcome</span>
          </div>

          <p className="sec-label" style={{ marginTop: 20 }}>
            Commits
          </p>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Forecaster</th>
                  <th>Commit hash</th>
                  <th>Committed</th>
                  <th>State</th>
                  <th className="num">Stake</th>
                  <th className="num">Skill</th>
                  <th className="num">Calibration</th>
                  <th className="num">Settled</th>
                </tr>
              </thead>
              <tbody>
                {round.scores.map((s) => {
                  const commit = round.round.commits.find(
                    (c) => c.forecaster === s.forecaster
                  )!;
                  return (
                    <tr key={s.forecaster}>
                      <td>
                        <span style={{ fontSize: 13 }}>{s.label}</span>
                        <br />
                        <span className="mono dimmer" style={{ fontSize: 10.5 }}>
                          {s.kind}
                        </span>
                      </td>
                      <td className="mono dim" style={{ fontSize: 11 }}>
                        {shortHash(commit.commitHash)}
                      </td>
                      <td className="mono dim" style={{ fontSize: 11 }}>
                        {commit.committedAt.slice(0, 16).replace("T", " ")}
                      </td>
                      <td>
                        {s.forfeited ? (
                          <span className="badge critical">
                            forfeit · {s.forfeitReason}
                          </span>
                        ) : commit.reveal ? (
                          <span className="badge good">
                            {commit.open ? "published open" : "revealed"}
                          </span>
                        ) : (
                          <span className="badge">sealed</span>
                        )}
                      </td>
                      <td className="num">{s.stake.toLocaleString("en-US")}</td>
                      <td className={`num ${skillTone(s.skill)}`}>
                        {s.skill === null ? "—" : s.skill.toFixed(3)}
                      </td>
                      <td className="num dim">{pct(s.calibration)}</td>
                      <td className="num">
                        {round.resolved ? (
                          <span className={s.payout >= s.stake ? "tone-up" : "tone-down"}>
                            {s.payout.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                          </span>
                        ) : (
                          <span className="dimmer">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {agentCommit?.reveal && (
            <div style={{ marginTop: 18 }}>
              <p className="sec-label">Agent rationale</p>
              <p style={{ fontSize: 13.5, lineHeight: 1.7, color: "var(--ink-2)", margin: "0 0 12px" }}>
                {agentCommit.reveal.rationale}
              </p>
              <p className="sec-label">Inputs, pinned by digest</p>
              <div className="provenance">
                {agentCommit.reveal.inputs.map((i) => (
                  <div key={i.dataset} className="mono" style={{ fontSize: 11 }}>
                    {i.dataset}@{i.version} · {i.sha256.slice(0, 32)}…
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="panel" style={{ marginTop: 22 }}>
        <p className="panel-title">
          Leaderboard <span className="badge plain">{resolvedCount} resolved rounds</span>
        </p>
        <p className="dim" style={{ fontSize: 13, marginTop: 0 }}>
          Skill is measured against carrying last week&apos;s number forward,
          with errors normalized by each series&apos; own weekly volatility
          before they are aggregated. Zero means no edge over the naive model.
          Calibration is tracked separately so nobody can buy a better score by
          widening their intervals.
        </p>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Forecaster</th>
                <th>Kind</th>
                <th className="num">Rounds</th>
                <th className="num">Mean skill</th>
                <th className="num">Best</th>
                <th className="num">Worst</th>
                <th className="num">Calibration</th>
                <th className="num">Forfeits</th>
                <th className="num">Staked</th>
                <th className="num">Returned</th>
              </tr>
            </thead>
            <tbody>
              {view.leaderboard.map((l) => (
                <tr key={l.forecaster}>
                  <td style={{ fontSize: 13 }}>{l.label}</td>
                  <td className="mono dim" style={{ fontSize: 11 }}>{l.kind}</td>
                  <td className="num dim">{l.rounds}</td>
                  <td className={`num ${skillTone(l.meanSkill)}`}>
                    {l.meanSkill === null ? "—" : l.meanSkill.toFixed(3)}
                  </td>
                  <td className="num dim">{l.bestSkill?.toFixed(3) ?? "—"}</td>
                  <td className="num dim">{l.worstSkill?.toFixed(3) ?? "—"}</td>
                  <td className="num dim">{pct(l.calibration)}</td>
                  <td className="num dim">{l.forfeits}</td>
                  <td className="num dim">{l.staked.toLocaleString("en-US")}</td>
                  <td className="num">
                    <span className={l.returned >= l.staked ? "tone-up" : "tone-down"}>
                      {l.returned.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-2" style={{ marginTop: 22 }}>
        <div className="panel">
          <p className="panel-title">
            Scope <span className="badge good">enforced in code</span>
          </p>
          <p className="dim" style={{ fontSize: 13, marginTop: 0 }}>
            Isobar forecasts physical fundamentals: government statistics about
            barrels in tanks and barrels out of the ground. The allowlist below
            is the whole surface, and the submission API returns{" "}
            <span className="mono">422 out_of_scope</span> for anything else.
          </p>
          <div className="isb-scope">
            <div>
              <span className="sec-label">Forecastable</span>
              <ul className="isb-list">
                {view.scope.map((s) => (
                  <li key={s.id}>
                    {s.label}
                    <span className="mono dimmer"> · {s.unit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <span className="sec-label">Never</span>
              <ul className="isb-list isb-list-no">
                <li>Any price, spot or forward</li>
                <li>Any spread, crack or basis</li>
                <li>Any equity or token valuation</li>
                <li>Any buy, sell or hold direction</li>
                <li>Any price target or range</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="panel">
          <p className="panel-title">
            ${view.tokenSymbol} mechanics
            <span className="badge warn">
              {view.tokenLive ? "live" : "not deployed"}
            </span>
          </p>
          <p className="dim" style={{ fontSize: 13, marginTop: 0 }}>
            No contract exists. Every stake on this page is a notional integer
            and nothing transfers. The mechanics below describe the design.
          </p>
          <div className="kv-list">
            <div className="row">
              <span className="k">Stake to submit</span>
              <span className="v" style={{ fontSize: 12.5 }}>
                A commit locks {view.tokenSymbol}, so spamming a thousand
                forecasts to farm one lucky hit costs something
              </span>
            </div>
            <div className="row">
              <span className="k">Conviction</span>
              <span className="v" style={{ fontSize: 12.5 }}>
                Stake sets your weight in the published consensus print.
                Influence and exposure are the same dial
              </span>
            </div>
            <div className="row">
              <span className="k">Settlement</span>
              <span className="v" style={{ fontSize: 12.5 }}>
                Zero-sum among participants. Beat the baseline and you take
                from those who did not. No emission, no yield
              </span>
            </div>
            <div className="row">
              <span className="k">Forfeit</span>
              <span className="v" style={{ fontSize: 12.5 }}>
                Commit and never reveal, or reveal something that does not
                hash to your commit, and the stake funds the pool
              </span>
            </div>
            <div className="row">
              <span className="k">Reputation</span>
              <span className="v" style={{ fontSize: 12.5 }}>
                Skill history is non-transferable. Stake is buyable, a track
                record is not
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="panel" style={{ marginTop: 22 }}>
        <p className="panel-title">
          Verify a round yourself <span className="badge good">public</span>
        </p>
        <p className="dim" style={{ fontSize: 13, marginTop: 0 }}>
          Nothing here needs to be taken on trust. Pull the commit, pull the
          dataset it resolves against, recompute the digest, and re-derive the
          score.
        </p>
        <div className="codeblock">
          <span className="k">GET</span> /api/isobar/rounds                       <span className="v"># every round, newest first</span>{"\n"}
          <span className="k">GET</span> /api/isobar/rounds/{round.round.id}      <span className="v"># baselines, reveals, per-series scores</span>{"\n"}
          <span className="k">GET</span> /api/isobar/attest/{round.round.id}/isobar-agent{"\n"}
          {"                                              "}<span className="v"># Ed25519 over GAEA-FORECAST-V1|round|forecaster|hash</span>{"\n"}
          <span className="k">GET</span> /api/datasets/eia                        <span className="v"># the bytes the round resolves against</span>{"\n"}
          <span className="k">GET</span> /api/attest/eia                          <span className="v"># and its signed digest</span>
        </div>
        <p className="dim" style={{ fontSize: 13, marginBottom: 0, marginTop: 14 }}>
          The forecast signature uses the same oracle key and the same
          verification path as a dataset attestation, so the five-line verifier
          on the Status module works on it unchanged. A signature proves
          authorship; the commit <em>time</em> is proven only once the
          round&apos;s manifest is anchored, and the API says which of the two
          you are looking at rather than blurring them.
        </p>
      </section>

      <p className="provenance">
        Informational only, not investment advice. Isobar publishes forecasts
        of published government statistics and never issues recommendations,
        price targets, or directional calls. Attestation covers the integrity
        and commit time of a forecast, never its accuracy: a signed forecast is
        a forecast that cannot be quietly edited, not a forecast that is
        correct. Past accuracy describes what was published, not what will
        happen.
      </p>
    </main>
  );
}
