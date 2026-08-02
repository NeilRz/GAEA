import type { Metadata } from "next";
import "@/app/geom-corp.css";
import { PRIVACY_HTML } from "@/components/geom/corpHtml";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What GEOM collects when you use the site, what it does not, and who processes it.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy · GEOM",
    description:
      "What GEOM collects when you use the site, what it does not, and who processes it.",
    url: "/privacy",
  },
};

export default function PrivacyPage() {
  return <div className="geom-corp" dangerouslySetInnerHTML={{ __html: PRIVACY_HTML }} />;
}
