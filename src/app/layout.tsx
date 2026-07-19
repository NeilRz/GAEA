import type { Metadata } from "next";
import { Archivo, Instrument_Serif, Space_Mono } from "next/font/google";
import Nav from "@/components/Nav";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  weight: ["500", "700", "800"],
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
  title: "GEOM — Real assets from the far north",
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
          <footer className="footer">
            <span>GEOM — REAL ASSETS FROM THE FAR NORTH</span>
            <span>INTELLIGENCE LAYER · V1 PROTOTYPE</span>
            <span style={{ marginLeft: "auto" }}>
              DATA IS INFORMATIONAL ONLY — NOT INVESTMENT ADVICE
            </span>
          </footer>
        </div>
      </body>
    </html>
  );
}
