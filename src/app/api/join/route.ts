import { NextResponse } from "next/server";

export const runtime = "nodejs";

const REQUIRED = [
  "company",
  "website",
  "jurisdiction",
  "listing",
  "stage",
  "licenceRegion",
  "licenceIds",
  "commodity",
  "contactName",
  "contactRole",
  "email",
] as const;

const MAX = 2000;
const TO = process.env.JOIN_TO || "hello@geom.org";
const FROM = process.env.JOIN_FROM || "GEOM applications <applications@geom.org>";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: bots fill every field. Humans never see this one.
  if (typeof body.fax === "string" && body.fax.trim() !== "") {
    // Pretend success so the bot moves on.
    return NextResponse.json({ ok: true });
  }

  // Time trap: a human takes more than five seconds on a twelve-field form.
  const startedAt = Number(body.startedAt);
  if (!Number.isFinite(startedAt) || Date.now() - startedAt < 5000) {
    return NextResponse.json({ error: "Please review the form and try again." }, { status: 400 });
  }

  const fields: Record<string, string> = {};
  for (const key of [...REQUIRED, "ticker", "message"]) {
    const v = body[key];
    fields[key] = typeof v === "string" ? v.trim().slice(0, MAX) : "";
  }
  for (const key of REQUIRED) {
    if (!fields[key]) {
      return NextResponse.json({ error: "Please fill in every required field." }, { status: 400 });
    }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(fields.email)) {
    return NextResponse.json({ error: "That email address does not look valid." }, { status: 400 });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Applications are briefly offline. Email hello@geom.org instead." },
      { status: 503 },
    );
  }

  const rows = [
    ["Company", fields.company],
    ["Website", fields.website],
    ["Jurisdiction", fields.jurisdiction],
    ["Listing", fields.listing + (fields.ticker ? ` (${fields.ticker})` : "")],
    ["Project stage", fields.stage],
    ["Licence region", fields.licenceRegion],
    ["Licence IDs", fields.licenceIds],
    ["Commodity", fields.commodity],
    ["Contact", `${fields.contactName} — ${fields.contactRole}`],
    ["Email", fields.email],
    ["Message", fields.message || "—"],
  ];

  const html =
    `<h2>Membership application: ${esc(fields.company)}</h2><table cellpadding="6">` +
    rows
      .map(
        ([k, v]) =>
          `<tr><td style="color:#5b6b75;white-space:nowrap"><b>${esc(k)}</b></td><td>${esc(v)}</td></tr>`,
      )
      .join("") +
    `</table><p style="color:#5b6b75">Vetting: verify the licence IDs against the issuing registry, the listing against the exchange, the email domain against the website, and run a sanctions screen before it reaches Council.</p>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: [TO],
      reply_to: fields.email,
      subject: `[GEOM application] ${fields.company} — ${fields.commodity}`,
      html,
    }),
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Could not submit right now. Email hello@geom.org instead." },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true });
}
