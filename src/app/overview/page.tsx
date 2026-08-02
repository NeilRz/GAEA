import type { Metadata } from "next";
import ModuleSelect from "@/components/app/ModuleSelect";

export const metadata: Metadata = {
  title: "The application",
  description:
    "Four surfaces on one dataset spine: oracle, map, terminal, and status.",
  alternates: { canonical: "/overview" },
  openGraph: {
    title: "The application · GEOM",
    description:
      "Four surfaces on one dataset spine: oracle, map, terminal, and status.",
    url: "/overview",
  },
};

export default function OverviewPage() {
  return <ModuleSelect />;
}
