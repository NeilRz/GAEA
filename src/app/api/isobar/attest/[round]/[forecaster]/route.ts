import { NextResponse } from "next/server";
import { attestForecast, findRound, allRounds } from "@/lib/isobar";

/** GET /api/isobar/attest/<round>/<forecaster>
 *
 *  Detached Ed25519 signature over
 *  `GAEA-FORECAST-V1|<round>|<forecaster>|<commitHash>`, signed by the same
 *  oracle key that signs the datasets. Verify it exactly like a dataset
 *  attestation.
 *
 *  What this proves and what it does not: the signature proves GEOM published
 *  this commit hash for this forecaster. It proves *when* only once the
 *  round's commit manifest is anchored on Solana, at which point
 *  `anchorSignature` is set and the slot is the timestamp. Until then the
 *  field is null and the endpoint says so rather than implying more. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ round: string; forecaster: string }> }
) {
  const { round: roundId, forecaster } = await params;

  const round = findRound(roundId);
  if (!round) {
    return NextResponse.json(
      { error: `Unknown round '${roundId}'`, available: allRounds().map((r) => r.id) },
      { status: 404 }
    );
  }

  const attestation = attestForecast(roundId, forecaster);
  if (!attestation) {
    return NextResponse.json(
      {
        error: `No commit by '${forecaster}' in round '${roundId}'`,
        available: round.commits.map((c) => c.forecaster),
      },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      ...attestation,
      commitTimeProven: attestation.anchorSignature !== null,
      note:
        attestation.anchorSignature === null
          ? "Round manifest not yet anchored: this signature proves authorship of the commit hash, not the time it was made."
          : "Commit hash is included in an anchored round manifest; the Solana slot is the commit timestamp.",
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    }
  );
}
