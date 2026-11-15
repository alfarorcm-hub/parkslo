/**
 * Map tile provider config, isolated here so the source can be swapped
 * later (e.g. for Google Maps or a paid tile provider) without touching
 * the map component itself.
 *
 * Uses free, keyless OpenStreetMap raster tiles directly — no API key,
 * no rate-limit surprises. A CSS filter on the TileLayer (see
 * .parkslo-tiles in globals.css) mutes the default OSM palette so our
 * colored pins stay legible, without needing a styled/keyed basemap.
 */
export const tileLayerConfig = {
  url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
} as const;
