"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MLMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import reserves from "@/data/reserves.json";
import fields from "@/data/fields.json";

const COLORS = {
  reserves: "#3e90cb",
  fields: "#c67c1b",
  arctic: "#2ba57e",
};

type LayerKey = keyof typeof COLORS;

const LAYER_DEFS: Array<{ key: LayerKey; label: string; hint: string }> = [
  { key: "reserves", label: "Proven reserves", hint: "circle area = billion bbl" },
  { key: "fields", label: "Major fields", hint: "supergiants & key basins" },
  { key: "arctic", label: "Arctic assets", hint: "GEOM coverage focus" },
];

function countriesGeoJSON(): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: reserves.countries
      .filter((c) => c.reserves > 0)
      .map((c) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [c.lng, c.lat] },
        properties: {
          name: c.name,
          reserves: c.reserves,
          status: c.status,
          note: c.note,
        },
      })),
  };
}

function fieldsGeoJSON(arctic: boolean): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: fields.fields
      .filter((f) => f.arctic === arctic)
      .map((f) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [f.lng, f.lat] },
        properties: {
          name: f.name,
          country: f.country,
          type: f.type,
          status: f.status,
          note: f.note,
        },
      })),
  };
}

function arcticCircleGeoJSON(): GeoJSON.Feature {
  const coords: [number, number][] = [];
  for (let lng = -180; lng <= 180; lng += 2) coords.push([lng, 66.5628]);
  return {
    type: "Feature",
    geometry: { type: "LineString", coordinates: coords },
    properties: {},
  };
}

export default function ReserveMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [visible, setVisible] = useState<Record<LayerKey, boolean>>({
    reserves: true,
    fields: true,
    arctic: true,
  });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
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
              "© <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors © <a href='https://carto.com/attributions'>CARTO</a>",
          },
        },
        layers: [{ id: "carto", type: "raster", source: "carto" }],
      },
      center: [10, 40],
      zoom: 1.7,
      minZoom: 1,
      maxZoom: 10,
    });
    mapRef.current = map;
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as Record<string, unknown>).__gaeaMap = map;
    }
    map.on("error", (e) => console.error("[GAEA map]", e.error?.message ?? e));
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      map.addSource("arctic-circle", { type: "geojson", data: arcticCircleGeoJSON() });
      map.addLayer({
        id: "arctic-circle",
        type: "line",
        source: "arctic-circle",
        paint: {
          "line-color": "#3e90cb",
          "line-width": 1,
          "line-dasharray": [2, 3],
          "line-opacity": 0.6,
        },
      });

      map.addSource("reserves", { type: "geojson", data: countriesGeoJSON() });
      map.addLayer({
        id: "reserves",
        type: "circle",
        source: "reserves",
        paint: {
          "circle-color": COLORS.reserves,
          "circle-opacity": 0.35,
          "circle-stroke-color": COLORS.reserves,
          "circle-stroke-width": 1.5,
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["sqrt", ["get", "reserves"]],
            0, 3,
            17.5, 34,
          ],
        },
      });

      map.addSource("fields", { type: "geojson", data: fieldsGeoJSON(false) });
      map.addLayer({
        id: "fields",
        type: "circle",
        source: "fields",
        paint: {
          "circle-color": COLORS.fields,
          "circle-opacity": 0.9,
          "circle-radius": 5,
          "circle-stroke-color": "#0a1220",
          "circle-stroke-width": 1.5,
        },
      });

      map.addSource("arctic", { type: "geojson", data: fieldsGeoJSON(true) });
      map.addLayer({
        id: "arctic",
        type: "circle",
        source: "arctic",
        paint: {
          "circle-color": COLORS.arctic,
          "circle-opacity": 0.9,
          "circle-radius": 6,
          "circle-stroke-color": "#0a1220",
          "circle-stroke-width": 1.5,
        },
      });

      const popup = new maplibregl.Popup({ closeButton: false, maxWidth: "280px" });

      const showPopup = (
        e: maplibregl.MapLayerMouseEvent,
        render: (p: Record<string, unknown>) => string
      ) => {
        const f = e.features?.[0];
        if (!f) return;
        popup
          .setLngLat(e.lngLat)
          .setHTML(render(f.properties as Record<string, unknown>))
          .addTo(map);
      };

      map.on("click", "reserves", (e) =>
        showPopup(
          e,
          (p) => `
          <div class="popup-title">${p.name}</div>
          <div class="popup-kv">
            <b>${p.reserves}</b> billion bbl proven<br/>
            status: <b>${p.status}</b><br/>${p.note}
          </div>`
        )
      );
      const fieldPopup = (p: Record<string, unknown>) => `
        <div class="popup-title">${p.name}</div>
        <div class="popup-kv">
          ${p.country} · ${p.type}<br/>
          status: <b>${p.status}</b><br/>${p.note}
        </div>`;
      map.on("click", "fields", (e) => showPopup(e, fieldPopup));
      map.on("click", "arctic", (e) => showPopup(e, fieldPopup));

      for (const id of ["reserves", "fields", "arctic"]) {
        map.on("mouseenter", id, () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", id, () => (map.getCanvas().style.cursor = ""));
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const toggle = (key: LayerKey) => {
    const map = mapRef.current;
    const next = { ...visible, [key]: !visible[key] };
    setVisible(next);
    if (map?.getLayer(key)) {
      map.setLayoutProperty(key, "visibility", next[key] ? "visible" : "none");
    }
  };

  return (
    <div className="map-shell">
      <div
        ref={containerRef}
        className="map-canvas"
        style={{ position: "absolute", inset: 0 }}
      />
      <div className="map-panel">
        <p className="panel-title" style={{ marginBottom: 10 }}>
          Layers
        </p>
        {LAYER_DEFS.map((l) => (
          <button
            key={l.key}
            className={`layer-toggle ${visible[l.key] ? "on" : ""}`}
            onClick={() => toggle(l.key)}
            aria-pressed={visible[l.key]}
          >
            <span className="layer-dot" style={{ background: COLORS[l.key], opacity: visible[l.key] ? 1 : 0.3 }} />
            <span>
              {l.label}
              <br />
              <span className="dimmer" style={{ fontSize: 10 }}>{l.hint}</span>
            </span>
          </button>
        ))}
        <div className="map-legend">
          <div className="legend-row">
            <span className="layer-dot" style={{ border: `1.5px dashed ${COLORS.reserves}`, background: "transparent" }} />
            Arctic Circle · 66°33′N
          </div>
          <div className="legend-row dimmer" style={{ marginTop: 4 }}>
            Click any marker for detail
          </div>
        </div>
        <div className="provenance" style={{ marginTop: 14 }}>
          Seed data · approx. figures from OPEC ASB / EIA · verify before
          publication
        </div>
      </div>
    </div>
  );
}
