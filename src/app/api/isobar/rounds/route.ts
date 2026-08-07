import { NextResponse } from "next/server";
import {
  allRounds,
  scoreRound,
  roundManifestHash,
  resolutionSource,
  FORECASTABLE_SERIES,
  seriesMeta,
  IBAR_TOKEN,
  IBAR_IS_LIVE,
} from "@/lib/isobar";

/** GET /api/isobar/rounds → every forecast round, newest first.
 *
 *  Summary only: commit hashes, stakes, settlement and skill per forecaster.
 *  For the revealed forecast bodies and per-series scores use
 *  /api/isobar/rounds/<id>. */
export async function GET() {
  const rounds = [...allRounds()].reverse().map((r) => {
    const result = scoreRound(r);
    return {
      id: r.id,
      targetPeriod: r.targetPeriod,
      series: r.series,
      opensAt: r.opensAt,
      sealsAt: r.sealsAt,
      resolvesAt: r.resolvesAt,
      // Resolution is derived from the signed dataset, not from the stored
      // status field: a round is resolved when, and only when, the target
      // week exists in the attested eia bytes.
      resolved: result.resolved,
      provenance: r.provenance,
      anchorSignature: r.anchorSignature,
      commitManifestSha256: roundManifestHash(r.id),
      pool: result.pool,
      consensus: result.consensus,
      forecasters: result.scores.map((s) => ({
        forecaster: s.forecaster,
        kind: s.kind,
        stake: s.stake,
        skill: s.skill,
        calibration: s.calibration,
        payout: s.payout,
        forfeited: s.forfeited,
        forfeitReason: s.forfeitReason,
      })),
    };
  });

  return NextResponse.json(
    {
      rounds,
      resolutionSource: resolutionSource(),
      scope: FORECASTABLE_SERIES.map((id) => ({ id, ...seriesMeta(id)! })),
      outOfScope:
        "Isobar forecasts physical fundamentals only. Prices, spreads, valuations and directional calls are refused at the API boundary.",
      token: { symbol: IBAR_TOKEN.symbol, live: IBAR_IS_LIVE },
      disclaimer:
        "Informational only, not investment advice. Attestation covers the integrity and commit time of a forecast, never its accuracy.",
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    }
  );
}
