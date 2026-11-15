import { NextResponse } from "next/server";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "parkslo-hackathon/1.0";
// Rough bounding box around San Luis Obispo city limits: left,top,right,bottom (lon,lat,lon,lat).
const SLO_VIEWBOX = "-120.72,35.33,-120.60,35.22";
const MIN_INTERVAL_MS = 1000;
const CACHE_TTL_MS = 5 * 60 * 1000;

export interface GeocodeResult {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

const cache = new Map<string, { results: GeocodeResult[]; expiresAt: number }>();
let lastRequestAt = 0;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchFromNominatim(query: string): Promise<GeocodeResult[]> {
  const wait = MIN_INTERVAL_MS - (Date.now() - lastRequestAt);
  if (wait > 0) await delay(wait);
  lastRequestAt = Date.now();

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("format", "json");
  url.searchParams.set("q", query);
  url.searchParams.set("countrycodes", "us");
  url.searchParams.set("viewbox", SLO_VIEWBOX);
  url.searchParams.set("bounded", "1");
  url.searchParams.set("limit", "6");

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Nominatim request failed: ${res.status}`);

  const data = (await res.json()) as NominatimResult[];
  return data.map((r) => ({
    id: String(r.place_id),
    name: r.display_name,
    lat: Number(r.lat),
    lng: Number(r.lon),
  }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const key = q.toLowerCase();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ results: cached.results });
  }

  try {
    const results = await fetchFromNominatim(q);
    cache.set(key, { results, expiresAt: Date.now() + CACHE_TTL_MS });
    return NextResponse.json({ results });
  } catch (err) {
    console.warn("Geocode lookup failed:", err);
    return NextResponse.json({ results: [] });
  }
}
