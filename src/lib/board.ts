/* The terminal's instrument board.
   Plain module (no "use client") so both the server page and the client
   components can import it, a const array exported from a "use client"
   module is not consumable server-side. */

export interface Instrument {
  /** Yahoo symbol used for the OHLC request */
  symbol: string;
  /** How it reads on screen */
  label: string;
  /** Venue, for the second line */
  venue: string;
  /** Why it is on our board, one clause, factual, no view */
  note: string;
}

export interface BoardGroup {
  id: string;
  title: string;
  blurb: string;
  instruments: Instrument[];
}

export const BOARD: BoardGroup[] = [
  {
    id: "partners",
    title: "Partners",
    blurb:
      "Listed vehicles behind the Greenland licence positions we track. Prices are the market's, not ours.",
    instruments: [
      {
        symbol: "80M.L",
        label: "80M",
        venue: "LSE AIM",
        note: "80 Mile plc, operator at Disko-Nuussuaq, West Greenland; USFM funding a US$30m earn-in. Quoted in pence.",
      },
      {
        symbol: "GLND",
        label: "GLND",
        venue: "Nasdaq GM",
        note: "Greenland Energy, Jameson Land Basin, East Greenland; drilling programme planned October 2026.",
      },
    ],
  },
  {
    id: "tokenized",
    title: "Tokenized real-world assets",
    blurb:
      "The on-chain wrappers for commodity and treasury exposure, the market our oracle attests into.",
    instruments: [
      {
        symbol: "ONDO-USD",
        label: "ONDO",
        venue: "Crypto",
        note: "Ondo Finance, tokenized treasuries and equities; USOon wraps the United States Oil Fund.",
      },
      {
        symbol: "PAXG-USD",
        label: "PAXG",
        venue: "Crypto",
        note: "Paxos Gold, one token, one allocated troy ounce. Half of the tokenized-commodity float.",
      },
      {
        symbol: "XAUT-USD",
        label: "XAUT",
        venue: "Crypto",
        note: "Tether Gold, the other half. Together with PAXG, roughly three-quarters of tokenized commodities.",
      },
    ],
  },
  {
    id: "energy",
    title: "Energy",
    blurb: "The producers and the service layer, the equity side of the barrel.",
    instruments: [
      { symbol: "XOM", label: "XOM", venue: "NYSE", note: "ExxonMobil, integrated major." },
      { symbol: "CVX", label: "CVX", venue: "NYSE", note: "Chevron, integrated major." },
      { symbol: "OXY", label: "OXY", venue: "NYSE", note: "Occidental, Permian-weighted independent." },
      { symbol: "SLB", label: "SLB", venue: "NYSE", note: "SLB, oilfield services, a lead indicator on activity." },
    ],
  },
  {
    id: "minerals",
    title: "Minerals & rare earths",
    blurb:
      "The critical-minerals complex the tracker expanded into, the same supply story as Disko-Nuussuaq.",
    instruments: [
      { symbol: "MP", label: "MP", venue: "NYSE", note: "MP Materials, Mountain Pass, the US rare-earth position." },
      { symbol: "FCX", label: "FCX", venue: "NYSE", note: "Freeport-McMoRan, copper, the electrification bellwether." },
      { symbol: "ALB", label: "ALB", venue: "NYSE", note: "Albemarle, lithium." },
    ],
  },
  {
    id: "benchmarks",
    title: "Benchmarks",
    blurb: "The underlying. Everything above is a claim on one of these.",
    instruments: [
      { symbol: "CL=F", label: "WTI", venue: "NYMEX", note: "WTI crude, front month." },
      { symbol: "BZ=F", label: "Brent", venue: "ICE", note: "Brent crude, front month." },
      { symbol: "GC=F", label: "Gold", venue: "COMEX", note: "Gold, front month, the settlement reference for PAXG and XAUT." },
    ],
  },
];

export const ALL_INSTRUMENTS: Instrument[] = BOARD.flatMap((g) => g.instruments);

export function findInstrument(symbol: string): Instrument | undefined {
  return ALL_INSTRUMENTS.find((i) => i.symbol === symbol);
}

/** Default selection when the terminal opens, our own partner cluster. */
export const DEFAULT_SYMBOL = "80M.L";

export interface RangeOption {
  id: string;
  label: string;
  range: string;
  interval: string;
}

export const RANGES: RangeOption[] = [
  { id: "1m", label: "1M", range: "1mo", interval: "1d" },
  { id: "3m", label: "3M", range: "3mo", interval: "1d" },
  { id: "6m", label: "6M", range: "6mo", interval: "1d" },
  { id: "1y", label: "1Y", range: "1y", interval: "1d" },
  { id: "5y", label: "5Y", range: "5y", interval: "1wk" },
];

export const DEFAULT_RANGE = "6m";

/* ── $GEOM ────────────────────────────────────────────────────────────
   Not listed. No contract address, no pool, no market. The tile below
   states that plainly rather than drawing a price that does not exist.
   When the mint is live: set CONTRACT_ADDRESS and the tile flips to a
   Jupiter route automatically. */
export const GEOM_TOKEN = {
  symbol: "GEOM",
  name: "GEOM",
  /** Solana mint. Empty until launch, do not fill with a placeholder. */
  contractAddress: "",
  /** Jupiter builds the swap route from the mint once it exists. */
  jupiterUrl(mint: string) {
    return `https://jup.ag/swap/SOL-${mint}`;
  },
} as const;

export const GEOM_IS_TRADEABLE = GEOM_TOKEN.contractAddress.length > 0;
