import type { Destination } from "../types";

export interface GeocodeProvider {
  search(query: string): Promise<Destination[]>;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { results: Destination[]; expiresAt: number }>();

/**
 * Client-side geocode provider backed by our /api/geocode proxy (which in
 * turn calls OpenStreetMap Nominatim). Swap this implementation for a
 * Google Places-backed one later without touching any calling UI.
 */
export class NominatimGeocodeProvider implements GeocodeProvider {
  async search(query: string): Promise<Destination[]> {
    const key = query.trim().toLowerCase();
    if (key.length < 2) return [];

    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.results;

    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      if (!res.ok) return [];
      const data = (await res.json()) as { results: Destination[] };
      cache.set(key, { results: data.results, expiresAt: Date.now() + CACHE_TTL_MS });
      return data.results;
    } catch {
      return [];
    }
  }
}

export const defaultGeocodeProvider: GeocodeProvider = new NominatimGeocodeProvider();
