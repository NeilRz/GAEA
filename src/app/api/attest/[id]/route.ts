import { NextResponse } from "next/server";
import { attest, DATASETS } from "@/lib/attest";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const attestation = await attest(id);
  if (!attestation) {
    return NextResponse.json(
      { error: `Unknown dataset '${id}'`, available: Object.keys(DATASETS) },
      { status: 404 }
    );
  }
  return NextResponse.json(attestation);
}
