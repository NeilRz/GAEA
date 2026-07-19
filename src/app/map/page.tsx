import type { Metadata } from "next";
import ReserveMap from "@/components/ReserveMap";

export const metadata: Metadata = {
  title: "Physical Layer Map — GEOM",
  description:
    "3D globe of proven oil reserves, supergiant fields, mines, rare-earth deposits, and nuclear assets.",
};

export default function MapPage() {
  return (
    <main className="main wide">
      <ReserveMap />
    </main>
  );
}
