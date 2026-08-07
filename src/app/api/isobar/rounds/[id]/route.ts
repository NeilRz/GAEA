import { NextResponse } from "next/server";
import {
  allRounds,
  findRound,
  scoreRound,
  roundManifest,
  roundManifestHash,
  baselinesFor,
  seriesMeta,
} from "@/lib/isobar";

/** GET /api/isobar/rounds/<id>
 *
 *  One round in full: the commit manifest that gets anchored, every revealed
 *  forecast with its per-series score, and the three baselines each forecast
 *  is measured against. Everything here is recomputed from the signed eia
 *  dataset on each request, so a verifier can reproduce it from
 *  /api/datasets/eia without trusting this endpoint. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const round = findRound(id);
  if (!round) {
    return NextResponse.json(
      {
        error: `Unknown round '${id}'`,
        available: allRounds().map((r) => r.id),
      },
      { status: 404 }
    );
  }

  const result = scoreRound(round);

  const baselines = Object.fromEntries(
    round.series.map((s) => [
      s,
      { ...seriesMeta(s), ...baselinesFor(s, round.targetPeriod) },
    ])
  );

  return NextResponse.json(
    {
      round: {
        id: round.id,
        targetPeriod: round.targetPeriod,
        series: round.series,
        opensAt: round.opensAt,
        sealsAt: round.sealsAt,
        resolvesAt: round.resolvesAt,
        resolved: result.resolved,
        provenance: round.provenance,
        anchorSignature: round.anchorSignature,
      },
      commitManifest: roundManifest(id),
      commitManifestSha256: roundManifestHash(id),
      resolutionSource: result.source,
      baselines,
      consensus: result.consensus,
      pool: result.pool,
      scores: result.scores,
      /* Blind commits are withheld until their reveal; the hash is all there
         is to publish, and that is the point of the commit window. */
      reveals: round.commits.map((c) => ({
        forecaster: c.forecaster,
        commitHash: c.commitHash,
        committedAt: c.committedAt,
        open: c.open === true,
        reveal: c.reveal,
      })),
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
