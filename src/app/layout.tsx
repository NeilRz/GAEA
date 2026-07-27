import type { Metadata } from "next";
import { Archivo, Fragment_Mono } from "next/font/google";
import localFont from "next/font/local";
import Nav from "@/components/Nav";
import SiteFooter from "@/components/SiteFooter";
import "./globals.css";
/* Mini country flags (fi fi-xx spans) used by the oracle record panels,
   explorer rows, and the map popups. Self-hosted SVGs — emoji flags
   don't render on Windows. */
import "flag-icons/css/flag-icons.min.css";

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
  title: "GEOM · Real assets from the far north",
  description:
    "GEOM turns scattered energy data into one live map: reserves, tokenization tracking, agentic research, and verifiable data attestation.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${archivo.variable} ${archivoStd.variable} ${fragmentMono.variable}`}
      >
        <div className="shell">
          <Nav />
          {children}
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
