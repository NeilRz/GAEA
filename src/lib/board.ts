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
  /** Board indicator: "live" = tradeable now through a verified route,
      "planned" = tokenization/route expected but not live yet. Omitted for
      instruments where neither applies (plain listed equities, futures). */
  status?: "live" | "planned";
  /** Verified on-chain contract — enables the swap route in the terminal.
      Only set for tokens whose address was checked against the issuer's
      own documentation AND that have a real public pool. Trades execute
      on the external venue in the user's own wallet; GEOM routes, never
      holds or executes. */
  token?: {
    chain: "ethereum";
    /** Canonical contract address, checksum-cased, source-verified. */
    address: string;
    /** Where the address was verified (shown to the user). */
    verifiedVia: string;
    /** External swap venue, prefilled with the output token. */
    tradeUrl: string;
    tradeVenue: string;
  };
}

/** Uniswap works with both MetaMask and Phantom (EVM) injected wallets. */
const uniswap = (address: string) =>
  `https://app.uniswap.org/swap?outputCurrency=${address}&chain=mainnet`;

export interface BoardGroup {
  id: string;
  title: string;
  blurb: string;
  /** Visual accent for the group in the terminal rail. */
  accent?: "gold";
  instruments: Instrument[];
}

export const BOARD: BoardGroup[] = [
  {
    id: "partners",
    title: "Partners",
    accent: "gold",
    blurb:
      "Listed GEOM Foundation members behind the Greenland licence positions we track. GEOM has an association relationship with these issuers and receives no compensation for their inclusion. Prices are the market's, not ours.",
    instruments: [
      {
        // The combined company is USFM; the exchange line still prints as
        // VEEE until the ticker change completes, so the quote request
        // stays on VEEE while the board already reads USFM.
        symbol: "VEEE",
        label: "USFM",
        venue: "Nasdaq CM",
        note: "US Fuels & Minerals (Twin Vee combination), funding the US$30m Disko-Nuussuaq earn-in. Quote line still prints as VEEE until the ticker change completes.",
      },
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
    title: "Tokenized RWA",
    blurb:
      "The on-chain wrappers for commodity and treasury exposure, the market our oracle attests into. Tokens with a verified contract and a public pool carry a swap route.",
    instruments: [
      {
        symbol: "ONDO-USD",
        label: "ONDO",
        venue: "Crypto",
        note: "Ondo Finance, tokenized treasuries and equities; USOon wraps the United States Oil Fund.",
        status: "live",
        token: {
          chain: "ethereum",
          address: "0xfAbA6f8e4a5E8Ab82F62fe7C39859FA577269BE3",
          verifiedVia: "Ondo Foundation docs · Etherscan",
          tradeUrl: uniswap("0xfAbA6f8e4a5E8Ab82F62fe7C39859FA577269BE3"),
          tradeVenue: "Uniswap",
        },
      },
      {
        symbol: "PAXG-USD",
        label: "PAXG",
        venue: "Crypto",
        note: "Paxos Gold, one token, one allocated troy ounce. Half of the tokenized-commodity float.",
        status: "live",
        token: {
          chain: "ethereum",
          address: "0x45804880De22913dAFE09f4980848ECE6EcbAf78",
          verifiedVia: "paxosglobal GitHub · Etherscan",
          tradeUrl: uniswap("0x45804880De22913dAFE09f4980848ECE6EcbAf78"),
          tradeVenue: "Uniswap",
        },
      },
      {
        symbol: "XAUT-USD",
        label: "XAUT",
        venue: "Crypto",
        note: "Tether Gold, the other half. Together with PAXG, roughly three-quarters of tokenized commodities.",
        status: "live",
        token: {
          chain: "ethereum",
          address: "0x68749665FF8D2d112Fa859AA293F07A622782F38",
          verifiedVia: "Tether transparency page · Etherscan (post-upgrade contract)",
          tradeUrl: uniswap("0x68749665FF8D2d112Fa859AA293F07A622782F38"),
          tradeVenue: "Uniswap",
        },
      },
      {
        symbol: "VNXAU-USD",
        label: "VNXAU",
        venue: "Crypto",
        note: "VNX Gold, one token, one gram of LBMA gold. No verified public pool — no swap route shown.",
        status: "planned",
      },
      {
        symbol: "CGO-USD",
        label: "CGO",
        venue: "Crypto",
        note: "Comtech Gold, gram-denominated gold on XDC. No verified public pool — no swap route shown.",
        status: "planned",
      },
      {
        symbol: "KAG-USD",
        label: "KAG",
        venue: "Crypto",
        note: "Kinesis Silver, one token, one troy ounce; trades on the Kinesis exchange, not on public DEXs.",
        status: "planned",
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
    blurb: "The underlying commodities the rest of the board prices against.",
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
