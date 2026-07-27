"use client";

import { useState } from "react";

export default function CopyChip({ value, label = "COPY" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable, ignore */
    }
  };
  return (
    <button className="dl-chip" onClick={copy}>
      {copied ? "COPIED ✓" : label}
    </button>
  );
}
