import type { Metadata } from "next";
import "@/app/geom-corp.css";
import { INVESTORS_HTML } from "@/components/geom/corpHtml";

export const metadata: Metadata = {
  title: "Investors",
  description:
    "How GEOM is structured and funded, and what the Foundation publishes. Information for members and counterparties, not an offering.",
  alternates: { canonical: "/investors" },
  openGraph: {
    title: "Investors · GEOM",
    description:
      "How GEOM is structured and funded, and what the Foundation publishes.",
    url: "/investors",
  },
};

export default function InvestorsPage() {
  return <div className="geom-corp" dangerouslySetInnerHTML={{ __html: INVESTORS_HTML }} />;
}
