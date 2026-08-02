"use client";

import TerminalV2 from "@/components/terminal/TerminalV2";

/* The terminal module is the v2 workspace, full-bleed inside the app
   shell — no .main gutter, the workspace owns its own chrome. */
export default function TerminalModule() {
  return <TerminalV2 />;
}
