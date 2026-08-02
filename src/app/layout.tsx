import type { Metadata } from "next";
import { Archivo, Fragment_Mono } from "next/font/google";
import localFont from "next/font/local";
import Nav from "@/components/Nav";
import SiteFooter from "@/components/SiteFooter";
import "./globals.css";

/* Same expanded Archivo file the marketing wordmark uses, so the app
   logotype and the geom.org brandmark are the identical glyphs. */
const archivo = localFont({
  src: "../../public/fonts/archivoexp-700.woff2",
  variable: "--font-archivo",
  weight: "700 900",
  declarations: [{ prop: "font-stretch", value: "125%" }],
});

/* Standard-width Archivo for headings and body — same family as the
   expanded wordmark, so the whole site is cut from one typeface. */
const archivoStd = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo-std",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const fragmentMono = Fragment_Mono({
  subsets: ["latin"],
  variable: "--font-fragment",
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.geom.org"),
  title: {
    default: "GEOM · Greenland Energy, Oil & Minerals",
    template: "%s · GEOM",
  },
  description:
    "The intelligence layer for oil and minerals. GEOM maps the world's energy assets, tracks tokenization, and signs every dataset it publishes on Solana.",
  /* No inherited canonical: each page declares its own (an inherited "/"
     makes every route read as a duplicate of the homepage to crawlers). */
  openGraph: {
    type: "website",
    url: "https://www.geom.org",
    siteName: "GEOM",
    title: "GEOM · Greenland Energy, Oil & Minerals",
    description:
      "The intelligence layer for oil and minerals. One verified record of the world's energy assets, signed at source and anchored on Solana.",
    images: [{ url: "/img/geom-hero-photo.jpg", width: 1200, height: 630, alt: "GEOM — the intelligence layer for oil and minerals" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@geom_org",
    title: "GEOM · Greenland Energy, Oil & Minerals",
    description:
      "The intelligence layer for oil and minerals. One verified record of the world's energy assets, signed at source and anchored on Solana.",
    images: ["/img/geom-hero-photo.jpg"],
  },
};

const ORG_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "GEOM",
  legalName: "Greenland Energy Oil & Minerals Foundation",
  url: "https://www.geom.org",
  logo: "https://www.geom.org/brand/geom-mark.png",
  description:
    "The intelligence layer for oil and minerals. GEOM maps the world's energy assets, tracks tokenization, and cryptographically signs every dataset it publishes.",
  sameAs: ["https://x.com/Geom_Global"],
  email: "hello@geom.org",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${archivo.variable} ${archivoStd.variable} ${fragmentMono.variable}`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSONLD) }}
        />
        <div className="shell">
          <Nav />
          {children}
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
