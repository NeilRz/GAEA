import type { Metadata } from "next";
import { Instrument_Serif, Space_Mono } from "next/font/google";
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

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument",
  weight: "400",
  style: ["normal", "italic"],
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-space-mono",
  weight: ["400", "700"],
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
        className={`${archivo.variable} ${instrumentSerif.variable} ${spaceMono.variable}`}
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
