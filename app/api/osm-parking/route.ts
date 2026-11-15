import { NextResponse } from "next/server";
import type { UnknownSpot } from "@/lib/types";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const USER_AGENT = "parkslo-hackathon/1.0";
const RADIUS_METERS = 800;
const CACHE_TTL_MS = 10 * 60 * 1000;

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const cache = new Map<string, { spots: UnknownSpot[]; expiresAt: number }>();

/** Rounds to ~111m precision so nearby requests share a cache entry. */
function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

function buildQuery(lat: number, lng: number): string {
  return `[out:json][timeout:10];(node["amenity"="parking"](around:${RADIUS_METERS},${lat},${lng});way["amenity"="parking"](around:${RADIUS_METERS},${lat},${lng}););out center;`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ spots: [] });
  }

  const key = cacheKey(lat, lng);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ spots: cached.spots });
  }

  try {
    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
      },
      body: `data=${encodeURIComponent(buildQuery(lat, lng))}`,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Overpass request failed: ${res.status}`);

    const data = (await res.json()) as { elements: OverpassElement[] };
    const spots: UnknownSpot[] = data.elements
      .map((el) => {
        const elLat = el.lat ?? el.center?.lat;
        const elLng = el.lon ?? el.center?.lon;
        if (elLat === undefined || elLng === undefined) return null;
        return {
          id: `osm-${el.type}-${el.id}`,
          name: el.tags?.name || "Parking",
          lat: elLat,
          lng: elLng,
          kind: "unknown" as const,
        };
      })
      .filter((s): s is UnknownSpot => s !== null);

    cache.set(key, { spots, expiresAt: Date.now() + CACHE_TTL_MS });
    return NextResponse.json({ spots });
  } catch (err) {
    console.warn("OSM parking lookup failed, skipping:", err);
    return NextResponse.json({ spots: [] });
  }
}
