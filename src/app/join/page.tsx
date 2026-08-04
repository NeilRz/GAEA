import type { Metadata } from "next";
import Link from "next/link";
import "@/app/geom-corp.css";
import JoinForm from "@/components/geom/JoinForm";

export const metadata: Metadata = {
  title: "Join the association",
  description:
    "Apply to join the GEOM association. Operators with real ground and real data, admitted by Council approval.",
  alternates: { canonical: "/join" },
  openGraph: {
    title: "Join the association · GEOM",
    description:
      "Apply to join the GEOM association. Operators with real ground and real data, admitted by Council approval.",
    url: "/join",
  },
};

export default function JoinPage() {
  return (
    <div className="geom-corp">
      <header className="top">
        <div className="wrap">
          <Link className="gc-brand" href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/geom-logo-dark.svg" alt="GEOM" />
          </Link>
          <nav className="topnav">
            <Link href="/">Home</Link>
            <Link href="/news">News</Link>
            <Link href="/investors">Investors</Link>
            <Link href="/#structure">Structure</Link>
            <Link className="enter gc-on" href="/join">
              Join
            </Link>
          </nav>
        </div>
      </header>

      <main className="wrap">
        <div className="phead">
          <h1 className="title">
            Join the <em>association.</em>
          </h1>
          <p className="gc-lede">
            Operators with real ground and real data can apply to join. Members get
            their reserves, production and survey data signed, timestamped, and
            surfaced on a map anyone can read. Admission is by Council approval, and
            every application is checked against the public record.
          </p>
        </div>

        <section className="blk">
          <JoinForm />
        </section>
      </main>

      <footer className="foot">
        <div className="wrap">
          <div className="cols">
            <div>
              <div className="wm">GEOM</div>
            </div>
            <div>
              <h5>Site</h5>
              <Link href="/">Home</Link>
              <Link href="/news">News</Link>
              <Link href="/investors">Investors</Link>
              <Link href="/#structure">Structure</Link>
              <Link href="/join">Join the association</Link>
            </div>
            <div>
              <h5>Legal</h5>
              <Link href="/privacy">Privacy policy</Link>
              <a href="https://x.com/Geom_Global" target="_blank" rel="noopener noreferrer">
                X / Twitter
              </a>
            </div>
          </div>
          <div className="base">
            <span>© 2026 Greenland Energy Oil & Minerals Foundation.</span>
            <span>71°N 24°W · RAK ICC Foundation · DIFC-governed · formed 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
