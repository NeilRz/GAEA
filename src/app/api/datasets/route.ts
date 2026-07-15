import { NextResponse } from "next/server";
import { datasetHashes } from "@/lib/attest";

export async function GET() {
  return NextResponse.json({
    datasets: datasetHashes(),
    hashAlgorithm: "sha256(canonical-json)",
  });
}
