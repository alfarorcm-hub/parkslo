import Papa from "papaparse";
import { z } from "zod";
import spotsJson from "@/data/spots.json";
import type { Rule, Spot, SpotGeometry, SpotKind } from "../types";

const KIND_VALUES = [
  "garage",
  "lot",
  "street",
  "loading",
  "green",
  "accessible",
] as const;

const GEOMETRY_VALUES = ["point", "segment"] as const;
const RULE_TYPE_VALUES = ["paid", "free", "no_parking", "loading", "unknown"] as const;

const RowSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  kind: z.enum(KIND_VALUES),
  geometry: z.enum(GEOMETRY_VALUES).optional(),
  geo_a: z.string().optional(),
  geo_b: z.string().optional(),
  lat: z.string().optional(),
  lng: z.string().optional(),
  lat2: z.string().optional(),
  lng2: z.string().optional(),
  rule_type: z.enum(RULE_TYPE_VALUES),
  days: z.string().trim().min(1),
  start: z.string().trim().regex(/^\d{1,2}:\d{2}$/),
  end: z.string().trim().regex(/^\d{1,2}:\d{2}$/),
  price_per_hour: z.coerce.number().optional(),
  max_minutes: z.string().optional(),
  daily_max: z.string().optional(),
  spaces: z.string().optional(),
  accessible_spaces: z.string().optional(),
  ev_chargers: z.string().optional(),
  clearance: z.string().optional(),
  placard_free: z.string().optional(),
  motorcycle_allowed: z.string().optional(),
  zone: z.string().optional(),
  notes: z.string().optional(),
  source: z.string().optional(),
  verified_on: z.string().optional(),
});

/** Parses "1-6" (range) and "0,6" (list) day specs, e.g. "1-5,0". */
function parseDays(raw: string): number[] {
  const days = new Set<number>();
  for (const token of raw.split(",")) {
    const t = token.trim();
    if (t === "") continue;
    if (t.includes("-")) {
      const [a, b] = t.split("-").map(Number);
      if (Number.isFinite(a) && Number.isFinite(b) && a <= b) {
        for (let d = a; d <= b; d++) days.add(d);
      }
    } else {
      const n = Number(t);
      if (Number.isFinite(n)) days.add(n);
    }
  }
  return [...days].filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b);
}

function parseYesNo(raw?: string): boolean {
  return (raw ?? "").trim().toLowerCase() === "yes";
}

function parseOptionalNumber(raw?: string): number | null {
  if (!raw || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function parseLat(raw?: string): number | null {
  if (!raw || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export interface CsvParseResult {
  spots: Spot[];
  /** 1-indexed CSV row numbers (header is row 1) that failed validation. */
  skippedRows: number[];
}

interface SpotAccumulator {
  base: Omit<Spot, "rules">;
  rules: Rule[];
}

/**
 * Parses the spots CSV (papaparse + zod), grouping multiple rows with the
 * same id into one spot with multiple rule windows. Invalid rows are
 * skipped, not fatal — a bad row in one line shouldn't take down the app.
 * Rows missing coordinates (geocoding failed) are skipped with a warning.
 */
export function parseSpotsCsv(csvText: string): CsvParseResult {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const skippedRows: number[] = [];
  const byId = new Map<string, SpotAccumulator>();

  parsed.data.forEach((rawRow, index) => {
    const rowNumber = index + 2; // +1 for header row, +1 for 1-indexing

    const result = RowSchema.safeParse(rawRow);
    if (!result.success) {
      skippedRows.push(rowNumber);
      return;
    }
    const row = result.data;

    const days = parseDays(row.days);
    if (days.length === 0) {
      skippedRows.push(rowNumber);
      return;
    }

    const geometry: SpotGeometry = row.geometry === "segment" ? "segment" : "point";
    const lat = parseLat(row.lat);
    const lng = parseLat(row.lng);
    const lat2 = parseLat(row.lat2);
    const lng2 = parseLat(row.lng2);

    if (lat === null || lng === null || (geometry === "segment" && (lat2 === null || lng2 === null))) {
      console.warn(`Skipping "${row.name}" (row ${rowNumber}) — missing coordinates`);
      skippedRows.push(rowNumber);
      return;
    }

    const isIllegal = row.rule_type === "no_parking";
    const isUnknown = row.rule_type === "unknown";
    const rule: Rule = {
      days,
      start: row.start,
      end: row.end,
      pricePerHour: row.rule_type === "paid" ? (row.price_per_hour ?? 0) : 0,
      maxMinutes: parseOptionalNumber(row.max_minutes),
      dailyMax: parseOptionalNumber(row.daily_max),
      illegal: isIllegal || undefined,
      unknown: isUnknown || undefined,
      label: isIllegal || isUnknown ? row.notes || undefined : undefined,
    };

    const existing = byId.get(row.id);
    if (existing) {
      existing.rules.push(rule);
      return;
    }

    byId.set(row.id, {
      base: {
        id: row.id,
        name: row.name,
        kind: row.kind as SpotKind,
        lat,
        lng,
        geometry,
        ...(geometry === "segment" ? { lat2: lat2!, lng2: lng2! } : {}),
        tags: {
          accessible: row.kind === "accessible",
          loading: row.kind === "loading",
          motorcycle: parseYesNo(row.motorcycle_allowed),
        },
        spaces: parseOptionalNumber(row.spaces),
        accessibleSpaces: parseOptionalNumber(row.accessible_spaces),
        evChargers: parseOptionalNumber(row.ev_chargers),
        clearance: row.clearance || null,
        placardFree: parseYesNo(row.placard_free),
        motorcycleAllowed: row.motorcycle_allowed ? parseYesNo(row.motorcycle_allowed) : true,
        zone: row.zone || null,
        notes: row.notes ?? "",
        source: row.source ?? "",
        verified: !!row.verified_on,
        verifiedOn: row.verified_on || null,
      },
      rules: [rule],
    });
  });

  const spots: Spot[] = Array.from(byId.values()).map(({ base, rules }) => ({
    ...base,
    rules,
  }));

  return { spots, skippedRows };
}

/** The bundled sample data, used as a last resort if no CSV source is usable. */
export function fallbackSpots(): Spot[] {
  return spotsJson as Spot[];
}
