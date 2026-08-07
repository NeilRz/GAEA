import type { Metadata } from "next";
import Link from "next/link";
import "@/app/geom-corp.css";

/* The whitepaper reader. Written as JSX rather than an injected HTML string
   like the other corporate pages, because this one is new rather than ported
   from the signed-off static site. It reuses the .geom-corp scope and its
   class vocabulary so it stays pixel-consistent with /news and /investors.
   No client JS: the inline reader is swapped for a download card purely in
   CSS at the mobile breakpoint, because phone browsers render embedded PDFs
   badly (iOS shows page one and refuses to scroll).

   House rule: no em-dashes in brand-facing copy. */

const PDF = "/GEOM-Whitepaper-v3.0.pdf";
const VERSION = "3.0";
const PAGES = 47;

export const metadata: Metadata = {
  title: "Whitepaper",
  description:
    "GEOM Whitepaper v3.0: a verifiable record of the physical resource base, a first-party attestation oracle, and the settlement rails for tokenising oil and minerals.",
  alternates: { canonical: "/whitepaper" },
  openGraph: {
    title: "Whitepaper · GEOM",
    description:
      "A verifiable record, a first-party oracle, and the settlement rails for the tokenisation of physical resource assets.",
    url: "/whitepaper",
    images: [{ url: "/img/whitepaper-cover.webp", width: 978, height: 1265 }],
  },
};

const CONTENTS: Array<{ n: string; title: string; page: number }> = [
  { n: "1", title: "Introduction", page: 5 },
  { n: "2", title: "Greenland: geological and strategic context", page: 8 },
  { n: "3", title: "The association and the founding companies", page: 11 },
  { n: "4", title: "System architecture", page: 15 },
  { n: "5", title: "The oracle", page: 18 },
  { n: "6", title: "The tokenisation engine", page: 24 },
  { n: "7", title: "$GEOM", page: 32 },
  { n: "8", title: "Roadmap", page: 35 },
  { n: "9", title: "Governance", page: 41 },
  { n: "10", title: "Security", page: 41 },
  { n: "11", title: "Regulatory position", page: 43 },
  { n: "12", title: "Risk factors", page: 43 },
  { n: "13", title: "Conclusion", page: 44 },
  { n: "A–C", title: "Appendices and glossary", page: 45 },
];

export default function WhitepaperPage() {
  return (
    <div className="geom-corp">
      <header className="top">
        <div className="wrap">
          <Link className="gc-brand" href="/">
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG brand asset */}
            <img src="/brand/geom-logo-dark.svg" alt="GEOM" />
          </Link>
          <nav className="topnav">
            <Link href="/">Home</Link>
            <Link href="/whitepaper" className="gc-on">
              Whitepaper
            </Link>
            <Link href="/news">News</Link>
            <Link href="/investors">Investors</Link>
            <Link className="enter" href="/#join">
              Join
            </Link>
          </nav>
        </div>
      </header>

      <section className="phead">
        <div className="wrap">
          <p className="gc-eyebrow">Whitepaper · Version {VERSION}</p>
          <h1 className="title">
            The intelligence layer for <em>oil and minerals</em>
          </h1>
          <p className="gc-lede">
            Real-world asset tokenisation has reached treasuries, private credit
            and real estate. It has not reached the ground. Across the 45
            tokenised resource instruments GEOM tracks, tokenised crude oil
            stands at zero and tokenised rare earths stand at zero.
          </p>

          <div className="wp-meta">
            <span>
              <b>Version {VERSION}</b>
              August 2026
            </span>
            <span>
              <b>{PAGES} pages</b>
              13 sections, 3 appendices
            </span>
            <span>
              <b>Authored by</b>
              GEOM Foundation
            </span>
            <span>
              <b>Chain</b>
              Solana
            </span>
          </div>

          <div className="wp-actions">
            <a className="wp-btn wp-btn-primary" href={PDF} download>
              Download PDF
              <span aria-hidden="true">↓</span>
            </a>
            <a
              className="wp-btn"
              href={PDF}
              target="_blank"
              rel="noopener"
            >
              Open in new tab
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </section>

      <section className="blk">
        <div className="wrap">
          <div className="wp-front">
            <a
              className="wp-cover"
              href={PDF}
              target="_blank"
              rel="noopener"
              aria-label={`Open the GEOM whitepaper version ${VERSION} as a PDF`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- pre-rendered cover, fixed intrinsic size */}
              <img
                src="/img/whitepaper-cover.webp"
                alt={`Cover of the GEOM whitepaper version ${VERSION}`}
                width={978}
                height={1265}
              />
            </a>

            <div className="wp-toc">
              <h2 className="h">Contents</h2>
              <p className="body muted">
                Every entry opens the PDF at that page.
              </p>
              <ol className="wp-toc-list">
                {CONTENTS.map((c) => (
                  <li key={`${c.n}-${c.title}`}>
                    <a href={`${PDF}#page=${c.page}`} target="_blank" rel="noopener">
                      <span className="wp-toc-n">{c.n}</span>
                      <span className="wp-toc-t">{c.title}</span>
                      <span className="wp-toc-p">{c.page}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section className="blk wp-readblk">
        <div className="wrap">
          <h2 className="h">Read it here</h2>
          {/* Hidden on phones with the reader itself: it describes viewer
              controls that are not on screen there. */}
          <p className="body muted wp-readsub">
            The full document, inline. Use the viewer controls to search, zoom
            or jump to a page.
          </p>

          {/* An iframe, not an <object>. <object type="application/pdf"> looks
              tidier because it can carry its own fallback children, but Chrome
              declines to embed it and renders the fallback instead; the iframe
              hands off to the PDF plugin correctly in every desktop browser.
              The escape link below stands in for the fallback children, and is
              always shown rather than shown on failure. */}
          <iframe
            className="wp-frame"
            src={`${PDF}#view=FitH`}
            title={`GEOM Whitepaper version ${VERSION}`}
          />
          <p className="wp-escape">
            Not displaying?{" "}
            <a href={PDF} target="_blank" rel="noopener">
              Open the PDF directly ↗
            </a>
          </p>

          <div className="wp-onphone">
            <p className="wp-onphone-t">Best read full screen</p>
            <p className="wp-onphone-d">
              Mobile browsers render embedded PDFs poorly, so the inline reader
              is off on small screens. Open or download the document instead.
            </p>
            <div className="wp-actions">
              <a className="wp-btn wp-btn-primary" href={PDF} target="_blank" rel="noopener">
                Open the whitepaper
                <span aria-hidden="true">↗</span>
              </a>
              <a className="wp-btn" href={PDF} download>
                Download
                <span aria-hidden="true">↓</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="blk">
        <div className="wrap">
          <p className="wp-note">
            This document is published for information. It is not an offer to
            sell or a solicitation to buy any security, token or instrument, it
            is not investment advice, and it does not constitute a binding
            commitment by the Foundation or any member company. Statements
            about future development are subject to the gate conditions stated
            in Section 8 and may not occur. The whitepaper is subject to
            revision. Read the risk factors in Section 12 and consult your own
            professional advisers.
          </p>
        </div>
      </section>

      <footer className="foot">
        <div className="wrap">
          <div className="cols">
            <div>
              <div className="wm">GEOM</div>
            </div>
            <div>
              <h5>Site</h5>
              <Link href="/">Home</Link>
              <Link href="/whitepaper">Whitepaper</Link>
              <Link href="/news">News</Link>
              <Link href="/investors">Investors</Link>
              <Link href="/#structure">Structure</Link>
              <Link href="/#join">Join the association</Link>
            </div>
            <div>
              <h5>Legal</h5>
              <Link href="/privacy">Privacy policy</Link>
              <a href="https://x.com/Geom_Global" target="_blank" rel="noopener">
                X / Twitter
              </a>
            </div>
          </div>
          <div className="base">
            <span>© 2026 Greenland Energy Oil &amp; Minerals Foundation.</span>
            <span>71°N 24°W · RAK ICC Foundation · DIFC-governed · formed 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
