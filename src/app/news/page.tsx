import type { Metadata } from "next";
import "@/app/geom-corp.css";
import { NEWS_HTML } from "@/components/geom/corpHtml";

export const metadata: Metadata = { title: "News · GEOM" };

export default function NewsPage() {
  return <div className="geom-corp" dangerouslySetInnerHTML={{ __html: NEWS_HTML }} />;
}
