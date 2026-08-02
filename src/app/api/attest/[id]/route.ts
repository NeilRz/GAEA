import { NextResponse } from "next/server";
import { attest, DATASETS } from "@/lib/attest";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const attestation = attest(id);
  if (!attestation) {
    return NextResponse.json(
      { error: `Unknown dataset '${id}'`, available: Object.keys(DATASETS) },
      { status: 404 }
    );
  }
  // The signature is deterministic for a given dataset version; only the
  // unsigned signedAt stamp varies, so a short shared cache is safe.
  return NextResponse.json(attestation, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
