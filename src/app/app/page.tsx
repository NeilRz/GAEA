import type { Metadata } from "next";
import { Suspense } from "react";
import bs58 from "bs58";
import { anchorManifestHash, getSigner } from "@/lib/attest";
import { catalogRows, datasetDetail, datasetIds } from "@/lib/oracle-catalog";
import anchors from "@/data/anchors.json";
import reserves from "@/data/reserves.json";
import fields from "@/data/fields.json";
import tokenized from "@/data/tokenized.json";
import GeomApp, { type AppData, type AnchorRecord } from "@/components/app/GeomApp";

export const metadata: Metadata = {
  title: "App · GEOM",
  description:
    "The GEOM application: reserve map, tokenization tracker, terminal, and oracle in one surface.",
};

export default function AppPage() {
  const { keypair, dev } = getSigner();
  const data: AppData = {
    stats: {
      totalReserves: Math.round(
        reserves.countries.reduce((s, c) => s + c.reserves, 0)
      ),
      reserveCountries: reserves.countries.length,
      fieldCount: fields.fields.length,
      arcticCount: fields.fields.filter((f) => f.arctic).length,
      tokenizedCount: tokenized.assets.length,
      datasetCount: datasetIds().length,
    },
    signer: bs58.encode(keypair.publicKey),
    signerDev: dev,
    manifestHash: anchorManifestHash(),
    anchors: (anchors.anchors as AnchorRecord[]) ?? [],
    catalog: catalogRows(),
    details: Object.fromEntries(
      datasetIds().map((id) => [id, datasetDetail(id)!])
    ),
  };

  return (
    <Suspense
      fallback={
        <div className="gapp gapp-loading">
          <span className="mono dimmer" style={{ fontSize: 12, letterSpacing: "0.2em" }}>
            LOADING GEOM…
          </span>
        </div>
      }
    >
      <GeomApp data={data} />
    </Suspense>
  );
}
