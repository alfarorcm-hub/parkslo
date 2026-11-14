import { describe, expect, it } from "vitest";
import { evaluate, plainEnglish, rank, walkMinutes } from "./rules";
import type {
  Destination,
  Filters,
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
    walkMinutes: (_dest, spot) => distances[spot.id] ?? 0,
  };
}

function baseFilters(overrides: Partial<Filters>): Filters {
  return {
    tripType: "park",
    maxWalk: 5,
    freeOnly: false,
    arrival: mondayAt(10),
    stayMinutes: 60,
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
  it("widens the walk radius when freeOnly filters out everything nearby", () => {
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

    expect(result.widenedTo).toBe(10);
    expect(result.top).toHaveLength(1);
    expect(result.top[0].spot.id).toBe("free-farther");
  });

  it("pickup trips return only loading zones and ignore the requested stay length", () => {
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
    const garage = makeSpot({
      id: "garage",
      kind: "garage",
      rules: [{ days: ALL_DAYS, start: "00:00", end: "23:59", pricePerHour: 1.5, maxMinutes: null }],
    });

    const provider = makeProvider({ loading: 1, street: 1, garage: 1 });
    // A huge stayMinutes would normally blow the loading zone's 5-minute limit,
    // but pickup trips should ignore it entirely.
    const filters = baseFilters({ tripType: "pickup", stayMinutes: 500 });

    const result = rank([loading, street, garage], dest, filters, provider);

    expect(result.top.map((r) => r.spot.kind)).toEqual(["loading"]);
  });

  it("accessible trips return only accessible spots", () => {
    const accessible = makeSpot({
      id: "accessible",
      kind: "accessible",
      rules: [{ days: ALL_DAYS, start: "00:00", end: "23:59", pricePerHour: 0, maxMinutes: null }],
    });
    const lot = makeSpot({
      id: "lot",
      kind: "lot",
      rules: [{ days: ALL_DAYS, start: "00:00", end: "23:59", pricePerHour: 1.5, maxMinutes: null }],
    });

    const provider = makeProvider({ accessible: 1, lot: 1 });
    const filters = baseFilters({ tripType: "accessible" });

    const result = rank([accessible, lot], dest, filters, provider);

    expect(result.top.map((r) => r.spot.kind)).toEqual(["accessible"]);
  });

  it("returns an empty result with no further widening when nothing is within 15 minutes", () => {
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
    const same = makeSpot({ id: "same", lat: dest.lat, lng: dest.lng, rules: [] });
    const farther = makeSpot({ id: "farther", lat: dest.lat + 0.01, lng: dest.lng, rules: [] });

    expect(walkMinutes(dest, same)).toBe(0);
    expect(walkMinutes(dest, farther)).toBeGreaterThan(0);
  });
});
