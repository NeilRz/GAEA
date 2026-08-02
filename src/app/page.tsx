import type { Metadata } from "next";
import GeomLanding from "@/components/geom/GeomLanding";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return <GeomLanding />;
}
