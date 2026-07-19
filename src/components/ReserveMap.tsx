"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MLMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import reserves from "@/data/reserves.json";
import fields from "@/data/fields.json";
import sites from "@/data/sites.json";

const GROUPS = {
  oilgas: { color: "#e8a33d", label: "Oil & gas fields", hint: "supergiants, shale, LNG" },
  base: { color: "#b26a4e", label: "Base & industrial metals", hint: "copper, iron, zinc, bauxite" },
  precious: { color: "#cbc3b1", label: "Precious metals", hint: "gold, silver, PGM" },
  battery: { color: "#2ba57e", label: "Battery metals", hint: "lithium, nickel, cobalt" },
  ree: { color: "#8a75e8", label: "Rare earths", hint: "NdPr, heavy REE" },
  nuclear: { color: "#8fb4c9", label: "Nuclear", hint: "plants ◦ white ring · U mines" },
  reserves: { color: "#5e8ba6", label: "Proven oil reserves", hint: "circle area = billion bbl" },
  arctic: { color: "#6fd4c3", label: "Arctic highlight", hint: "assets above 66°33′N" },
} as const;

type GroupKey = keyof typeof GROUPS;

const SPOTLIGHT: Array<{
  name: string;
  sub: string;
  lngLat: [number, number];
  zoom: number;
}> = [
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
  producing: "#2ba57e",
  operating: "#2ba57e",
  development: "#8fb4c9",
  construction: "#8fb4c9",
  "restart-pending": "#8fb4c9",
  constrained: "#c4a469",
  declining: "#c4a469",
  moratorium: "#c4a469",
  dormant: "#c4a469",
  blocked: "#cc4a57",
  inactive: "#cc4a57",
  defunct: "#cc4a57",
};

function fc(features: GeoJSON.Feature[]): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features };
}

function point(
  lng: number,
  lat: number,
  properties: Record<string, unknown>
): GeoJSON.Feature {
  return { type: "Feature", geometry: { type: "Point", coordinates: [lng, lat] }, properties };
}

function fieldFeatures(): GeoJSON.Feature[] {
  return fields.fields.map((f) =>
    point(f.lng, f.lat, {
      name: f.name,
      country: f.country,
      commodity: f.type,
      figure: f.figure,
      operator: "",
      status: f.status,
      note: f.note,
      arctic: f.arctic,
    })
  );
}

function siteFeatures(group: string): GeoJSON.Feature[] {
  return sites.sites
    .filter((s) => s.group === group)
    .map((s) =>
      point(s.lng, s.lat, {
        name: s.name,
        country: s.country,
        commodity: s.commodity,
        figure: s.figure,
        operator: s.operator,
        status: s.status,
        note: s.note,
        arctic: s.arctic,
        kind: s.commodity.startsWith("Nuclear plant") ? "plant" : "mine",
      })
    );
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
        name: c.name,
        country: "",
        commodity: "proven crude reserves",
        figure: `${c.reserves} billion bbl`,
        operator: "",
        status: c.status,
        note: c.note,
        reserves: c.reserves,
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

const POINT_LAYERS: GroupKey[] = ["oilgas", "base", "precious", "battery", "ree", "nuclear"];

export default function ReserveMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [visible, setVisible] = useState<Record<GroupKey, boolean>>({
    oilgas: true,
    base: true,
    precious: true,
    battery: true,
    ree: true,
    nuclear: true,
    reserves: true,
    arctic: true,
  });

  const counts: Record<GroupKey, number> = {
    oilgas: fields.fields.length,
    base: sites.sites.filter((s) => s.group === "base").length,
    precious: sites.sites.filter((s) => s.group === "precious").length,
    battery: sites.sites.filter((s) => s.group === "battery").length,
    ree: sites.sites.filter((s) => s.group === "ree").length,
    nuclear: sites.sites.filter((s) => s.group === "nuclear").length,
    reserves: reserves.countries.filter((c) => c.reserves > 0).length,
    arctic: arcticFeatures().length,
  };
  const totalSites = fields.fields.length + sites.sites.length;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        projection: { type: "globe" },
        sky: {
          "sky-color": "#0b1a24",
          "horizon-color": "#16303d",
          "fog-color": "#0c1519",
          "sky-horizon-blend": 0.6,
          "horizon-fog-blend": 0.6,
          "fog-ground-blend": 0.8,
        },
        sources: {
          carto: {
            type: "raster",
            tiles: [
              "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
              "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
              "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
            ],
            tileSize: 256,
            attribution:
              "© <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors © <a href='https://carto.com/attributions'>CARTO</a> · terrain © <a href='https://registry.opendata.aws/terrain-tiles/'>Mapzen/AWS</a>",
          },
          dem: {
            type: "raster-dem",
            tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
            encoding: "terrarium",
            tileSize: 256,
            maxzoom: 12,
          },
        },
        layers: [
          { id: "carto", type: "raster", source: "carto" },
          {
            id: "hillshade",
            type: "hillshade",
            source: "dem",
            paint: {
              "hillshade-shadow-color": "#04080c",
              "hillshade-highlight-color": "#2a4552",
              "hillshade-accent-color": "#0c1519",
              "hillshade-exaggeration": 0.55,
            },
          },
        ],
      },
      center: [-30, 45],
      zoom: 2.1,
      minZoom: 1,
      maxZoom: 12,
    });
    mapRef.current = map;
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as Record<string, unknown>).__geomMap = map;
    }
    map.on("error", (e) => console.error("[GEOM map]", e.error?.message ?? e));
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }),
      "top-right"
    );
    map.addControl(new maplibregl.GlobeControl(), "top-right");

    map.on("load", () => {
      map.setTerrain({ source: "dem", exaggeration: 1.4 });

      map.addSource("arctic-circle", { type: "geojson", data: arcticCircle() });
      map.addLayer({
        id: "arctic-circle",
        type: "line",
        source: "arctic-circle",
        paint: {
          "line-color": "#5e8ba6",
          "line-width": 1,
          "line-dasharray": [2, 3],
          "line-opacity": 0.65,
        },
      });

      map.addSource("reserves", { type: "geojson", data: fc(reservesFeatures()) });
      map.addLayer({
        id: "reserves",
        type: "circle",
        source: "reserves",
        paint: {
          "circle-color": GROUPS.reserves.color,
          "circle-opacity": 0.22,
          "circle-stroke-color": GROUPS.reserves.color,
          "circle-stroke-width": 1.2,
          "circle-radius": ["interpolate", ["linear"], ["sqrt", ["get", "reserves"]], 0, 3, 17.5, 34],
        },
      });

      map.addSource("arctic", { type: "geojson", data: fc(arcticFeatures()) });
      map.addLayer({
        id: "arctic",
        type: "circle",
        source: "arctic",
        paint: {
          "circle-color": "transparent",
          "circle-radius": 10,
          "circle-stroke-color": GROUPS.arctic.color,
          "circle-stroke-width": 1.4,
          "circle-stroke-opacity": 0.85,
        },
      });

      const sourcesByLayer: Record<string, GeoJSON.Feature[]> = {
        oilgas: fieldFeatures(),
        base: siteFeatures("base"),
        precious: siteFeatures("precious"),
        battery: siteFeatures("battery"),
        ree: siteFeatures("ree"),
        nuclear: siteFeatures("nuclear"),
      };

      for (const id of POINT_LAYERS) {
        map.addSource(id, { type: "geojson", data: fc(sourcesByLayer[id]) });
        map.addLayer({
          id,
          type: "circle",
          source: id,
          paint: {
            "circle-color": GROUPS[id].color,
            "circle-opacity": 0.92,
            "circle-radius": [
              "interpolate", ["linear"], ["zoom"],
              1, 4,
              6, 7,
            ],
            "circle-stroke-color":
              id === "nuclear"
                ? ["case", ["==", ["get", "kind"], "plant"], "#edf1f3", "#0c1519"]
                : "#0c1519",
            "circle-stroke-width": id === "nuclear" ? 1.8 : 1.4,
          },
        });
      }

      const popup = new maplibregl.Popup({ closeButton: false, maxWidth: "300px" });
      popupRef.current = popup;

      for (const id of [...POINT_LAYERS, "reserves"]) {
        map.on("click", id, (e) => {
          const f = e.features?.[0];
          if (!f) return;
          popup
            .setLngLat(e.lngLat)
            .setHTML(popupHTML(f.properties as Record<string, unknown>))
            .addTo(map);
        });
        map.on("mouseenter", id, () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", id, () => (map.getCanvas().style.cursor = ""));
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const toggle = (key: GroupKey) => {
    const map = mapRef.current;
    const next = { ...visible, [key]: !visible[key] };
    setVisible(next);
    if (map?.getLayer(key)) {
      map.setLayoutProperty(key, "visibility", next[key] ? "visible" : "none");
    }
  };

  const spotlight = (s: (typeof SPOTLIGHT)[number]) => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({ center: s.lngLat, zoom: s.zoom, pitch: 55, bearing: -12, duration: 2600 });
    const all = [
      ...fields.fields.map((f) => ({ ...f, operator: "", commodity: f.type, group: "oilgas" })),
      ...sites.sites,
    ];
    const hit = all.find((x) => x.name === s.name);
    if (hit && popupRef.current) {
      popupRef.current
        .setLngLat(s.lngLat)
        .setHTML(
          popupHTML({
            name: hit.name,
            country: hit.country,
            commodity: (hit as { commodity: string }).commodity,
            figure: hit.figure,
            operator: (hit as { operator?: string }).operator ?? "",
            status: hit.status,
            note: hit.note,
          })
        )
        .addTo(map);
    }
  };

  return (
    <div className="map-shell">
      <div ref={containerRef} className="map-canvas" style={{ position: "absolute", inset: 0 }} />
      <div className="map-panel">
        <p className="panel-title" style={{ marginBottom: 4 }}>
          Physical layer
        </p>
        <p className="dimmer mono" style={{ fontSize: 10, margin: "0 0 10px", letterSpacing: "0.06em" }}>
          {totalSites} ASSETS · {counts.arctic} ARCTIC · 3D TERRAIN · DRAG TO SPIN
        </p>
        {(Object.keys(GROUPS) as GroupKey[]).map((key) => (
          <button
            key={key}
            className={`layer-toggle ${visible[key] ? "on" : ""}`}
            onClick={() => toggle(key)}
            aria-pressed={visible[key]}
          >
            <span
              className="layer-dot"
              style={{ background: GROUPS[key].color, opacity: visible[key] ? 1 : 0.3 }}
            />
            <span style={{ flex: 1 }}>
              {GROUPS[key].label}
              <br />
              <span className="dimmer" style={{ fontSize: 10 }}>{GROUPS[key].hint}</span>
            </span>
            <span className="dimmer mono" style={{ fontSize: 10 }}>{counts[key]}</span>
          </button>
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
            <span
              className="layer-dot"
              style={{ border: `1.5px dashed ${GROUPS.reserves.color}`, background: "transparent" }}
            />
            Arctic Circle · 66°33′N
          </div>
          <div className="legend-row dimmer" style={{ marginTop: 4 }}>
            Click any marker for detail · right-drag to tilt
          </div>
        </div>
        <div className="provenance" style={{ marginTop: 14 }}>
          Seed data · approx. figures from operator disclosures, EIA, WNA,
          mining rankings · verify before publication
        </div>
      </div>
    </div>
  );
}
