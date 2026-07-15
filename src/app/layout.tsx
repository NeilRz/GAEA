import type { Metadata } from "next";
import { Archivo, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import Nav from "@/components/Nav";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  weight: ["500", "700", "800"],
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-plex-sans",
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "GAEA — Greenland Arctic Energy Association",
  description:
    "The intelligence layer for digital oil capital markets. Reserves mapping, tokenization tracking, agentic research, and verifiable data attestation.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${archivo.variable} ${plexSans.variable} ${plexMono.variable}`}
      >
        <div className="shell">
          <Nav />
          {children}
          <footer className="footer">
            <span>GAEA — GREENLAND ARCTIC ENERGY ASSOCIATION</span>
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
