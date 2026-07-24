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
const TerminalModule = dynamic(() => import("./TerminalModule"), { ssr: false });
const OracleModule = dynamic(() => import("./OracleModule"), { ssr: false });

export type ModuleKey = "overview" | "map" | "terminal" | "oracle";

/* The oracle explorer is the app's landing surface, Pyth-style. */
const DEFAULT_VIEW: ModuleKey = "oracle";

const MODULES: Array<{ key: ModuleKey; code: string; label: string; desc: string }> = [
  { key: "oracle", code: "01", label: "Explore", desc: "attested datasets & tokenization registry" },
  { key: "map", code: "02", label: "Map", desc: "the physical layer, mapped" },
  { key: "terminal", code: "03", label: "Terminal", desc: "market structure, read-only" },
  { key: "overview", code: "04", label: "Status", desc: "attestation proof & developer access" },
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

function parseModule(v: string | null): ModuleKey {
  if (v === "tracker") return "oracle"; // tracker merged into the explorer
  return v && MODULES.some((m) => m.key === v) ? (v as ModuleKey) : DEFAULT_VIEW;
}

export default function GeomApp({ data }: { data: AppData }) {
  const searchParams = useSearchParams();
  const [view, setViewRaw] = useState<ModuleKey>(() =>
    parseModule(searchParams.get("m"))
  );
  const [oracleSel, setOracleSel] = useState<OracleSelection>(() => ({
    dataset: searchParams.get("d"),
  }));
  const [mapFocus, setMapFocus] = useState<MapFocusRequest | null>(null);
  const [mounted, setMounted] = useState<Record<ModuleKey, boolean>>(() => {
    const initial = parseModule(searchParams.get("m"));
    return {
      overview: initial === "overview",
      map: initial === "map",
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
    if (view !== DEFAULT_VIEW) params.set("m", view);
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
                onSelectRecord={(dataset, record) =>
                  setOracleSel({ dataset, record })
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
