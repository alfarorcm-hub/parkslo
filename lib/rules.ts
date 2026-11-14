import type {
  Destination,
  Evaluation,
  Filters,
  MaxWalk,
  RankResult,
  RankedSpot,
  Rule,
  Spot,
  WalkTimeProvider,
} from "./types";

const DETOUR_FACTOR = 1.3;
const WALK_SPEED_METERS_PER_MIN = 80;
const EARTH_RADIUS_METERS = 6371000;
const STEP_MINUTES = 15;
const WALK_LEVELS: MaxWalk[] = [3, 5, 10, 15];

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Walking time in whole minutes between a destination and a spot.
 * Pure haversine distance with a detour factor, so it's a drop-in stand-in
 * for a real walking/directions API (see WalkTimeProvider below).
 */
export function walkMinutes(dest: Destination, spot: Spot): number {
  const meters = haversineMeters(dest.lat, dest.lng, spot.lat, spot.lng);
  const adjustedMeters = meters * DETOUR_FACTOR;
  return Math.ceil(adjustedMeters / WALK_SPEED_METERS_PER_MIN);
}

/** Swap this implementation for a real walking/directions API later. */
export class HaversineWalkTimeProvider implements WalkTimeProvider {
  walkMinutes(dest: Destination, spot: Spot): number {
    return walkMinutes(dest, spot);
  }
}

export const defaultWalkTimeProvider: WalkTimeProvider =
  new HaversineWalkTimeProvider();

function timeStringToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function formatTimeString(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m.toString().padStart(2, "0")} ${period}`;
}

function formatTime(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m.toString().padStart(2, "0")} ${period}`;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}

function ruleEndDateTime(rule: Rule, referenceDate: Date): Date {
  const [h, m] = rule.end.split(":").map(Number);
  const result = new Date(referenceDate);
  result.setHours(h, m, 0, 0);
  return result;
}

/** Index of the rule active at `time`, or null if nothing applies (free). */
function findActiveRuleIndex(spot: Spot, time: Date): number | null {
  const day = time.getDay();
  const minutesOfDay = time.getHours() * 60 + time.getMinutes();
  for (let i = 0; i < spot.rules.length; i++) {
    const rule = spot.rules[i];
    if (!rule.days.includes(day)) continue;
    const startMin = timeStringToMinutes(rule.start);
    const endMin = timeStringToMinutes(rule.end);
    if (minutesOfDay >= startMin && minutesOfDay < endMin) return i;
  }
  return null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Steps through the stay in 15-minute increments, checking which rule
 * (if any) is active at each slice. A rule's maxMinutes is enforced against
 * the minutes accumulated while that same rule stays continuously active;
 * switching to a different rule (or to no rule at all) resets the count.
 */
export function evaluate(
  spot: Spot,
  arrival: Date,
  stayMinutes: number,
): Evaluation {
  const warnings: string[] = [];
  let legal = true;
  let illegalReason = "";
  let totalCost = 0;
  let freeAfterDate: Date | null = null;

  let offset = 0;
  let activeRuleIndex: number | null = null;
  let activeWindowMinutes = 0;

  while (offset < stayMinutes) {
    const sliceMinutes = Math.min(STEP_MINUTES, stayMinutes - offset);
    const sliceStart = addMinutes(arrival, offset);
    const ruleIndex = findActiveRuleIndex(spot, sliceStart);

    if (ruleIndex !== activeRuleIndex) {
      activeRuleIndex = ruleIndex;
      activeWindowMinutes = 0;
    }

    if (ruleIndex !== null) {
      const rule = spot.rules[ruleIndex];
      activeWindowMinutes += sliceMinutes;

      if (rule.maxMinutes !== null && activeWindowMinutes > rule.maxMinutes) {
        legal = false;
        illegalReason = `Exceeds the ${rule.maxMinutes}-minute limit`;
      }

      if (rule.pricePerHour > 0) {
        totalCost += (rule.pricePerHour / 60) * sliceMinutes;
        freeAfterDate = ruleEndDateTime(rule, sliceStart);
      }
    }

    offset += sliceMinutes;
  }

  totalCost = round2(totalCost);

  const reason = !legal
    ? illegalReason
    : totalCost > 0
      ? "Paid parking required"
      : "Free parking";

  return {
    legal,
    reason,
    totalCost,
    freeAfter: freeAfterDate ? formatTime(freeAfterDate) : null,
    warnings,
  };
}

/** One short, human-readable summary line for a spot + its evaluation. */
export function plainEnglish(spot: Spot, evaluation: Evaluation): string {
  if (!evaluation.legal) {
    return `Not legal for this stay — ${evaluation.reason}`;
  }

  const limitRule = spot.rules.find((r) => r.maxMinutes !== null);

  const parts: string[] = [];
  if (evaluation.freeAfter) {
    parts.push(`OK until ${evaluation.freeAfter}`);
  } else {
    parts.push(limitRule ? "Free" : "Free — no time limit");
  }

  if (evaluation.totalCost > 0) {
    const cost = evaluation.totalCost;
    const costLabel = Number.isInteger(cost) ? `$${cost}` : `$${cost.toFixed(2)}`;
    parts.push(`about ${costLabel} total`);
  }

  if (limitRule && limitRule.maxMinutes !== null) {
    const limitLabel =
      limitRule.maxMinutes % 60 === 0
        ? `${limitRule.maxMinutes / 60}-hr limit`
        : `${limitRule.maxMinutes}-min limit`;
    parts.push(`${limitLabel} until ${formatTimeString(limitRule.end)}`);
  }

  return parts.join(" · ");
}

function kindsForTripType(tripType: Filters["tripType"]): Spot["kind"][] {
  switch (tripType) {
    case "park":
      return ["garage", "lot", "street"];
    case "pickup":
      return ["loading"];
    case "accessible":
      return ["accessible"];
    case "motorcycle":
      return ["motorcycle", "street"];
  }
}

/** Pickup trips ignore the user's requested stay; loading zones are quick. */
const PICKUP_STAY_MINUTES = 5;

function buildRanked(
  candidates: Spot[],
  dest: Destination,
  filters: Filters,
  walkCap: MaxWalk,
  provider: WalkTimeProvider,
): RankedSpot[] {
  const effectiveStay =
    filters.tripType === "pickup" ? PICKUP_STAY_MINUTES : filters.stayMinutes;
  const ranked: RankedSpot[] = [];

  for (const spot of candidates) {
    const walk = provider.walkMinutes(dest, spot);
    if (walk > walkCap) continue;

    const evaluation = evaluate(spot, filters.arrival, effectiveStay);
    if (!evaluation.legal) continue;

    if (
      filters.freeOnly &&
      filters.tripType !== "pickup" &&
      evaluation.totalCost > 0
    ) {
      continue;
    }

    ranked.push({
      spot,
      walkMinutes: walk,
      evaluation,
      plainEnglish: plainEnglish(spot, evaluation),
    });
  }

  return ranked;
}

/**
 * Ranks spots for a destination + filter set. If nothing matches the
 * requested maxWalk, widens through the fixed 3/5/10/15-minute chip levels
 * until something is found (or the levels run out).
 */
export function rank(
  spots: Spot[],
  dest: Destination,
  filters: Filters,
  provider: WalkTimeProvider = defaultWalkTimeProvider,
): RankResult {
  const candidateKinds = kindsForTripType(filters.tripType);
  const candidates = spots.filter((s) => candidateKinds.includes(s.kind));

  const startIdx = WALK_LEVELS.indexOf(filters.maxWalk);
  let widenedTo: MaxWalk | null = null;
  let results: RankedSpot[] = [];

  for (let i = startIdx; i < WALK_LEVELS.length; i++) {
    const level = WALK_LEVELS[i];
    results = buildRanked(candidates, dest, filters, level, provider);
    if (results.length > 0) {
      widenedTo = i === startIdx ? null : level;
      break;
    }
  }

  results.sort((a, b) => {
    if (a.walkMinutes !== b.walkMinutes) return a.walkMinutes - b.walkMinutes;
    return a.evaluation.totalCost - b.evaluation.totalCost;
  });

  return {
    top: results.slice(0, 5),
    more: results.slice(5),
    widenedTo,
  };
}
