import type { Metadata } from "next";
import "@/app/geom-corp.css";
import { PRIVACY_HTML } from "@/components/geom/corpHtml";

export const metadata: Metadata = { title: "Privacy · GEOM" };

export default function PrivacyPage() {
  return <div className="geom-corp" dangerouslySetInnerHTML={{ __html: PRIVACY_HTML }} />;
}
