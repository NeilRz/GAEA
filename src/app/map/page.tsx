import type { Metadata } from "next";
import ReserveMap from "@/components/ReserveMap";

export const metadata: Metadata = {
  title: "Reserve Map — GAEA",
  description:
    "Interactive map of proven oil reserves, major fields, and Arctic energy assets.",
};

export default function MapPage() {
  return (
    <main className="main wide">
      <ReserveMap />
    </main>
  );
}
