import type { Metadata } from "next";
import "@/app/geom-corp.css";
import { INVESTORS_HTML } from "@/components/geom/corpHtml";

export const metadata: Metadata = { title: "Investors · GEOM" };

export default function InvestorsPage() {
  return <div className="geom-corp" dangerouslySetInnerHTML={{ __html: INVESTORS_HTML }} />;
}
