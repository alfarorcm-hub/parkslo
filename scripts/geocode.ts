/**
 * One-time geocoding pass for /data/parkslo-spots.csv.
 *
 * For every row with a blank lat/lng, geocodes `geo_a` (and `geo_b` too, for
 * geometry=segment rows) via OpenStreetMap Nominatim, rate-limited to one
 * request per second. Results are cached by address in
 * /data/geocode-cache.json so re-runs are instant and don't re-hit the API.
 *
 * Run with: npx tsx scripts/geocode.ts
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import Papa from "papaparse";

const DATA_DIR = path.join(__dirname, "..", "data");
const INPUT_CSV = path.join(DATA_DIR, "parkslo-spots.csv");
const OUTPUT_CSV = path.join(DATA_DIR, "parkslo-spots.geocoded.csv");
const CACHE_PATH = path.join(DATA_DIR, "geocode-cache.json");

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "parkslo-hackathon/1.0";
const SLO_VIEWBOX = "-120.72,35.33,-120.60,35.22";
const RATE_LIMIT_MS = 1000;

interface Coords {
  lat: number;
  lng: number;
}

type Cache = Record<string, Coords | null>;

function loadCache(): Cache {
  if (!existsSync(CACHE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CACHE_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function saveCache(cache: Cache) {
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function nominatimSearch(query: string): Promise<Coords | null> {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("format", "json");
  url.searchParams.set("q", query);
  url.searchParams.set("countrycodes", "us");
  url.searchParams.set("viewbox", SLO_VIEWBOX);
  url.searchParams.set("bounded", "1");
  url.searchParams.set("limit", "1");

  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) return null;

  const data = (await res.json()) as { lat: string; lon: string }[];
  if (data.length === 0) return null;
  return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
}

/** Geocodes one address, retrying "X & Y" intersections as "X and Y". */
async function geocodeAddress(address: string): Promise<Coords | null> {
  const direct = await nominatimSearch(address);
  if (direct) return direct;

  if (address.includes(" & ")) {
    await delay(RATE_LIMIT_MS);
    const retried = await nominatimSearch(address.replace(" & ", " and "));
    if (retried) return retried;
  }

  return null;
}

async function main() {
  const csvText = readFileSync(INPUT_CSV, "utf-8");
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });
  const rows = parsed.data;
  const fields = parsed.meta.fields ?? [];

  const cache = loadCache();

  const uniqueAddresses = new Set<string>();
  for (const row of rows) {
    if (row.geo_a?.trim()) uniqueAddresses.add(row.geo_a.trim());
    if (row.geometry === "segment" && row.geo_b?.trim()) {
      uniqueAddresses.add(row.geo_b.trim());
    }
  }

  const toGeocode = [...uniqueAddresses].filter((addr) => !(addr in cache));
  console.log(
    `${uniqueAddresses.size} unique address(es); ${toGeocode.length} not yet cached.`,
  );

  for (let i = 0; i < toGeocode.length; i++) {
    const address = toGeocode[i];
    if (i > 0) await delay(RATE_LIMIT_MS);
    try {
      const coords = await geocodeAddress(address);
      cache[address] = coords;
      console.log(
        coords
          ? `  ✓ ${address} -> ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
          : `  ✗ ${address} -> not found`,
      );
    } catch (err) {
      cache[address] = null;
      console.log(`  ✗ ${address} -> error: ${(err as Error).message}`);
    }
    saveCache(cache); // save incrementally so a crash doesn't lose progress
  }

  let geocodedRows = 0;
  let skippedRows = 0;
  const failedAddresses = new Set<string>();

  const outputRows = rows.map((row) => {
    const next = { ...row };
    const geoA = row.geo_a?.trim();
    const geoB = row.geo_b?.trim();

    if (geoA) {
      const coords = cache[geoA];
      if (coords) {
        next.lat = String(coords.lat);
        next.lng = String(coords.lng);
      } else {
        failedAddresses.add(geoA);
      }
    }

    if (row.geometry === "segment" && geoB) {
      const coords = cache[geoB];
      if (coords) {
        next.lat2 = String(coords.lat);
        next.lng2 = String(coords.lng);
      } else {
        failedAddresses.add(geoB);
      }
    }

    const hasRequiredCoords =
      next.lat &&
      next.lng &&
      (row.geometry !== "segment" || (next.lat2 && next.lng2));

    if (hasRequiredCoords) {
      geocodedRows++;
    } else {
      skippedRows++;
    }

    return next;
  });

  const outputCsv = Papa.unparse(outputRows, { columns: fields });
  writeFileSync(OUTPUT_CSV, outputCsv + "\n");

  console.log("\n--- Summary ---");
  console.log(`Rows with coordinates: ${geocodedRows}`);
  console.log(`Rows skipped (missing coordinates): ${skippedRows}`);
  if (failedAddresses.size > 0) {
    console.log("Addresses that failed to geocode:");
    for (const addr of failedAddresses) console.log(`  - ${addr}`);
  } else {
    console.log("All addresses geocoded successfully.");
  }
  console.log(`\nWrote ${OUTPUT_CSV}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
