import type { Filters, MaxWalk, TripType } from "./types";

const WALK_VALUES: MaxWalk[] = [3, 5, 10, 15];
const TRIP_VALUES: TripType[] = ["park", "pickup", "accessible", "motorcycle"];

export interface SearchState {
  destId: string;
  filters: Filters;
}

export function encodeSearchParams(state: SearchState): URLSearchParams {
  const params = new URLSearchParams();
  params.set("dest", state.destId);
  params.set("trip", state.filters.tripType);
  params.set("walk", String(state.filters.maxWalk));
  params.set("free", state.filters.freeOnly ? "1" : "0");
  params.set("arrival", state.filters.arrival.toISOString());
  params.set("stay", String(state.filters.stayMinutes));
  return params;
}

function isTripType(value: string | null): value is TripType {
  return !!value && (TRIP_VALUES as string[]).includes(value);
}

function isMaxWalk(value: number): value is MaxWalk {
  return (WALK_VALUES as number[]).includes(value);
}

export function decodeSearchParams(
  params: URLSearchParams,
): SearchState | null {
  const destId = params.get("dest");
  if (!destId) return null;

  const tripRaw = params.get("trip");
  const tripType: TripType = isTripType(tripRaw) ? tripRaw : "park";

  const walkRaw = Number(params.get("walk"));
  const maxWalk: MaxWalk = isMaxWalk(walkRaw) ? walkRaw : 5;

  const freeOnly = params.get("free") === "1";

  const arrivalRaw = params.get("arrival");
  const arrival = arrivalRaw ? new Date(arrivalRaw) : new Date();

  const stayRaw = Number(params.get("stay"));
  const stayMinutes = Number.isFinite(stayRaw) && stayRaw > 0 ? stayRaw : 120;

  return {
    destId,
    filters: { tripType, maxWalk, freeOnly, arrival, stayMinutes },
  };
}
