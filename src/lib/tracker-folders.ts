/** Library folders for the tokenization tracker, in display order.
 *  Shared by the server page (boot log, tiles, shelves) and the client
 *  catalog, must stay a plain module (no "use client") so both sides
 *  get the real array. */

export interface LibraryRow {
  key: string;
  symbol: string;
  name: string;
  issuer: string;
  underlying: string;
  chains: string;
  folder: string;
  status: { cls: string; label: string };
  note: string;
}

export const FOLDERS: Array<{ id: string; desc: string }> = [
  {
    id: "oil-backed",
    desc: "Oil-linked tokens and their defunct precedents. The primary whitespace: no verifiable crude instrument at institutional scale.",
  },
  {
    id: "commodity-gold",
    desc: "The proven template, allocated-gold tokens are the largest live tokenized commodity class, with its own defunct cautionary tales.",
  },
  {
    id: "precious-metals",
    desc: "Silver runs far thinner than gold; platinum-group metals have no credible tokenized instrument at all.",
  },
  {
    id: "uranium",
    desc: "Physical U3O8 tokenization, the closest live analog to what a tokenized resource with real custody must look like.",
  },
  {
    id: "base-metals",
    desc: "Copper and nickel: LME-scale physical markets, zero verified tokenization.",
  },
  {
    id: "battery-metals",
    desc: "Lithium, cobalt, graphite, strategic demand, provenance pilots only, no asset-backed token.",
  },
  {
    id: "rare-earths",
    desc: "NdPr, dysprosium, terbium. No tokenized instrument exists at any scale, the second whitespace GEOM tracks.",
  },
  {
    id: "tokenized-equity",
    desc: "Equity wrapper programs exist, but oil, mining, and REE coverage is thin and unverified.",
  },
  {
    id: "context-rwa",
    desc: "Institutional RWA rails proven for treasuries and funds, context for what resource assets still lack.",
  },
  {
    id: "watchlist-oil-equity",
    desc: "Oil & gas majors watched for a verified tokenization event.",
  },
  {
    id: "watchlist-mining-equity",
    desc: "Mining, REE, uranium, and battery-metal majors watched for a verified tokenization event.",
  },
];
