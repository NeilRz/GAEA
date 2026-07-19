"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { Map as MLMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import reserves from "@/data/reserves.json";
import fields from "@/data/fields.json";
import sites from "@/data/sites.json";
import pipelines from "@/data/pipelines.json";
import {
  SATELLITE_TILE_URL,
  SATELLITE_ATTRIBUTION,
  SATELLITE_TILE_SIZE,
  SATELLITE_MAX_ZOOM,
  DARK_SATELLITE_PAINT,
  ATMOSPHERE,
  BOUNDARY_STYLE,
} from "@/lib/map-config";
import { registerMapIcons } from "@/lib/map-icons";

const GROUPS = {
  oilgas: { color: "#e8a33d", label: "Oil & gas fields", hint: "droplet · supergiants, shale, LNG" },
  pipelines: { color: "#c67c1b", label: "Trunk pipelines", hint: "approximate routes" },
  base: { color: "#b26a4e", label: "Base & industrial metals", hint: "hammer · copper, iron, zinc" },
  precious: { color: "#cbc3b1", label: "Precious metals", hint: "diamond · gold, silver, PGM" },
  battery: { color: "#2ba57e", label: "Battery metals", hint: "bolt · lithium, nickel, cobalt" },
  ree: { color: "#8a75e8", label: "Rare earths", hint: "crystal · NdPr, heavy REE" },
  nuclear: { color: "#8fb4c9", label: "Nuclear", hint: "atom = plant · trefoil = U mine" },
  plants: { color: "#5fd4ae", label: "Power plants (34,936)", hint: "typed clusters by fuel · WRI GPPD" },
  reserves: { color: "#5e8ba6", label: "Proven oil reserves", hint: "circle area = billion bbl" },
  arctic: { color: "#6fd4c3", label: "Arctic highlight", hint: "assets above 66°33′N" },
} as const;

type GroupKey = keyof typeof GROUPS;

/** Typed power-plant groups — each gets its own clustered source so its
 *  clusters carry the category's icon and color instead of a generic
 *  number circle. */
const PLANT_GROUPS = [
  { id: "fossil", icon: "i-fossil", color: "#c67c1b", label: "Fossil" },
  { id: "renewable", icon: "i-renewable", color: "#2ba57e", label: "Renewables" },
  { id: "hydro", icon: "i-hydro", color: "#3e90cb", label: "Hydro" },
  { id: "nuclear", icon: "i-nuclear-fuel", color: "#8fb4c9", label: "Nuclear" },
  { id: "other", icon: "i-other", color: "#7e97a6", label: "Other" },
] as const;

const CURATED_ICON: Record<string, string | unknown[]> = {
  oilgas: "i-oilgas",
  base: "i-base",
  precious: "i-precious",
  battery: "i-battery",
  ree: "i-ree",
  nuclear: ["case", ["==", ["get", "kind"], "plant"], "i-nuclear-plant", "i-uranium"],
};

const FUEL_GROUP: Record<string, string> = {
  Coal: "fossil", Gas: "fossil", Oil: "fossil", Petcoke: "fossil", Cogeneration: "fossil",
  Hydro: "hydro",
  Nuclear: "nuclear",
  Solar: "renewable", Wind: "renewable", Geothermal: "renewable", Biomass: "renewable",
  Waste: "renewable", "Wave and Tidal": "renewable",
  Storage: "other", Other: "other",
};

const FUEL_CHIPS = [
  { id: "all", label: "All" },
  ...PLANT_GROUPS.filter((g) => g.id !== "other").map((g) => ({ id: g.id, label: g.label })),
];

const SPOTLIGHT: Array<{ name: string; sub: string; lngLat: [number, number]; zoom: number }> = [
  { name: "Ghawar", sub: "world's largest oil field", lngLat: [49.62, 25.43], zoom: 6 },
  { name: "North Field / South Pars", sub: "world's largest gas field", lngLat: [52.2, 26.4], zoom: 6 },
  { name: "Permian Basin", sub: "~6 Mb/d shale engine", lngLat: [-102.4, 31.8], zoom: 5.5 },
  { name: "Escondida", sub: "#1 copper mine", lngLat: [-69.07, -24.27], zoom: 7 },
  { name: "Carajás (Serra Norte)", sub: "#1 iron ore mine", lngLat: [-50.17, -6.06], zoom: 7 },
  { name: "Greenbushes", sub: "#1 lithium mine", lngLat: [116.06, -33.85], zoom: 7 },
  { name: "Bayan Obo", sub: "~half of global rare earths", lngLat: [109.97, 41.77], zoom: 6.5 },
  { name: "Tanbreez (Kringlerne)", sub: "Greenland heavy-REE flagship", lngLat: [-45.83, 60.88], zoom: 6.5 },
  { name: "Cigar Lake", sub: "highest-grade uranium", lngLat: [-104.54, 58.07], zoom: 6 },
  { name: "Kashiwazaki-Kariwa", sub: "largest nuclear plant", lngLat: [138.6, 37.43], zoom: 7 },
  { name: "Norilsk", sub: "Arctic nickel-palladium", lngLat: [88.2, 69.35], zoom: 5.5 },
  { name: "Red Dog", sub: "Arctic zinc #1", lngLat: [-162.87, 68.07], zoom: 5.5 },
];

const STATUS_COLOR: Record<string, string> = {
  producing: "#2ba57e", operating: "#2ba57e",
  development: "#8fb4c9", construction: "#8fb4c9", "restart-pending": "#8fb4c9",
  constrained: "#c4a469", declining: "#c4a469", moratorium: "#c4a469", dormant: "#c4a469",
  blocked: "#cc4a57", inactive: "#cc4a57", defunct: "#cc4a57",
};

function fc(features: GeoJSON.Feature[]): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features };
}

function point(lng: number, lat: number, properties: Record<string, unknown>): GeoJSON.Feature {
  return { type: "Feature", geometry: { type: "Point", coordinates: [lng, lat] }, properties };
}

function fieldFeatures(): GeoJSON.Feature[] {
  return fields.fields.map((f) =>
    point(f.lng, f.lat, {
      name: f.name, country: f.country, commodity: f.type, figure: f.figure,
      operator: "", status: f.status, note: f.note, arctic: f.arctic,
    })
  );
}

function siteFeatures(group: string): GeoJSON.Feature[] {
  return sites.sites
    .filter((s) => s.group === group)
    .map((s) =>
      point(s.lng, s.lat, {
        name: s.name, country: s.country, commodity: s.commodity, figure: s.figure,
        operator: s.operator, status: s.status, note: s.note, arctic: s.arctic,
        kind: s.commodity.startsWith("Nuclear plant") ? "plant" : "mine",
      })
    );
}

function pipelineFeatures(): GeoJSON.Feature[] {
  return pipelines.pipelines.map((p) => ({
    type: "Feature",
    geometry: { type: "LineString", coordinates: p.coords as [number, number][] },
    properties: {
      name: p.name, country: "", commodity: `${p.kind} pipeline`, figure: p.figure,
      operator: "", status: p.status, note: p.note, kind: p.kind,
    },
  }));
}

function arcticFeatures(): GeoJSON.Feature[] {
  return [
    ...fields.fields.filter((f) => f.arctic).map((f) => point(f.lng, f.lat, { name: f.name })),
    ...sites.sites.filter((s) => s.arctic).map((s) => point(s.lng, s.lat, { name: s.name })),
  ];
}

function reservesFeatures(): GeoJSON.Feature[] {
  return reserves.countries
    .filter((c) => c.reserves > 0)
    .map((c) =>
      point(c.lng, c.lat, {
        name: c.name, country: "", commodity: "proven crude reserves",
        figure: `${c.reserves} billion bbl`, operator: "", status: c.status,
        note: c.note, reserves: c.reserves,
      })
    );
}

function arcticCircle(): GeoJSON.Feature {
  const coords: [number, number][] = [];
  for (let lng = -180; lng <= 180; lng += 2) coords.push([lng, 66.5628]);
  return { type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} };
}

function popupHTML(p: Record<string, unknown>): string {
  const status = String(p.status ?? "");
  const dot = STATUS_COLOR[status] ?? "#7e97a6";
  return `
    <div class="popup-title">${p.name}</div>
    <div class="popup-kv">
      ${p.country ? `${p.country} · ` : ""}${p.commodity}<br/>
      ${p.operator ? `${p.operator}<br/>` : ""}
      ${p.figure ? `<b>${p.figure}</b><br/>` : ""}
      <span style="display:inline-flex;align-items:center;gap:5px">
        <span style="width:7px;height:7px;border-radius:50%;background:${dot}"></span>
        <b>${status}</b>
      </span><br/>${p.note ?? ""}
    </div>`;
}

function plantPopupHTML(p: Record<string, unknown>): string {
  return `
    <div class="popup-title">${p.n}</div>
    <div class="popup-kv">
      ${p.c} · ${p.f}<br/>
      <b>${p.mw} MW</b><br/>
      <span style="color:#64778f">WRI Global Power Plant Database · CC-BY 4.0</span>
    </div>`;
}

const POINT_LAYERS: Exclude<GroupKey, "plants" | "pipelines" | "reserves" | "arctic">[] = [
  "oilgas", "base", "precious", "battery", "ree", "nuclear",
];
const plantLayerIds = (g: string) => [`pl-${g}-cc`, `pl-${g}-cs`, `pl-${g}-pt`];

export default function ReserveMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const plantsDataRef = useRef<GeoJSON.FeatureCollection | null>(null);
  const [visible, setVisible] = useState<Record<GroupKey, boolean>>({
    oilgas: true, pipelines: true, base: true, precious: true, battery: true,
    ree: true, nuclear: true, plants: true, reserves: true, arctic: true,
  });
  const [terrain3d, setTerrain3d] = useState(false);
  const terrain3dRef = useRef(false);
  const [fuel, setFuel] = useState("all");
  const [plantCount, setPlantCount] = useState<number | null>(null);
  const [query, setQuery] = useState("");

  const searchIndex = useMemo(
    () => [
      ...fields.fields.map((f) => ({
        name: f.name, sub: `${f.country} · ${f.type}`, lngLat: [f.lng, f.lat] as [number, number],
        props: { name: f.name, country: f.country, commodity: f.type, figure: f.figure, operator: "", status: f.status, note: f.note },
      })),
      ...sites.sites.map((s) => ({
        name: s.name, sub: `${s.country} · ${s.commodity}`, lngLat: [s.lng, s.lat] as [number, number],
        props: { name: s.name, country: s.country, commodity: s.commodity, figure: s.figure, operator: s.operator, status: s.status, note: s.note },
      })),
    ],
    []
  );
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return searchIndex
      .filter((r) => `${r.name} ${r.sub}`.toLowerCase().includes(q))
      .slice(0, 7);
  }, [query, searchIndex]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        projection: { type: "globe" },
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        sky: { ...ATMOSPHERE },
        sources: {
          carto: {
            type: "raster",
            tiles: [
              "https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png",
              "https://b.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png",
              "https://c.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png",
            ],
            tileSize: 256,
            attribution:
              "© <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors © <a href='https://carto.com/attributions'>CARTO</a> · terrain © <a href='https://registry.opendata.aws/terrain-tiles/'>Mapzen/AWS</a> · plants © <a href='https://datasets.wri.org/dataset/globalpowerplantdatabase'>WRI GPPD</a>",
          },
          satellite: {
            type: "raster",
            tiles: [SATELLITE_TILE_URL],
            tileSize: SATELLITE_TILE_SIZE,
            maxzoom: SATELLITE_MAX_ZOOM,
            attribution: SATELLITE_ATTRIBUTION,
          },
          "carto-labels": {
            type: "raster",
            tiles: [
              "https://a.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}@2x.png",
              "https://b.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}@2x.png",
              "https://c.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}@2x.png",
            ],
            tileSize: 256,
          },
          // MapLibre needs an absolute URL for geojson source strings — a
          // bare path throws Invalid URL and aborts the entire style load.
          boundaries: {
            type: "geojson",
            data: `${window.location.origin}/data/boundaries.geojson`,
          },
          dem: {
            type: "raster-dem",
            tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
            encoding: "terrarium", tileSize: 256, maxzoom: 10,
          },
        },
        layers: [
          { id: "carto", type: "raster", source: "carto" },
          {
            id: "satellite",
            type: "raster",
            source: "satellite",
            paint: {
              ...DARK_SATELLITE_PAINT,
              // Fade to the dark minimal base past the imagery's native zoom.
              "raster-opacity": [
                "interpolate", ["linear"], ["zoom"],
                SATELLITE_MAX_ZOOM + 0.2, 1,
                SATELLITE_MAX_ZOOM + 1.4, 0,
              ],
            },
          },
          {
            id: "boundaries",
            type: "line",
            source: "boundaries",
            paint: {
              "line-color": BOUNDARY_STYLE.color,
              "line-opacity": BOUNDARY_STYLE.opacity,
              "line-width": BOUNDARY_STYLE.width,
            },
          },
          {
            id: "carto-labels",
            type: "raster",
            source: "carto-labels",
            paint: { "raster-opacity": 0.88 },
          },
        ],
      },
      center: [-30, 45],
      zoom: 2.1,
      minZoom: 1,
      maxZoom: 12,
    });
    mapRef.current = map;
    (window as unknown as Record<string, unknown>).__geomMap = map;
    map.on("error", (e) => {
      const w = window as unknown as { __geomMapErrors?: string[] };
      (w.__geomMapErrors ??= []).push(String(e.error?.stack ?? e.error?.message ?? e));
      console.error("[GEOM map]", e.error?.message ?? e);
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }), "top-right");
    map.addControl(new maplibregl.GlobeControl(), "top-right");

    map.on("load", () => {
      registerMapIcons(map);
      map.addSource("arctic-circle", { type: "geojson", data: arcticCircle() });
      map.addLayer({
        id: "arctic-circle", type: "line", source: "arctic-circle",
        paint: { "line-color": "#5e8ba6", "line-width": 1, "line-dasharray": [2, 3], "line-opacity": 0.65 },
      });

      map.addSource("pipelines", { type: "geojson", data: fc(pipelineFeatures()) });
      // line-dasharray is not data-driven in MapLibre — two layers instead.
      map.addLayer({
        id: "pipelines", type: "line", source: "pipelines",
        filter: ["==", ["get", "status"], "operating"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ["match", ["get", "kind"], "gas", "#8fb4c9", "products", "#cbc3b1", "#c67c1b"],
          "line-width": ["interpolate", ["linear"], ["zoom"], 1, 1.2, 6, 2.6],
          "line-opacity": 0.85,
        },
      });
      map.addLayer({
        id: "pipelines-idle", type: "line", source: "pipelines",
        filter: ["!=", ["get", "status"], "operating"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ["match", ["get", "kind"], "gas", "#8fb4c9", "products", "#cbc3b1", "#c67c1b"],
          "line-width": ["interpolate", ["linear"], ["zoom"], 1, 1.2, 6, 2.6],
          "line-opacity": 0.7,
          "line-dasharray": [2, 1.6],
        },
      });

      map.addSource("reserves", { type: "geojson", data: fc(reservesFeatures()) });
      map.addLayer({
        id: "reserves", type: "circle", source: "reserves",
        paint: {
          "circle-color": GROUPS.reserves.color, "circle-opacity": 0.22,
          "circle-stroke-color": GROUPS.reserves.color, "circle-stroke-width": 1.2,
          "circle-radius": ["interpolate", ["linear"], ["sqrt", ["get", "reserves"]], 0, 3, 17.5, 34],
        },
      });

      map.addSource("arctic", { type: "geojson", data: fc(arcticFeatures()) });
      map.addLayer({
        id: "arctic", type: "circle", source: "arctic",
        paint: {
          "circle-color": "transparent", "circle-radius": 10,
          "circle-stroke-color": GROUPS.arctic.color, "circle-stroke-width": 1.4, "circle-stroke-opacity": 0.85,
        },
      });

      const sourcesByLayer: Record<string, GeoJSON.Feature[]> = {
        oilgas: fieldFeatures(), base: siteFeatures("base"), precious: siteFeatures("precious"),
        battery: siteFeatures("battery"), ree: siteFeatures("ree"), nuclear: siteFeatures("nuclear"),
      };

      for (const id of POINT_LAYERS) {
        map.addSource(id, { type: "geojson", data: fc(sourcesByLayer[id]) });
        map.addLayer({
          id, type: "symbol", source: id,
          layout: {
            "icon-image": CURATED_ICON[id] as string,
            "icon-size": ["interpolate", ["linear"], ["zoom"], 1, 0.42, 6, 0.8],
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
          },
        });
      }

      const popup = new maplibregl.Popup({ closeButton: false, maxWidth: "300px" });
      popupRef.current = popup;

      for (const id of [...POINT_LAYERS, "reserves", "pipelines", "pipelines-idle"]) {
        map.on("click", id, (e) => {
          const f = e.features?.[0];
          if (!f) return;
          popup.setLngLat(e.lngLat).setHTML(popupHTML(f.properties as Record<string, unknown>)).addTo(map);
        });
        map.on("mouseenter", id, () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", id, () => (map.getCanvas().style.cursor = ""));
      }

      // Power plants: lazy-load the signed dataset (same bytes the oracle
      // attests — /data/plants.json is the CDN copy of /api/datasets/plants),
      // split into typed clustered sources so every cluster carries its
      // category icon + color.
      fetch("/data/plants.json")
        .then((r) => r.json())
        .then(
          (ds: {
            plants: Array<{ name: string; country: string; fuel: string; mw: number; lat: number; lng: number }>;
          }) => {
          const data = fc(
            ds.plants.map((p) =>
              point(p.lng, p.lat, { n: p.name, c: p.country, f: p.fuel, mw: p.mw })
            )
          );
          plantsDataRef.current = data;
          setPlantCount(data.features.length);

          const byGroup: Record<string, GeoJSON.Feature[]> = {};
          for (const g of PLANT_GROUPS) byGroup[g.id] = [];
          for (const f of data.features) {
            const grp = FUEL_GROUP[(f.properties as { f: string }).f] ?? "other";
            byGroup[grp].push(f);
          }

          for (const g of PLANT_GROUPS) {
            const srcId = `pl-${g.id}`;
            map.addSource(srcId, {
              type: "geojson",
              data: fc(byGroup[g.id]),
              cluster: true,
              clusterMaxZoom: 6,
              clusterRadius: 46,
              clusterProperties: { mw_sum: ["+", ["coalesce", ["get", "mw"], 0]] },
            });
            map.addLayer({
              id: `pl-${g.id}-cc`, type: "circle", source: srcId,
              filter: ["has", "point_count"],
              paint: {
                "circle-color": g.color,
                "circle-opacity": 0.14,
                "circle-stroke-color": g.color,
                "circle-stroke-width": 1.3,
                "circle-stroke-opacity": 0.75,
                "circle-radius": ["step", ["get", "point_count"], 12, 50, 15, 250, 19, 1000, 24],
              },
            }, "oilgas");
            map.addLayer({
              id: `pl-${g.id}-cs`, type: "symbol", source: srcId,
              filter: ["has", "point_count"],
              layout: {
                "icon-image": g.icon,
                "icon-size": ["step", ["get", "point_count"], 0.42, 250, 0.5, 1000, 0.58],
                "icon-allow-overlap": true,
                "icon-ignore-placement": true,
                "text-field": ["get", "point_count_abbreviated"],
                "text-font": ["Noto Sans Regular"],
                "text-size": 9,
                "text-offset": [0, 1.35],
                "text-allow-overlap": true,
                "text-optional": true,
              },
              paint: {
                "text-color": "#edf1f3",
                "text-halo-color": "#0c1519",
                "text-halo-width": 1.1,
              },
            }, "oilgas");
            map.addLayer({
              id: `pl-${g.id}-pt`, type: "symbol", source: srcId,
              filter: ["!", ["has", "point_count"]],
              layout: {
                "icon-image": g.icon,
                "icon-size": ["interpolate", ["linear"], ["zoom"], 4, 0.28, 8, 0.48, 11, 0.62],
                "icon-allow-overlap": false,
              },
            }, "oilgas");

            map.on("click", `pl-${g.id}-pt`, (e) => {
              const f = e.features?.[0];
              if (!f) return;
              popup.setLngLat(e.lngLat).setHTML(plantPopupHTML(f.properties as Record<string, unknown>)).addTo(map);
            });
            map.on("click", `pl-${g.id}-cc`, async (e) => {
              const f = e.features?.[0];
              if (!f) return;
              const src = map.getSource(srcId) as maplibregl.GeoJSONSource;
              const zoom = await src.getClusterExpansionZoom(f.properties?.cluster_id as number);
              map.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom });
            });
            for (const id of [`pl-${g.id}-pt`, `pl-${g.id}-cc`]) {
              map.on("mouseenter", id, () => (map.getCanvas().style.cursor = "pointer"));
              map.on("mouseleave", id, () => (map.getCanvas().style.cursor = ""));
            }
          }
        })
        .catch((e) => {
          (window as unknown as Record<string, unknown>).__geomPlantsError = String(e?.stack ?? e);
          console.error("[GEOM map] plants load failed", e);
        });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const setTerrainEnabled = (on: boolean) => {
    const map = mapRef.current;
    if (!map) return;
    terrain3dRef.current = on;
    setTerrain3d(on);
    if (on) {
      map.setTerrain({ source: "dem", exaggeration: 1.35 });
      if (!map.getLayer("hillshade")) {
        map.addLayer(
          {
            id: "hillshade", type: "hillshade", source: "dem", minzoom: 3.5,
            paint: {
              "hillshade-shadow-color": "#04080c", "hillshade-highlight-color": "#2a4552",
              "hillshade-accent-color": "#0c1519", "hillshade-exaggeration": 0.55,
            },
          },
          "arctic-circle"
        );
      }
    } else {
      map.setTerrain(null);
      if (map.getLayer("hillshade")) map.removeLayer("hillshade");
      if (map.getPitch() > 0) map.easeTo({ pitch: 0, duration: 600 });
    }
  };

  const syncPlantLayers = (plantsOn: boolean, fuelSel: string) => {
    const map = mapRef.current;
    if (!map) return;
    for (const g of PLANT_GROUPS) {
      const vis = plantsOn && (fuelSel === "all" || fuelSel === g.id) ? "visible" : "none";
      for (const id of plantLayerIds(g.id)) {
        if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", vis);
      }
    }
  };

  const toggle = (key: GroupKey) => {
    const map = mapRef.current;
    const next = { ...visible, [key]: !visible[key] };
    setVisible(next);
    if (key === "plants") {
      syncPlantLayers(next.plants, fuel);
      return;
    }
    const vis = next[key] ? "visible" : "none";
    const ids = key === "pipelines" ? ["pipelines", "pipelines-idle"] : [key];
    for (const id of ids) {
      if (map?.getLayer(id)) map.setLayoutProperty(id, "visibility", vis);
    }
  };

  const applyFuel = (id: string) => {
    setFuel(id);
    syncPlantLayers(visible.plants, id);
  };

  const focus = (lngLat: [number, number], zoom: number, props?: Record<string, unknown>, cinematic = false) => {
    const map = mapRef.current;
    if (!map) return;
    if (cinematic && !terrain3dRef.current) setTerrainEnabled(true);
    map.flyTo({
      center: lngLat, zoom,
      pitch: cinematic ? 55 : map.getPitch(),
      bearing: cinematic ? -12 : map.getBearing(),
      duration: cinematic ? 2600 : 1600,
    });
    if (props && popupRef.current) {
      popupRef.current.setLngLat(lngLat).setHTML(popupHTML(props)).addTo(map);
    }
  };

  const spotlight = (s: (typeof SPOTLIGHT)[number]) => {
    const hit = searchIndex.find((x) => x.name === s.name);
    focus(s.lngLat, s.zoom, hit?.props, true);
  };

  return (
    <div className="map-shell">
      <div ref={containerRef} className="map-canvas" style={{ position: "absolute", inset: 0 }} />
      <div className="map-panel">
        <p className="panel-title" style={{ marginBottom: 4 }}>
          Physical layer
        </p>
        <p className="dimmer mono" style={{ fontSize: 10, margin: "0 0 8px", letterSpacing: "0.06em" }}>
          {fields.fields.length + sites.sites.length} CURATED
          {plantCount ? ` + ${plantCount.toLocaleString("en-US")} PLANTS` : " · PLANTS LOADING…"} · DRAG TO SPIN
        </p>

        <input
          className="lib-search"
          style={{ marginBottom: 6 }}
          placeholder="search fields, mines, plants…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search assets"
        />
        {results.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            {results.map((r) => (
              <button
                key={r.name + r.sub}
                className="spotlight-row"
                onClick={() => {
                  setQuery("");
                  focus(r.lngLat, 6.5, r.props);
                }}
              >
                <span>{r.name}</span>
                <span className="dimmer" style={{ fontSize: 10 }}>{r.sub}</span>
              </button>
            ))}
          </div>
        )}

        <button
          className={`layer-toggle ${terrain3d ? "on" : ""}`}
          onClick={() => setTerrainEnabled(!terrain3d)}
          aria-pressed={terrain3d}
        >
          <span className="layer-dot" style={{ background: terrain3d ? "#6fd4c3" : "#3c4c57" }} />
          <span style={{ flex: 1 }}>
            3D terrain
            <br />
            <span className="dimmer" style={{ fontSize: 10 }}>
              {terrain3d ? "on — right-drag to tilt" : "off — flat globe (faster)"}
            </span>
          </span>
        </button>

        {(Object.keys(GROUPS) as GroupKey[]).map((key) => (
          <div key={key}>
            <button
              className={`layer-toggle ${visible[key] ? "on" : ""}`}
              onClick={() => toggle(key)}
              aria-pressed={visible[key]}
            >
              <span className="layer-dot" style={{ background: GROUPS[key].color, opacity: visible[key] ? 1 : 0.3 }} />
              <span style={{ flex: 1 }}>
                {GROUPS[key].label}
                <br />
                <span className="dimmer" style={{ fontSize: 10 }}>{GROUPS[key].hint}</span>
              </span>
            </button>
            {key === "plants" && visible.plants && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, margin: "2px 0 6px 26px" }}>
                {FUEL_CHIPS.map((c) => (
                  <button
                    key={c.id}
                    className={`dl-chip ${fuel === c.id ? "on" : ""}`}
                    style={{ fontSize: 10, padding: "2px 8px" }}
                    onClick={() => applyFuel(c.id)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        <p className="panel-title" style={{ margin: "14px 0 6px" }}>
          Spotlight
        </p>
        <div className="map-legend" style={{ marginTop: 0 }}>
          {SPOTLIGHT.map((s) => (
            <button key={s.name} className="spotlight-row" onClick={() => spotlight(s)}>
              <span>{s.name}</span>
              <span className="dimmer" style={{ fontSize: 10 }}>{s.sub}</span>
            </button>
          ))}
        </div>

        <div className="map-legend">
          <div className="legend-row">
            <span className="layer-dot" style={{ border: `1.5px dashed ${GROUPS.reserves.color}`, background: "transparent" }} />
            Arctic Circle · 66°33′N
          </div>
          <div className="legend-row dimmer" style={{ marginTop: 4 }}>
            Click markers, clusters & pipelines for detail
          </div>
        </div>
        <div className="provenance" style={{ marginTop: 14 }}>
          Curated layers: seed data, verify before publication · Power plants ©
          WRI Global Power Plant Database (CC-BY 4.0) · Pipeline routes
          schematic
        </div>
      </div>
    </div>
  );
}
