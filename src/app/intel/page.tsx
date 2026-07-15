import type { Metadata } from "next";
import briefs from "@/data/briefs.json";
import { canonicalize, sha256Hex } from "@/lib/attest";

export const metadata: Metadata = {
  title: "Agentic Intel — GAEA",
  description:
    "Agent-generated market briefs and a hash-attested forecast ledger.",
};

export default function IntelPage() {
  const brief = briefs.briefs[0];
  const briefHash = sha256Hex(canonicalize(brief));

  return (
    <main className="main">
      <p className="eyebrow">MOD-03</p>
      <h1 className="page-title">Agentic Intel</h1>
      <p className="page-lede">
        GAEA&apos;s agent stack produces structured briefs and probabilistic
        forecasts. Every published item is canonicalized, hashed, and signed by
        the oracle before release — so the record of what was said, and when,
        is tamper-evident. No recommendations, no price targets: intelligence
        only.
      </p>

      <div
        style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 20 }}
      >
        <article className="brief" style={{ flex: "1 1 480px" }}>
          <div className="brief-meta">
            <span className="badge warn">{brief.classification}</span>
            <span>{brief.date}</span>
            <span>agent: {brief.agent}</span>
          </div>
          <h2>{brief.title}</h2>
          {brief.sections.map((s) => (
            <div key={s.heading}>
              <h3>{s.heading}</h3>
              <p>{s.body}</p>
            </div>
          ))}
          <h3>Attestation</h3>
          <div className="hash">sha256: {briefHash}</div>
        </article>

        <aside style={{ flex: "1 1 340px", minWidth: 0 }}>
          <div className="panel">
            <p className="panel-title">Forecast ledger</p>
            <p className="dim" style={{ fontSize: 13, marginTop: 0 }}>
              Timestamped probabilistic forecasts with immutable hashes.
              Resolution and accuracy scoring are public — agents are
              accountable to their record.
            </p>
            {briefs.forecasts.map((f) => {
              const h = sha256Hex(canonicalize(f));
              return (
                <div
                  key={f.id}
                  style={{
                    borderTop: "1px solid var(--line)",
                    padding: "14px 0",
                  }}
                >
                  <p style={{ margin: "0 0 6px", fontSize: 13 }}>{f.question}</p>
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <span className="badge info">
                      p = {f.probability.toFixed(2)}
                    </span>
                    <span className="badge">{f.status}</span>
                    <span className="dimmer mono" style={{ fontSize: 10 }}>
                      resolves {f.horizon}
                    </span>
                  </div>
                  <div className="hash" style={{ fontSize: 10 }}>
                    {h.slice(0, 40)}…
                  </div>
                </div>
              );
            })}
          </div>
          <div className="provenance">
            {briefs.meta.note}
          </div>
        </aside>
      </div>
    </main>
  );
}
