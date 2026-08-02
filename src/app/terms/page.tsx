import type { Metadata } from "next";
import "@/app/geom-corp.css";
import { TERMS_HTML } from "@/components/geom/corpHtml";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "The terms that govern use of geom.org, its data services, and its order-routing surface.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Terms of Use · GEOM",
    description:
      "The terms that govern use of geom.org, its data services, and its order-routing surface.",
    url: "/terms",
  },
};

export default function TermsPage() {
  return <div className="geom-corp" dangerouslySetInnerHTML={{ __html: TERMS_HTML }} />;
}
