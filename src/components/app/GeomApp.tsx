"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import type { CatalogRow, DatasetDetail } from "@/lib/oracle-catalog";

/* The single GEOM application shell, Pyth-Terminal-shaped: persistent left
   sidebar, one content surface, modules mounted lazily on first visit and
   kept alive afterwards (display: none), so the globe, the terminal board
   and the oracle keep their state while you switch. Cross-module links run
   through the shell: the map raises `geom:open-oracle` window events, the
   oracle asks the shell to focus the map. */

const OverviewModule = dynamic(() => import("./OverviewModule"), { ssr: false });
const MapModule = dynamic(() => import("./MapModule"), { ssr: false });
const TrackerModule = dynamic(() => import("./TrackerModule"), { ssr: false });
const TerminalModule = dynamic(() => import("./TerminalModule"), { ssr: false });
const OracleModule = dynamic(() => import("./OracleModule"), { ssr: false });

export type ModuleKey = "overview" | "map" | "tracker" | "terminal" | "oracle";

const MODULES: Array<{ key: ModuleKey; code: string; label: string; desc: string }> = [
  { key: "overview", code: "00", label: "Overview", desc: "attested datasets at a glance" },
  { key: "map", code: "01", label: "Map", desc: "the physical layer, mapped" },
  { key: "tracker", code: "02", label: "Tracker", desc: "tokenized resource registry" },
  { key: "terminal", code: "03", label: "Terminal", desc: "market structure, read-only" },
  { key: "oracle", code: "04", label: "Oracle", desc: "signed, Solana-anchored data" },
];

export interface AnchorRecord {
  anchoredAt: string;
  cluster: string;
  slot: number | null;
  signature: string;
  signer: string;
  memo: string;
  manifestSha256: string;
}

export interface OverviewStats {
  totalReserves: number;
  reserveCountries: number;
  fieldCount: number;
  arcticCount: number;
  tokenizedCount: number;
  datasetCount: number;
}

export interface AppData {
  stats: OverviewStats;
  signer: string;
  signerDev: boolean;
  manifestHash: string;
  anchors: AnchorRecord[];
  catalog: CatalogRow[];
  details: Record<string, DatasetDetail>;
}

export interface OracleSelection {
  dataset: string | null;
  record?: Record<string, unknown>;
  lngLat?: [number, number];
}

export interface MapFocusRequest {
  token: number;
  lngLat: [number, number];
  zoom: number;
  props?: Record<string, unknown>;
}

interface AppNavApi {
  open: (m: ModuleKey) => void;
  openDataset: (id: string) => void;
}

const AppNavContext = createContext<AppNavApi>({
  open: () => {},
  openDataset: () => {},
});

export function useAppNav(): AppNavApi {
  return useContext(AppNavContext);
}

function isModuleKey(v: string | null): v is ModuleKey {
  return !!v && MODULES.some((m) => m.key === v);
}

export default function GeomApp({ data }: { data: AppData }) {
  const searchParams = useSearchParams();
  const [view, setViewRaw] = useState<ModuleKey>(() => {
    const m = searchParams.get("m");
    return isModuleKey(m) ? m : "overview";
  });
  const [oracleSel, setOracleSel] = useState<OracleSelection>(() => ({
    dataset: searchParams.get("d"),
  }));
  const [mapFocus, setMapFocus] = useState<MapFocusRequest | null>(null);
  const [mounted, setMounted] = useState<Record<ModuleKey, boolean>>(() => {
    const m = searchParams.get("m");
    const initial = isModuleKey(m) ? m : "overview";
    return {
      overview: initial === "overview",
      map: initial === "map",
      tracker: initial === "tracker",
      terminal: initial === "terminal",
      oracle: initial === "oracle",
    };
  });
  const focusToken = useRef(0);

  const setView = useCallback((m: ModuleKey) => {
    setViewRaw(m);
    setMounted((prev) => (prev[m] ? prev : { ...prev, [m]: true }));
  }, []);

  // MapLibre only tracks window resizes; poke it when the map view returns
  // from display:none so the canvas re-measures its container.
  useEffect(() => {
    if (view === "map") {
      requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    }
  }, [view]);

  // Deep-linkable URL without triggering a server navigation.
  useEffect(() => {
    const params = new URLSearchParams();
    if (view !== "overview") params.set("m", view);
    if (view === "oracle" && oracleSel.dataset) params.set("d", oracleSel.dataset);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `/app?${qs}` : "/app");
  }, [view, oracleSel.dataset]);

  // The map's popups are plain DOM, they talk to the shell via window events.
  useEffect(() => {
    const onOpenOracle = (e: Event) => {
      const det = (e as CustomEvent).detail as {
        dataset: string;
        record?: Record<string, unknown>;
        lngLat?: [number, number];
      };
      if (!det?.dataset) return;
      setOracleSel({ dataset: det.dataset, record: det.record, lngLat: det.lngLat });
      setView("oracle");
    };
    window.addEventListener("geom:open-oracle", onOpenOracle);
    return () => window.removeEventListener("geom:open-oracle", onOpenOracle);
  }, [setView]);

  const open = useCallback((m: ModuleKey) => setView(m), [setView]);
  const openDataset = useCallback(
    (id: string) => {
      setOracleSel({ dataset: id });
      setView("oracle");
    },
    [setView]
  );

  const showOnMap = useCallback(
    (lngLat: [number, number], props?: Record<string, unknown>, zoom = 6.5) => {
      focusToken.current += 1;
      setMapFocus({ token: focusToken.current, lngLat, zoom, props });
      setView("map");
    },
    [setView]
  );

  const anchorIsCurrent =
    data.anchors[0]?.manifestSha256 === data.manifestHash;
  const activeModule = MODULES.find((m) => m.key === view)!;

  return (
    <AppNavContext.Provider value={{ open, openDataset }}>
      <div className="gapp">
        <aside className="gapp-side">
          <Link href="/" className="gapp-brand" title="geom.org">
            <span className="brand-mark">GEOM</span>
          </Link>
          <nav className="gapp-nav" aria-label="Modules">
            {MODULES.map((m) => (
              <button
                key={m.key}
                className={`gapp-navbtn ${view === m.key ? "on" : ""}`}
                onClick={() => setView(m.key)}
                aria-current={view === m.key ? "page" : undefined}
              >
                <span className="gapp-navcode">{m.code}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </nav>
          <div className="gapp-side-foot">
            <Link className="gapp-side-link" href="/">
              geom.org →
            </Link>
            <span className="gapp-side-note">
              Informational only, not investment advice
            </span>
          </div>
        </aside>

        <div className="gapp-main">
          <div className="gapp-top">
            <span className="t-code">MOD-{activeModule.code}</span>
            <span className="t-title">{activeModule.label}</span>
            <span className="t-desc">{activeModule.desc}</span>
            <span className="t-right">
              <span className={`badge ${anchorIsCurrent ? "good" : "warn"}`}>
                {anchorIsCurrent ? "anchor current" : "anchor stale"}
              </span>
              <a
                className="dl-chip"
                style={{ textDecoration: "none" }}
                href="mailto:request@geom.org?subject=GEOM%20Oracle%20API%20access%20request"
              >
                API ACCESS →
              </a>
            </span>
          </div>
          <div className="gapp-views">
          {mounted.overview && (
            <div className="gapp-view" style={{ display: view === "overview" ? undefined : "none" }}>
              <OverviewModule data={data} />
            </div>
          )}
          {mounted.map && (
            <div className="gapp-view gapp-view-map" style={{ display: view === "map" ? undefined : "none" }}>
              <MapModule focusRequest={mapFocus} />
            </div>
          )}
          {mounted.tracker && (
            <div className="gapp-view" style={{ display: view === "tracker" ? undefined : "none" }}>
              <TrackerModule signer={data.signer} />
            </div>
          )}
          {mounted.terminal && (
            <div className="gapp-view" style={{ display: view === "terminal" ? undefined : "none" }}>
              <TerminalModule />
            </div>
          )}
          {mounted.oracle && (
            <div className="gapp-view" style={{ display: view === "oracle" ? undefined : "none" }}>
              <OracleModule
                data={data}
                selection={oracleSel}
                onSelect={(dataset) =>
                  setOracleSel((prev) =>
                    prev.dataset === dataset ? { ...prev, dataset } : { dataset }
                  )
                }
                onShowMap={showOnMap}
              />
            </div>
          )}
          </div>
        </div>
      </div>
    </AppNavContext.Provider>
  );
}
