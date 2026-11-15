import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { fallbackSpots, parseSpotsCsv } from "@/lib/providers/spots-source";
import type { Spot } from "@/lib/types";

const CACHE_TTL_MS = 5 * 60 * 1000;
const BUNDLED_CSV_PATH = path.join(process.cwd(), "data", "parkslo-spots.geocoded.csv");

export type SpotsSource = "remote-csv" | "bundled-csv" | "sample";

let cache: { spots: Spot[]; source: SpotsSource; expiresAt: number } | null = null;

function loadBundledCsv(): Spot[] {
  const csvText = readFileSync(BUNDLED_CSV_PATH, "utf-8");
  const { spots, skippedRows } = parseSpotsCsv(csvText);
  for (const row of skippedRows) {
    console.warn(`Skipped invalid spot row in parkslo-spots.geocoded.csv: ${row}`);
  }
  return spots;
}

async function loadSpots(): Promise<{ spots: Spot[]; source: SpotsSource }> {
  const csvUrl = process.env.SPOTS_CSV_URL;

  if (csvUrl) {
    try {
      const res = await fetch(csvUrl, { cache: "no-store" });
      if (!res.ok) throw new Error(`CSV fetch failed: ${res.status}`);
      const csvText = await res.text();
      const { spots, skippedRows } = parseSpotsCsv(csvText);

      for (const row of skippedRows) {
        console.warn(`Skipped invalid spot row: ${row}`);
      }

      if (spots.length > 0) return { spots, source: "remote-csv" };
    } catch (err) {
      console.warn("Remote SPOTS_CSV_URL failed, falling back to bundled data:", err);
    }
  }

  try {
    const spots = loadBundledCsv();
    if (spots.length > 0) return { spots, source: "bundled-csv" };
  } catch (err) {
    console.warn("Bundled parkslo-spots.geocoded.csv failed to load:", err);
  }

  return { spots: fallbackSpots(), source: "sample" };
}

export async function GET() {
  const now = Date.now();
  if (!cache || cache.expiresAt < now) {
    const { spots, source } = await loadSpots();
    cache = { spots, source, expiresAt: now + CACHE_TTL_MS };
  }

  return NextResponse.json({ spots: cache.spots, source: cache.source });
}
