import type { Metadata } from "next";
import "@/app/geom-corp.css";
import { TERMS_HTML } from "@/components/geom/corpHtml";

export const metadata: Metadata = { title: "Terms of Use · GEOM" };

export default function TermsPage() {
  return <div className="geom-corp" dangerouslySetInnerHTML={{ __html: TERMS_HTML }} />;
}
