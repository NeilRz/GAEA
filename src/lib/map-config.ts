/** Centralized visual configuration for the GEOM globe.
 *  Basemaps, atmosphere, and semantic-zoom thresholds live here so the
 *  map component stays free of magic numbers. */

/** NASA GIBS Blue Marble (shaded relief + bathymetry) — public domain,
 *  no API key, max native zoom 8. A licensed provider (Esri, MapTiler,
 *  Mapbox satellite) can be configured via env without code changes. */
export const SATELLITE_TILE_URL =
  process.env.NEXT_PUBLIC_SATELLITE_TILE_URL ||
  "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg";

export const SATELLITE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_SATELLITE_ATTRIBUTION ||
  "imagery © <a href='https://earthdata.nasa.gov/gibs'>NASA EOSDIS GIBS</a>";

export const SATELLITE_TILE_SIZE = Number(
  process.env.NEXT_PUBLIC_SATELLITE_TILE_SIZE || 256
);

/** Native zoom ceiling of the configured satellite source. Above this the
 *  satellite layer fades out and the dark minimal base takes over. */
export const SATELLITE_MAX_ZOOM = Number(
  process.env.NEXT_PUBLIC_SATELLITE_MAX_ZOOM || 8
);

/** Raster paint treatment that turns daytime Blue Marble into the GEOM
 *  "dark satellite" look: desaturated, dimmed, slight contrast lift so
 *  deserts/ice/topography stay legible without a bright blue-marble feel. */
export const DARK_SATELLITE_PAINT = {
  "raster-saturation": -0.55,
  "raster-brightness-max": 0.52,
  "raster-brightness-min": 0.03,
  "raster-contrast": 0.16,
} as const;

/** Native MapLibre sky/atmosphere. Rendered by the engine, so the rim is
 *  always aligned with the globe silhouette at any pitch/zoom/resize. */
export const ATMOSPHERE = {
  "sky-color": "#0b1a24",
  "horizon-color": "#274b5e",
  "fog-color": "#0c1519",
  "sky-horizon-blend": 0.7,
  "horizon-fog-blend": 0.55,
  "fog-ground-blend": 0.85,
} as const;

/** Country context over satellite imagery. */
export const BOUNDARY_STYLE = {
  color: "#7e97a6",
  opacity: 0.28,
  width: 0.7,
} as const;

/** Not consumed yet — reserved for the planned semantic-zoom system
 *  (global / regional / local display modes). Safe to build against. */
export type SemanticZoomMode = "global" | "regional" | "local";
export const SEMANTIC_ZOOM = {
  globalMaxZoom: 2.8,
  regionalMaxZoom: 6.5,
} as const;

export function semanticMode(zoom: number): SemanticZoomMode {
  if (zoom <= SEMANTIC_ZOOM.globalMaxZoom) return "global";
  if (zoom <= SEMANTIC_ZOOM.regionalMaxZoom) return "regional";
  return "local";
}
