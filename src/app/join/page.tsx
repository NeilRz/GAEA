import type { Metadata } from "next";
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
          <a className="gc-brand" href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/geom-logo-dark.svg" alt="GEOM" />
          </a>
          <nav className="topnav">
            <a href="/">Home</a>
            <a href="/news">News</a>
            <a href="/investors">Investors</a>
            <a href="/#structure">Structure</a>
            <a className="enter gc-on" href="/join">
              Join
            </a>
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
              <a href="/">Home</a>
              <a href="/news">News</a>
              <a href="/investors">Investors</a>
              <a href="/#structure">Structure</a>
              <a href="/join">Join the association</a>
            </div>
            <div>
              <h5>Legal</h5>
              <a href="/privacy">Privacy policy</a>
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
