import type { SpotKind } from "./types";

/**
 * Brand tokens as plain JS values. These mirror the CSS variables in
 * app/globals.css — use this file wherever a real color value is needed
 * (Leaflet markers/circles, inline SVG, canvas), and the CSS variables
 * everywhere else so the two never drift apart.
 */
export const brand = {
  navy: "#0B1B3B",
  mint: "#2EE6A6",
  pathBlue: "#5B8DEF",
  mist: "#EEF1F7",
  slate: "#4B5875",
  white: "#FFFFFF",
} as const;

export const status = {
  free: "#2EE6A6",
  paid: "#F5A524",
  accessible: "#2563EB",
  pickup: "#7C3AED",
  unknown: "#8A94A6",
} as const;

export type StatusKind = keyof typeof status;

/**
 * Maps a spot to its legend/status color. Accessible and loading spots keep
 * their category color regardless of cost; everything else (garage, lot,
 * street, motorcycle) is colored by whether this stay is free or paid.
 */
export function statusKindFor(kind: SpotKind, totalCost: number): StatusKind {
  if (kind === "loading") return "pickup";
  if (kind === "accessible") return "accessible";
  return totalCost > 0 ? "paid" : "free";
}

export const verdict = {
  ok: "#2EE6A6",
  warning: "#F5A524",
  notOk: "#EF4444",
} as const;

export const motion = {
  durationMs: 180,
  easing: "ease",
  chipPressScale: 0.97,
} as const;
