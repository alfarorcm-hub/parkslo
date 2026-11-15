import type { LatLng, UnknownSpot } from "../types";

export interface NearbyParkingProvider {
  nearby(dest: LatLng): Promise<UnknownSpot[]>;
}

/**
 * Client-side provider for nearby parking of unknown rules, backed by our
 * /api/osm-parking proxy (OpenStreetMap Overpass). Used to fill in gaps
 * when our own spot data has too few options nearby.
 */
export class OverpassParkingProvider implements NearbyParkingProvider {
  async nearby(dest: LatLng): Promise<UnknownSpot[]> {
    try {
      const res = await fetch(`/api/osm-parking?lat=${dest.lat}&lng=${dest.lng}`);
      if (!res.ok) return [];
      const data = (await res.json()) as { spots: UnknownSpot[] };
      return data.spots;
    } catch {
      return [];
    }
  }
}

export const defaultNearbyParkingProvider: NearbyParkingProvider =
  new OverpassParkingProvider();
