import { NextResponse } from "next/server";
import { DATASETS } from "@/lib/attest";

// Datasets too large for the serverless response limit (~4.5 MB) are also
// published as byte-identical static files under /data/ and served from the
// CDN; the API redirects there. Verifiers following the redirect get JSON
// whose canonical SHA-256 matches the attestation either way.
const STATIC_LARGE: Record<string, string> = {
  plants: "/data/plants.json",
};

const CACHE = "public, s-maxage=3600, stale-while-revalidate=86400";

export async function GET(
  req: Request,
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
  if (STATIC_LARGE[id]) {
    return NextResponse.redirect(new URL(STATIC_LARGE[id], req.url), 307);
  }
  return NextResponse.json(entry.data, { headers: { "Cache-Control": CACHE } });
}
