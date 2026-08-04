"use client";

import { useEffect, useRef, useState } from "react";

const STAGES = ["Exploration", "Development", "Production"] as const;
const LISTINGS = [
  "Nasdaq",
  "NYSE / NYSE American",
  "LSE / AIM",
  "TSX / TSX-V",
  "ASX",
  "Other exchange",
  "Private",
] as const;

export default function JoinForm() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string>("");
  const startedAt = useRef<number>(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, startedAt: startedAt.current }),
      });
      if (res.ok) {
        setState("done");
        return;
      }
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Something went wrong. Email hello@geom.org instead.");
      setState("error");
    } catch {
      setError("Network error. Email hello@geom.org instead.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="jf-done">
        <h2 className="h">Application received.</h2>
        <p className="body">
          The Council reviews every application against the public record: your
          registry entries, your filings, and your licences. You will hear from
          hello@geom.org either way.
        </p>
      </div>
    );
  }

  return (
    <form className="jf" onSubmit={onSubmit}>
      <div className="jf-grid">
        <label className="jf-field">
          <span className="jf-l">Company legal name</span>
          <input name="company" required maxLength={200} autoComplete="organization" />
        </label>
        <label className="jf-field">
          <span className="jf-l">Website</span>
          <input name="website" type="url" required maxLength={300} placeholder="https://" inputMode="url" />
        </label>
        <label className="jf-field">
          <span className="jf-l">Jurisdiction of incorporation</span>
          <input name="jurisdiction" required maxLength={120} placeholder="e.g. Delaware, England &amp; Wales" />
        </label>
        <label className="jf-field">
          <span className="jf-l">Listing</span>
          <select name="listing" required defaultValue="">
            <option value="" disabled>
              Select
            </option>
            {LISTINGS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
        <label className="jf-field">
          <span className="jf-l">Ticker (if listed)</span>
          <input name="ticker" maxLength={20} placeholder="e.g. GLND" />
        </label>
        <label className="jf-field">
          <span className="jf-l">Project stage</span>
          <select name="stage" required defaultValue="">
            <option value="" disabled>
              Select
            </option>
            {STAGES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="jf-field">
          <span className="jf-l">Licence country / region</span>
          <input name="licenceRegion" required maxLength={160} placeholder="e.g. East Greenland" />
        </label>
        <label className="jf-field">
          <span className="jf-l">Licence / permit IDs</span>
          <input name="licenceIds" required maxLength={240} placeholder="as issued by the authority" />
        </label>
        <label className="jf-field">
          <span className="jf-l">Commodity</span>
          <input name="commodity" required maxLength={160} placeholder="e.g. oil &amp; gas, Ni-Cu-Co, REE" />
        </label>
        <label className="jf-field">
          <span className="jf-l">Contact name</span>
          <input name="contactName" required maxLength={120} autoComplete="name" />
        </label>
        <label className="jf-field">
          <span className="jf-l">Role</span>
          <input name="contactRole" required maxLength={120} placeholder="e.g. CEO, VP Exploration" />
        </label>
        <label className="jf-field">
          <span className="jf-l">Work email</span>
          <input name="email" type="email" required maxLength={200} autoComplete="email" />
        </label>
        <label className="jf-field jf-wide">
          <span className="jf-l">Anything else (optional)</span>
          <textarea name="message" maxLength={2000} rows={4} />
        </label>
        {/* honeypot: humans never see or fill this */}
        <label className="jf-hp" aria-hidden="true">
          <span>Fax</span>
          <input name="fax" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {state === "error" && <p className="jf-err">{error}</p>}
      <button className="enter jf-submit" type="submit" disabled={state === "sending"}>
        {state === "sending" ? "Submitting…" : "Submit application ↗"}
      </button>
      <p className="jf-note">
        Reviewed by the GEOM Foundation Council. Everything you enter is checked
        against the public record; see the <a href="/privacy">privacy policy</a> for
        how it is handled.
      </p>
    </form>
  );
}
