import L from "leaflet";
import { status, type StatusKind } from "@/lib/theme";

/** Navy teardrop pin with a mint dot, matching the app's wordmark glyph. */
export function destinationIcon(): L.DivIcon {
  const html = `
    <svg width="36" height="46" viewBox="0 0 36 46" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 0C8 0 0 7.6 0 17c0 12.8 18 29 18 29s18-16.2 18-29C36 7.6 28 0 18 0z" fill="#0B1B3B"/>
      <circle cx="18" cy="17" r="6" fill="#FFFFFF"/>
      <circle cx="18" cy="17" r="2.6" fill="#2EE6A6"/>
    </svg>`;
  return L.divIcon({
    html,
    className: "parkslo-marker",
    iconSize: [36, 46],
    iconAnchor: [18, 46],
  });
}

const UNKNOWN_COLOR = status.unknown;

/** Numbered, color-coded circle pin for a ranked known spot. */
export function numberedSpotIcon(
  statusKind: StatusKind,
  index: number,
  selected: boolean,
): L.DivIcon {
  const size = selected ? 32 : 26;
  const color = status[statusKind];
  const html = `
    <div style="
      width:${size}px;height:${size}px;border-radius:9999px;
      background:${color};border:2.5px solid #FFFFFF;
      box-shadow:0 1px 4px rgba(11,27,59,0.35);
      display:flex;align-items:center;justify-content:center;
      font-family:var(--font-sans, sans-serif);font-weight:800;
      font-size:${selected ? 13 : 11}px;color:#0B1B3B;
    ">${index}</div>`;
  return L.divIcon({
    html,
    className: "parkslo-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/** Gray dot for an OSM spot of unknown rules. */
export function unknownSpotIcon(): L.DivIcon {
  const html = `
    <div style="
      width:18px;height:18px;border-radius:9999px;
      background:${UNKNOWN_COLOR};border:2px solid #FFFFFF;
      box-shadow:0 1px 3px rgba(11,27,59,0.3);
    "></div>`;
  return L.divIcon({
    html,
    className: "parkslo-marker",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}
