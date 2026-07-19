/* Display formatting for the terminal. Shared by the ticker strip and the
   chart so a price reads identically in both places. */

/** London lines (80M.L) quote in pence, not pounds — never prefix them with $. */
export function formatPrice(value: number, currency = "USD"): string {
  if (!Number.isFinite(value)) return "—";

  if (currency === "GBp") return `${decimals(value)}p`;
  if (currency === "GBP") return `£${decimals(value)}`;
  if (currency === "EUR") return `€${decimals(value)}`;
  if (currency === "USD") return `$${decimals(value)}`;
  return `${decimals(value)} ${currency}`;
}

/** Sub-dollar crypto needs more places than a $147 equity does. */
function decimals(v: number): string {
  const a = Math.abs(v);
  if (a >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  if (a >= 1) return v.toFixed(2);
  if (a >= 0.01) return v.toFixed(4);
  return v.toFixed(6);
}

export function formatChange(change: number | null, currency = "USD"): string {
  if (change === null || !Number.isFinite(change)) return "—";
  const sign = change > 0 ? "+" : change < 0 ? "−" : "";
  return `${sign}${formatPrice(Math.abs(change), currency)}`;
}

export function formatPct(pct: number | null): string {
  if (pct === null || !Number.isFinite(pct)) return "—";
  const sign = pct > 0 ? "+" : pct < 0 ? "−" : "";
  return `${sign}${Math.abs(pct).toFixed(2)}%`;
}

export function formatVolume(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return "—";
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return String(Math.round(v));
}

/** Epoch seconds → "14 Jul" / "Jul '26" for axis ticks. */
export function formatBarDate(epochSeconds: number, long = false): string {
  const d = new Date(epochSeconds * 1000);
  if (long) {
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export function formatStamp(epochSeconds: number | null): string {
  if (epochSeconds === null) return "—";
  const d = new Date(epochSeconds * 1000);
  return `${d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  })} ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} UTC`;
}

export function changeTone(change: number | null): "up" | "down" | "flat" {
  if (change === null || !Number.isFinite(change) || change === 0) return "flat";
  return change > 0 ? "up" : "down";
}
