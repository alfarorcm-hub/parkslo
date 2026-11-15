import { describe, expect, it, vi } from "vitest";
import {
  describeRule,
  evaluate,
  hoursMinutesToStayMinutes,
  plainEnglish,
  rank,
  walkMinutes,
} from "./rules";
import { parseSpotsCsv } from "./providers/spots-source";
import type {
  Destination,
  Filters,
  LatLng,
  Rule,
  Spot,
  WalkTimeProvider,
} from "./types";

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5, 6];

function makeSpot(overrides: Partial<Spot> & { rules: Rule[] }): Spot {
  return {
    id: "spot",
    name: "Test Spot",
    kind: "lot",
    lat: 35.28,
    lng: -120.66,
    notes: "",
    source: "SAMPLE - replace with city data",
    verified: false,
    verifiedOn: null,
    ...overrides,
  };
}

const dest: Destination = {
  id: "dest",
  name: "Test Destination",
  lat: 35.28,
  lng: -120.66,
};

// Monday, Jan 1 2024
function mondayAt(hour: number, minute = 0): Date {
  return new Date(2024, 0, 1, hour, minute, 0);
}

// Sunday, Jan 7 2024
function sundayAt(hour: number, minute = 0): Date {
  return new Date(2024, 0, 7, hour, minute, 0);
}

function makeProvider(distances: Record<string, number>): WalkTimeProvider {
  return {
    walkMinutes: (_dest, spot) => distances[(spot as Spot).id] ?? 0,
    walkTimes: (_dest, spots) => spots.map((s) => distances[(s as Spot).id] ?? 0),
  };
}

function baseFilters(overrides: Partial<Filters>): Filters {
  return {
    specials: [],
    maxWalk: 10,
    freeOnly: false,
    arrival: mondayAt(10),
    stayMinutes: 60,
    hasPlacard: false,
    ...overrides,
  };
}

describe("evaluate", () => {
  it("arriving 5:30 PM when metered until 6 PM charges only the metered minutes and reports freeAfter", () => {
    const spot = makeSpot({
      id: "street",
      kind: "street",
      rules: [
        {
          days: WEEKDAYS,
          start: "09:00",
          end: "18:00",
          pricePerHour: 1.5,
          maxMinutes: 120,
        },
      ],
    });

    const result = evaluate(spot, mondayAt(17, 30), 60);

    expect(result.legal).toBe(true);
    expect(result.totalCost).toBeCloseTo(0.75, 2);
    expect(result.freeAfter).toBe("6:00 PM");
  });

  it("applies no rule on a day the rule doesn't cover (Sunday), so parking is free", () => {
    const spot = makeSpot({
      id: "street",
      kind: "street",
      rules: [
        {
          days: WEEKDAYS,
          start: "09:00",
          end: "18:00",
          pricePerHour: 1.5,
          maxMinutes: 120,
        },
      ],
    });

    const result = evaluate(spot, sundayAt(10), 120);

    expect(result.legal).toBe(true);
    expect(result.totalCost).toBe(0);
    expect(result.freeAfter).toBeNull();
  });

  it("flags a 3-hour stay as illegal against a 2-hour limit", () => {
    const spot = makeSpot({
      id: "street",
      kind: "street",
      rules: [
        {
          days: WEEKDAYS,
          start: "09:00",
          end: "18:00",
          pricePerHour: 1.5,
          maxMinutes: 120,
        },
      ],
    });

    const result = evaluate(spot, mondayAt(10), 180);

    expect(result.legal).toBe(false);
    expect(result.reason).toMatch(/120-minute limit/);
  });

  it("computes cost correctly across a metered-to-free window boundary", () => {
    const spot = makeSpot({
      id: "lot",
      kind: "lot",
      rules: [
        {
          days: WEEKDAYS,
          start: "09:00",
          end: "18:00",
          pricePerHour: 2.4,
          maxMinutes: null,
        },
      ],
    });

    // 17:45 -> 18:15: 15 priced minutes, then 15 free minutes.
    const result = evaluate(spot, mondayAt(17, 45), 30);

    expect(result.legal).toBe(true);
    expect(result.totalCost).toBeCloseTo(0.6, 2);
    expect(result.freeAfter).toBe("6:00 PM");
  });
});

describe("describeRule", () => {
  it("formats a paid weekday rule compactly", () => {
    expect(
      describeRule({ days: WEEKDAYS, start: "09:00", end: "21:00", pricePerHour: 2.75, maxMinutes: 180 }),
    ).toBe("Mon–Sat 9 AM–9 PM · $2.75/hr · 3-hr max");
  });

  it("formats a no-parking window using its label", () => {
    expect(
      describeRule({
        days: [4],
        start: "17:00",
        end: "21:00",
        pricePerHour: 0,
        maxMinutes: null,
        illegal: true,
        label: "Tow-away Thursdays 5–9 PM (Farmers' Market)",
      }),
    ).toBe("Tow-away Thursdays 5–9 PM (Farmers' Market)");
  });

  it("formats an all-day free rule without a redundant time range", () => {
    expect(
      describeRule({ days: ALL_DAYS, start: "00:00", end: "24:00", pricePerHour: 0, maxMinutes: 15 }),
    ).toBe("Every day all day · Free · 15-min max");
  });
});

describe("hoursMinutesToStayMinutes", () => {
  it("combines the hours (0-12) and minutes (0-55, step 5) duration pickers", () => {
    expect(hoursMinutesToStayMinutes(2, 30)).toBe(150);
    expect(hoursMinutesToStayMinutes(0, 45)).toBe(45);
    expect(hoursMinutesToStayMinutes(12, 0)).toBe(720);
    expect(hoursMinutesToStayMinutes(0, 0)).toBe(0);
  });
});

describe("plainEnglish", () => {
  it("summarizes an illegal stay with the reason", () => {
    const spot = makeSpot({
      id: "street",
      kind: "street",
      rules: [
        {
          days: WEEKDAYS,
          start: "09:00",
          end: "18:00",
          pricePerHour: 1.5,
          maxMinutes: 120,
        },
      ],
    });
    const evaluation = evaluate(spot, mondayAt(10), 180);
    expect(plainEnglish(spot, evaluation)).toMatch(/Not legal/);
  });

  it("summarizes a legal paid stay with cost and limit info", () => {
    const spot = makeSpot({
      id: "street",
      kind: "street",
      rules: [
        {
          days: WEEKDAYS,
          start: "09:00",
          end: "18:00",
          pricePerHour: 1.5,
          maxMinutes: 120,
        },
      ],
    });
    const evaluation = evaluate(spot, mondayAt(17, 30), 60);
    const line = plainEnglish(spot, evaluation);
    expect(line).toContain("OK until 6:00 PM");
    expect(line).toContain("$0.75 total");
    expect(line).toContain("2-hr limit until 6:00 PM");
  });
});

describe("rank", () => {
  it("sorts results by walk time ascending, then by cost", () => {
    const far = makeSpot({
      id: "far",
      kind: "lot",
      rules: [{ days: ALL_DAYS, start: "00:00", end: "23:59", pricePerHour: 0, maxMinutes: null }],
    });
    const near = makeSpot({
      id: "near",
      kind: "lot",
      rules: [{ days: ALL_DAYS, start: "00:00", end: "23:59", pricePerHour: 0, maxMinutes: null }],
    });
    const middle = makeSpot({
      id: "middle",
      kind: "lot",
      rules: [{ days: ALL_DAYS, start: "00:00", end: "23:59", pricePerHour: 0, maxMinutes: null }],
    });

    const provider = makeProvider({ far: 9, near: 1, middle: 5 });
    const result = rank([far, near, middle], dest, baseFilters({}), provider);

    expect(result.top.map((r) => r.spot.id)).toEqual(["near", "middle", "far"]);
  });

  it("widens the walk radius to the nearest free spot (exact minutes, capped at 15) when freeOnly filters out everything nearby", () => {
    const paidNearby = makeSpot({
      id: "paid-nearby",
      kind: "lot",
      rules: [
        { days: ALL_DAYS, start: "00:00", end: "23:59", pricePerHour: 1.5, maxMinutes: null },
      ],
    });
    const freeFarther = makeSpot({
      id: "free-farther",
      kind: "lot",
      rules: [
        { days: ALL_DAYS, start: "00:00", end: "23:59", pricePerHour: 0, maxMinutes: null },
      ],
    });

    const provider = makeProvider({ "paid-nearby": 2, "free-farther": 8 });
    const filters = baseFilters({ maxWalk: 3, freeOnly: true });

    const result = rank([paidNearby, freeFarther], dest, filters, provider);

    expect(result.widenedTo).toBe(8);
    expect(result.top).toHaveLength(1);
    expect(result.top[0].spot.id).toBe("free-farther");
  });

  it("does not widen past the 15-minute ceiling", () => {
    const paidNearby = makeSpot({
      id: "paid-nearby",
      kind: "lot",
      rules: [
        { days: ALL_DAYS, start: "00:00", end: "23:59", pricePerHour: 1.5, maxMinutes: null },
      ],
    });
    const freeTooFar = makeSpot({
      id: "free-too-far",
      kind: "lot",
      rules: [
        { days: ALL_DAYS, start: "00:00", end: "23:59", pricePerHour: 0, maxMinutes: null },
      ],
    });

    const provider = makeProvider({ "paid-nearby": 2, "free-too-far": 18 });
    const filters = baseFilters({ maxWalk: 3, freeOnly: true });

    const result = rank([paidNearby, freeTooFar], dest, filters, provider);

    expect(result.widenedTo).toBeNull();
    expect(result.top).toHaveLength(0);
  });

  it("pickup/drop-off spots ignore the requested stay length and price filter", () => {
    const loading = makeSpot({
      id: "loading",
      kind: "loading",
      rules: [{ days: ALL_DAYS, start: "00:00", end: "23:59", pricePerHour: 0, maxMinutes: 5 }],
    });
    const street = makeSpot({
      id: "street",
      kind: "street",
      rules: [
        { days: WEEKDAYS, start: "09:00", end: "18:00", pricePerHour: 1.5, maxMinutes: 120 },
      ],
    });

    const provider = makeProvider({ loading: 1, street: 1 });
    // A huge stayMinutes would normally blow the loading zone's 5-minute limit,
    // but pickup spots should ignore it entirely.
    const filters = baseFilters({ specials: ["pickup"], stayMinutes: 500 });

    const result = rank([loading, street], dest, filters, provider);

    expect(result.top.map((r) => r.spot.kind)).toEqual(["loading"]);
  });

  it("Special multi-select shows the union of selected categories", () => {
    const accessible = makeSpot({
      id: "accessible",
      kind: "accessible",
      rules: [{ days: ALL_DAYS, start: "00:00", end: "23:59", pricePerHour: 0, maxMinutes: null }],
    });
    const lotAllowsMotorcycles = makeSpot({
      id: "lot-moto-ok",
      kind: "lot",
      motorcycleAllowed: true,
      rules: [{ days: ALL_DAYS, start: "00:00", end: "23:59", pricePerHour: 0, maxMinutes: null }],
    });
    const lotNoMotorcycles = makeSpot({
      id: "lot-moto-no",
      kind: "lot",
      motorcycleAllowed: false,
      rules: [{ days: ALL_DAYS, start: "00:00", end: "23:59", pricePerHour: 0, maxMinutes: null }],
    });

    const provider = makeProvider({ accessible: 1, "lot-moto-ok": 1, "lot-moto-no": 1 });
    const filters = baseFilters({ specials: ["accessible", "motorcycle"] });

    const result = rank(
      [accessible, lotAllowsMotorcycles, lotNoMotorcycles],
      dest,
      filters,
      provider,
    );

    // Motorcycle isn't its own category — it filters general parking down to
    // spots that allow motorcycles, unioned with the accessible category.
    expect(new Set(result.top.map((r) => r.spot.id))).toEqual(
      new Set(["accessible", "lot-moto-ok"]),
    );
  });

  it("EV charging special shows only general spots with chargers", () => {
    const evLot = makeSpot({
      id: "ev-lot",
      kind: "lot",
      evChargers: 2,
      rules: [{ days: ALL_DAYS, start: "00:00", end: "23:59", pricePerHour: 0, maxMinutes: null }],
    });
    const plainLot = makeSpot({
      id: "plain-lot",
      kind: "lot",
      rules: [{ days: ALL_DAYS, start: "00:00", end: "23:59", pricePerHour: 0, maxMinutes: null }],
    });

    const provider = makeProvider({ "ev-lot": 1, "plain-lot": 1 });
    const filters = baseFilters({ specials: ["ev"] });

    const result = rank([evLot, plainLot], dest, filters, provider);

    expect(result.top.map((r) => r.spot.id)).toEqual(["ev-lot"]);
  });

  it("includes a spot via its CSV tag even when its kind differs (e.g. a garage with accessible stalls)", () => {
    const taggedGarage = makeSpot({
      id: "tagged-garage",
      kind: "garage",
      tags: { accessible: true, loading: false, motorcycle: false },
      rules: [{ days: ALL_DAYS, start: "00:00", end: "23:59", pricePerHour: 0, maxMinutes: null }],
    });

    const provider = makeProvider({ "tagged-garage": 1 });
    const filters = baseFilters({ specials: ["accessible"] });

    const result = rank([taggedGarage], dest, filters, provider);

    expect(result.top.map((r) => r.spot.id)).toEqual(["tagged-garage"]);
  });

  it("returns an empty result (no widening) when nothing matches and freeOnly is off", () => {
    const tooFar = makeSpot({
      id: "too-far",
      kind: "lot",
      rules: [{ days: ALL_DAYS, start: "00:00", end: "23:59", pricePerHour: 0, maxMinutes: null }],
    });

    const provider = makeProvider({ "too-far": 20 });
    const filters = baseFilters({ maxWalk: 3 });

    const result = rank([tooFar], dest, filters, provider);

    expect(result.top).toEqual([]);
    expect(result.more).toEqual([]);
    expect(result.widenedTo).toBeNull();
  });
});

describe("walkMinutes", () => {
  it("returns 0 for identical coordinates and increases with distance", () => {
    const same: LatLng = { lat: dest.lat, lng: dest.lng };
    const farther: LatLng = { lat: dest.lat + 0.01, lng: dest.lng };

    expect(walkMinutes(dest, same)).toBe(0);
    expect(walkMinutes(dest, farther)).toBeGreaterThan(0);
  });
});

describe("real-data scenarios", () => {
  // Higuera St, core block (real SLO downtown-core rate): metered Mon-Sat
  // 9 AM-9 PM, 3-hr max, $2.75/hr, plus a Thursday tow-away for the
  // Farmers' Market that overrides the meter rule.
  const higueraCore = makeSpot({
    id: "higuera-800-core",
    kind: "street",
    zone: "core",
    placardFree: true,
    rules: [
      { days: WEEKDAYS, start: "09:00", end: "21:00", pricePerHour: 2.75, maxMinutes: 180 },
      {
        days: [4],
        start: "17:00",
        end: "21:00",
        pricePerHour: 0,
        maxMinutes: null,
        illegal: true,
        label: "Tow-away Thursdays 5–9 PM (Farmers' Market)",
      },
    ],
  });

  // Higuera St, perimeter block (Osos-Santa Rosa, real outer-SLO rate):
  // outside the market closure, 10-hr max, cheaper rate.
  const higueraPerimeter = makeSpot({
    id: "higuera-800-perimeter",
    kind: "street",
    zone: "perimeter",
    rules: [{ days: WEEKDAYS, start: "09:00", end: "21:00", pricePerHour: 2.25, maxMinutes: 600 }],
  });

  // Real SLO garage rate: $2/hr, $8 daily max, no time limit (gated, paid on exit).
  const garage = makeSpot({
    id: "garage-marsh",
    kind: "garage",
    rules: [
      { days: ALL_DAYS, start: "00:00", end: "24:00", pricePerHour: 2.0, maxMinutes: null, dailyMax: 8 },
    ],
  });

  // Weekday hours are permit-only / unposted; free on the weekend.
  const cityHallLot = makeSpot({
    id: "city-hall-lot",
    kind: "lot",
    rules: [
      { days: WEEKDAYS.filter((d) => d !== 6), start: "09:00", end: "17:00", pricePerHour: 0, maxMinutes: null, unknown: true },
    ],
  });

  it("garage charges the full rate up to its daily max ($8 for 10 hours)", () => {
    const result = evaluate(garage, mondayAt(8), 600);
    expect(result.legal).toBe(true);
    expect(result.totalCost).toBeCloseTo(8, 2);
  });

  it("Higuera core block is illegal Thursday 6 PM (tow-away for the Farmers' Market)", () => {
    const result = evaluate(higueraCore, new Date(2024, 0, 4, 18, 0), 15);
    expect(result.legal).toBe(false);
    expect(result.reason).toMatch(/Tow-away Thursdays/);
  });

  it("Higuera perimeter block is legal Thursday 6 PM (outside the closure)", () => {
    const result = evaluate(higueraPerimeter, new Date(2024, 0, 4, 18, 0), 15);
    expect(result.legal).toBe(true);
  });

  it("Higuera core block: a 4-hour stay is illegal against its 3-hour max", () => {
    const result = evaluate(higueraCore, mondayAt(10), 240);
    expect(result.legal).toBe(false);
  });

  it("Higuera perimeter block: a 4-hour stay is legal at $9.00", () => {
    const result = evaluate(higueraPerimeter, mondayAt(10), 240);
    expect(result.legal).toBe(true);
    expect(result.totalCost).toBeCloseTo(9.0, 2);
  });

  it("City Hall Lot is unknown on a weekday afternoon", () => {
    const result = evaluate(cityHallLot, new Date(2024, 0, 2, 14, 0), 30); // Tuesday
    expect(result.legal).toBe(true);
    expect(result.hasUnknownWindow).toBe(true);
    expect(result.totalCost).toBe(0);
    expect(plainEnglish(cityHallLot, result)).toMatch(/Rules not listed/);
  });

  it("City Hall Lot is free on Saturday", () => {
    const result = evaluate(cityHallLot, new Date(2024, 0, 6, 11, 0), 60); // Saturday
    expect(result.legal).toBe(true);
    expect(result.hasUnknownWindow).toBe(false);
    expect(result.totalCost).toBe(0);
  });

  it("a disabled placard makes a placard-free meter free with no time limit", () => {
    const result = evaluate(higueraCore, mondayAt(10), 240, { hasPlacard: true });
    expect(result.legal).toBe(true);
    expect(result.totalCost).toBe(0);
  });

  it("a disabled placard does not exempt a garage (placardFree is not set)", () => {
    const result = evaluate(garage, mondayAt(10), 60, { hasPlacard: true });
    expect(result.totalCost).toBeCloseTo(2.0, 2);
  });

  it("ranks an unknown-rules spot after a confidently-legal one even if it's closer", () => {
    const freeLot = makeSpot({
      id: "free-lot",
      kind: "lot",
      rules: [{ days: ALL_DAYS, start: "00:00", end: "23:59", pricePerHour: 0, maxMinutes: null }],
    });
    const provider = makeProvider({ "city-hall-lot": 1, "free-lot": 5 });
    const filters = baseFilters({ arrival: new Date(2024, 0, 2, 14, 0) }); // Tuesday 2 PM

    const result = rank([cityHallLot, freeLot], dest, filters, provider);

    expect(result.top.map((r) => r.spot.id)).toEqual(["free-lot", "city-hall-lot"]);
  });
});

describe("parseSpotsCsv", () => {
  const COLUMNS = [
    "id",
    "name",
    "kind",
    "geometry",
    "geo_a",
    "geo_b",
    "lat",
    "lng",
    "lat2",
    "lng2",
    "rule_type",
    "days",
    "start",
    "end",
    "price_per_hour",
    "max_minutes",
    "daily_max",
    "spaces",
    "accessible_spaces",
    "ev_chargers",
    "clearance",
    "placard_free",
    "motorcycle_allowed",
    "zone",
    "notes",
    "source",
    "verified_on",
  ] as const;

  function csvRow(fields: Partial<Record<(typeof COLUMNS)[number], string>>): string {
    return COLUMNS.map((col) => {
      const value = fields[col] ?? "";
      return value.includes(",") ? `"${value}"` : value;
    }).join(",");
  }

  function buildCsv(rows: Partial<Record<(typeof COLUMNS)[number], string>>[]): string {
    return [COLUMNS.join(","), ...rows.map(csvRow)].join("\n");
  }

  it("parses a valid paid row into a spot with all its metadata", () => {
    const csv = buildCsv([
      {
        id: "garage-1",
        name: "Test Garage",
        kind: "garage",
        geometry: "point",
        lat: "35.28",
        lng: "-120.66",
        rule_type: "paid",
        days: "1-6",
        start: "07:00",
        end: "21:00",
        price_per_hour: "1.5",
        daily_max: "8",
        spaces: "50",
        accessible_spaces: "2",
        ev_chargers: "1",
        clearance: "6'10\"",
        placard_free: "no",
        motorcycle_allowed: "yes",
        zone: "downtown",
        notes: "Notes",
        source: "City",
        verified_on: "2026-01-01",
      },
    ]);

    const { spots, skippedRows } = parseSpotsCsv(csv);

    expect(skippedRows).toEqual([]);
    expect(spots).toHaveLength(1);
    expect(spots[0]).toMatchObject({
      id: "garage-1",
      name: "Test Garage",
      kind: "garage",
      lat: 35.28,
      lng: -120.66,
      verified: true,
      verifiedOn: "2026-01-01",
      spaces: 50,
      accessibleSpaces: 2,
      evChargers: 1,
      clearance: "6'10\"",
      placardFree: false,
      motorcycleAllowed: true,
      zone: "downtown",
    });
    expect(spots[0].rules[0]).toMatchObject({
      days: [1, 2, 3, 4, 5, 6],
      start: "07:00",
      end: "21:00",
      pricePerHour: 1.5,
      maxMinutes: null,
      dailyMax: 8,
    });
  });

  it("maps rule_type to illegal/unknown rules with the notes column as the label", () => {
    const csv = buildCsv([
      {
        id: "tow-away-1",
        name: "Thursday Market Block",
        kind: "street",
        geometry: "point",
        lat: "35.28",
        lng: "-120.66",
        rule_type: "no_parking",
        days: "4",
        start: "17:00",
        end: "21:00",
        notes: "Tow-away Thursdays 5-9 PM (Farmers' Market)",
      },
    ]);

    const { spots } = parseSpotsCsv(csv);

    expect(spots[0].rules[0]).toMatchObject({
      illegal: true,
      label: "Tow-away Thursdays 5-9 PM (Farmers' Market)",
      pricePerHour: 0,
    });
  });

  it("skips invalid rows (bad kind, missing id) and reports their row numbers only", () => {
    const csv = buildCsv([
      {
        id: "garage-1",
        name: "Test Garage",
        kind: "garage",
        geometry: "point",
        lat: "35.28",
        lng: "-120.66",
        rule_type: "paid",
        days: "1-6",
        start: "07:00",
        end: "21:00",
        price_per_hour: "1.5",
      },
      {
        id: "",
        name: "Missing Id",
        kind: "garage",
        geometry: "point",
        lat: "35.28",
        lng: "-120.66",
        rule_type: "paid",
        days: "1-6",
        start: "07:00",
        end: "21:00",
      },
      {
        id: "bad-kind-1",
        name: "Bad Kind",
        kind: "spaceship",
        geometry: "point",
        lat: "35.28",
        lng: "-120.66",
        rule_type: "paid",
        days: "1-6",
        start: "07:00",
        end: "21:00",
      },
    ]);

    const { spots, skippedRows } = parseSpotsCsv(csv);

    expect(spots).toHaveLength(1);
    expect(spots[0].id).toBe("garage-1");
    // Row 3 (missing id) and row 4 (bad kind) should be skipped.
    expect(skippedRows).toEqual([3, 4]);
  });

  it("skips rows with missing coordinates (geocoding failed) and warns", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const csv = buildCsv([
      {
        id: "ungeocoded-1",
        name: "Unknown Address",
        kind: "lot",
        geometry: "point",
        lat: "",
        lng: "",
        rule_type: "paid",
        days: "1-6",
        start: "07:00",
        end: "21:00",
      },
    ]);

    const { spots, skippedRows } = parseSpotsCsv(csv);

    expect(spots).toHaveLength(0);
    expect(skippedRows).toEqual([2]);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("groups multiple rows with the same id into one spot with multiple rule windows", () => {
    const csv = buildCsv([
      {
        id: "street-1",
        name: "Multi Window Street",
        kind: "street",
        geometry: "point",
        lat: "35.28",
        lng: "-120.66",
        rule_type: "paid",
        days: "1-5",
        start: "09:00",
        end: "18:00",
        price_per_hour: "1.5",
        max_minutes: "120",
        notes: "Weekday",
      },
      {
        id: "street-1",
        name: "Multi Window Street",
        kind: "street",
        geometry: "point",
        lat: "35.28",
        lng: "-120.66",
        rule_type: "paid",
        days: "0,6",
        start: "10:00",
        end: "16:00",
        price_per_hour: "0.75",
        max_minutes: "60",
        notes: "Weekend",
      },
    ]);

    const { spots, skippedRows } = parseSpotsCsv(csv);

    expect(skippedRows).toEqual([]);
    expect(spots).toHaveLength(1);
    expect(spots[0].rules).toHaveLength(2);
    expect(spots[0].rules[0].days).toEqual([1, 2, 3, 4, 5]);
    expect(spots[0].rules[1].pricePerHour).toBe(0.75);
  });

  it("parses a segment geometry spot with both endpoints", () => {
    const csv = buildCsv([
      {
        id: "segment-1",
        name: "Block-long curb",
        kind: "street",
        geometry: "segment",
        lat: "35.280",
        lng: "-120.660",
        lat2: "35.281",
        lng2: "-120.661",
        rule_type: "free",
        days: "0-6",
        start: "00:00",
        end: "24:00",
      },
    ]);

    const { spots } = parseSpotsCsv(csv);

    expect(spots[0]).toMatchObject({ geometry: "segment", lat2: 35.281, lng2: -120.661 });
  });

  it("a blank max_minutes means no limit, and rule_type=free charges nothing", () => {
    const csv = buildCsv([
      {
        id: "acc-1",
        name: "Accessible Bay",
        kind: "accessible",
        geometry: "point",
        lat: "35.28",
        lng: "-120.66",
        rule_type: "free",
        days: "1-6",
        start: "07:00",
        end: "21:00",
      },
    ]);

    const { spots } = parseSpotsCsv(csv);

    expect(spots[0].rules[0].maxMinutes).toBeNull();
    expect(spots[0].rules[0].pricePerHour).toBe(0);
  });
});
