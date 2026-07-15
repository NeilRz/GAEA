import { NextResponse } from "next/server";
import { DATASETS } from "@/lib/attest";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const entry = DATASETS[id];
  if (!entry) {
    return NextResponse.json(
      { error: `Unknown dataset '${id}'`, available: Object.keys(DATASETS) },
      { status: 404 }
    );
  }
  return NextResponse.json(entry.data);
}
