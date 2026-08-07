import { NextResponse } from "next/server";
import { leaderboard, resolutionSource, allRounds } from "@/lib/isobar";

/** GET /api/isobar/leaderboard
 *
 *  Skill and calibration across every resolved round.
 *
 *  `meanSkill` is the mean per-round skill against the naive baseline: 0 is
 *  "no better than carrying last week's number forward", positive beats it.
 *  `calibration` is the share of 80% intervals that contained the outcome, so
 *  0.8 is correct and 1.0 means the intervals are too wide to be useful.
 *  Deliberately separate from skill: a forecaster should not be able to buy a
 *  better score by hedging the width. */
export async function GET() {
  const rows = leaderboard();
  const seeded = allRounds().filter((r) => r.provenance === "seed").length;

  return NextResponse.json(
    {
      leaderboard: rows,
      resolutionSource: resolutionSource(),
      roundsSeeded: seeded,
      caveat:
        seeded > 0
          ? `${seeded} round(s) in this ledger are seeded: their commits are illustrative and were not anchored before the outcome was known. Only rounds with an anchorSignature carry a provable commit time.`
          : null,
      disclaimer:
        "Informational only, not investment advice. Past forecast accuracy describes what was published, not what will happen.",
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    }
  );
}
