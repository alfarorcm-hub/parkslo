import type {
  Evaluation,
  Filters,
  LatLng,
  RankResult,
  RankedSpot,
  Rule,
  SpecialCategory,
  Spot,
  WalkTimeProvider,
} from "./types";

const DETOUR_FACTOR = 1.3;
const WALK_SPEED_METERS_PER_MIN = 80;
const EARTH_RADIUS_METERS = 6371000;
const STEP_MINUTES = 15;
/** Free-only auto-widening never searches past this many minutes. */
const WIDEN_CEILING_MINUTES = 15;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Straight-line distance in meters between two coordinates. */
export function haversineMeters(
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
export function walkMinutes(dest: LatLng, spot: LatLng): number {
  const meters = haversineMeters(dest.lat, dest.lng, spot.lat, spot.lng);
  const adjustedMeters = meters * DETOUR_FACTOR;
  return Math.ceil(adjustedMeters / WALK_SPEED_METERS_PER_MIN);
}

/** Swap this implementation for a real walking/directions API later. */
export class HaversineWalkTimeProvider implements WalkTimeProvider {
  walkMinutes(dest: LatLng, spot: LatLng): number {
    return walkMinutes(dest, spot);
  }
  walkTimes(dest: LatLng, spots: LatLng[]): number[] {
    return spots.map((spot) => walkMinutes(dest, spot));
  }
}

export const defaultWalkTimeProvider: WalkTimeProvider =
  new HaversineWalkTimeProvider();

/** Combines a duration picker's hours (0-12) and minutes (0-55) into total minutes. */
export function hoursMinutesToStayMinutes(hours: number, minutes: number): number {
  return hours * 60 + minutes;
}

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

/**
 * Index of the rule active at `time`, or null if nothing applies (free).
 * If multiple rules overlap the same slice (e.g. a regular meter rate and a
 * Thursday-evening tow-away), the `illegal` one always wins — a no-parking
 * window overrides everything else regardless of row order.
 */
function findActiveRuleIndex(spot: Spot, time: Date): number | null {
  const day = time.getDay();
  const minutesOfDay = time.getHours() * 60 + time.getMinutes();
  let fallback: number | null = null;

  for (let i = 0; i < spot.rules.length; i++) {
    const rule = spot.rules[i];
    if (!rule.days.includes(day)) continue;
    const startMin = timeStringToMinutes(rule.start);
    const endMin = timeStringToMinutes(rule.end);
    if (minutesOfDay >= startMin && minutesOfDay < endMin) {
      if (rule.illegal) return i;
      if (fallback === null) fallback = i;
    }
  }
  return fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface EvaluateOptions {
  /** Disabled-placard holders park free & unlimited on placardFree spots. */
  hasPlacard?: boolean;
}

/**
 * Steps through the stay in 15-minute increments, checking which rule
 * (if any) is active at each slice. A rule's maxMinutes is enforced against
 * the minutes accumulated while that same rule stays continuously active;
 * switching to a different rule (or to no rule at all) resets the count.
 * Cost is tracked per calendar day so a rule's dailyMax can cap it.
 */
export function evaluate(
  spot: Spot,
  arrival: Date,
  stayMinutes: number,
  options: EvaluateOptions = {},
): Evaluation {
  const warnings: string[] = [];
  let legal = true;
  let illegalReason = "";
  let hasUnknownWindow = false;
  let freeAfterDate: Date | null = null;
  const placardExempt = !!options.hasPlacard && spot.placardFree === true;

  let offset = 0;
  let activeRuleIndex: number | null = null;
  let activeWindowMinutes = 0;
  const costByDay = new Map<string, { cost: number; dailyMax: number | null }>();

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

      if (rule.illegal) {
        legal = false;
        illegalReason = rule.label || "No parking during this window";
      } else if (rule.unknown) {
        hasUnknownWindow = true;
      } else if (!placardExempt) {
        activeWindowMinutes += sliceMinutes;

        if (rule.maxMinutes !== null && activeWindowMinutes > rule.maxMinutes) {
          legal = false;
          illegalReason =
            rule.label || `Exceeds the ${rule.maxMinutes}-minute limit`;
        }

        if (rule.pricePerHour > 0) {
          const dayKey = sliceStart.toDateString();
          const entry = costByDay.get(dayKey) ?? { cost: 0, dailyMax: null };
          entry.cost += (rule.pricePerHour / 60) * sliceMinutes;
          if (rule.dailyMax != null) entry.dailyMax = rule.dailyMax;
          costByDay.set(dayKey, entry);
          freeAfterDate = ruleEndDateTime(rule, sliceStart);
        }
      }
    }

    offset += sliceMinutes;
  }

  let totalCost = 0;
  for (const { cost, dailyMax } of costByDay.values()) {
    totalCost += dailyMax != null ? Math.min(cost, dailyMax) : cost;
  }
  totalCost = round2(totalCost);

  const reason = !legal
    ? illegalReason
    : hasUnknownWindow
      ? "Rules not listed for this time"
      : totalCost > 0
        ? "Paid parking required"
        : "Free parking";

  return {
    legal,
    reason,
    totalCost,
    freeAfter: freeAfterDate ? formatTime(freeAfterDate) : null,
    warnings,
    hasUnknownWindow,
  };
}

/** One short, human-readable summary line for a spot + its evaluation. */
export function plainEnglish(spot: Spot, evaluation: Evaluation): string {
  if (!evaluation.legal) {
    return `Not legal for this stay — ${evaluation.reason}`;
  }

  if (evaluation.hasUnknownWindow) {
    return "Rules not listed for this time — check posted signs";
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

const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDayRange(days: number[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 0) return "";
  if (sorted.length === 7) return "Every day";
  const isContiguous = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  if (isContiguous && sorted.length > 1) {
    return `${DAY_ABBR[sorted[0]]}–${DAY_ABBR[sorted[sorted.length - 1]]}`;
  }
  return sorted.map((d) => DAY_ABBR[d]).join(", ");
}

/** Compact time label, e.g. "9 AM" or "5:30 PM"; "24:00" reads as midnight. */
function formatTimeCompact(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (h >= 24) return "12 AM";
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour12} ${period}` : `${hour12}:${m.toString().padStart(2, "0")} ${period}`;
}

/**
 * Human-readable summary of a single rule window, for the spot detail
 * sheet, e.g. "Mon–Sat 9 AM–9 PM · $2.75/hr · 3-hr max" or
 * "Tow-away Thursdays 5–9 PM (Farmers' Market)".
 */
export function describeRule(rule: Rule): string {
  const dayLabel = formatDayRange(rule.days);
  const isAllDay = rule.start === "00:00" && (rule.end === "24:00" || rule.end === "23:59");
  const timeLabel = isAllDay
    ? "all day"
    : `${formatTimeCompact(rule.start)}–${formatTimeCompact(rule.end)}`;

  if (rule.illegal) {
    return rule.label || `${dayLabel} ${timeLabel} — No parking`;
  }
  if (rule.unknown) {
    return rule.label
      ? `${dayLabel} ${timeLabel} — ${rule.label}`
      : `${dayLabel} ${timeLabel} — rules not listed`;
  }

  const parts = [`${dayLabel} ${timeLabel}`];
  parts.push(rule.pricePerHour > 0 ? `$${rule.pricePerHour.toFixed(2)}/hr` : "Free");
  if (rule.maxMinutes !== null) {
    parts.push(
      rule.maxMinutes % 60 === 0 ? `${rule.maxMinutes / 60}-hr max` : `${rule.maxMinutes}-min max`,
    );
  }
  if (rule.dailyMax != null) parts.push(`$${rule.dailyMax}/day max`);
  return parts.join(" · ");
}

function isGeneralParking(spot: Spot): boolean {
  return (
    spot.kind === "garage" ||
    spot.kind === "lot" ||
    spot.kind === "street" ||
    spot.kind === "green"
  );
}

/**
 * Whether a spot matches the selected Special categories. Empty selection
 * means "general parking" (garage/lot/street/green). A spot's primary
 * category is `kind`, but its CSV tags can also qualify it for a Special it
 * isn't `kind`-classified as (e.g. a garage with some accessible stalls).
 * Motorcycle and EV aren't separate categories — they filter the general
 * set down to spots that allow motorcycles / have chargers.
 */
function spotMatchesSpecials(spot: Spot, specials: SpecialCategory[]): boolean {
  if (specials.length === 0) return isGeneralParking(spot);

  return specials.some((special) => {
    if (special === "motorcycle") {
      return isGeneralParking(spot) && spot.motorcycleAllowed !== false;
    }
    if (special === "accessible") {
      return spot.kind === "accessible" || !!spot.tags?.accessible;
    }
    if (special === "ev") {
      return isGeneralParking(spot) && (spot.evChargers ?? 0) > 0;
    }
    return spot.kind === "loading" || !!spot.tags?.loading; // pickup
  });
}

/** Pickup/loading spots ignore the user's requested stay and are always quick. */
const PICKUP_STAY_MINUTES = 5;

function isPickupSpot(spot: Spot): boolean {
  return spot.kind === "loading";
}

function evaluateCandidates(
  candidates: Spot[],
  walkById: Map<string, number>,
  filters: Filters,
): RankedSpot[] {
  const ranked: RankedSpot[] = [];

  for (const spot of candidates) {
    const pickup = isPickupSpot(spot);
    const effectiveStay = pickup ? PICKUP_STAY_MINUTES : filters.stayMinutes;

    const evaluation = evaluate(spot, filters.arrival, effectiveStay, {
      hasPlacard: filters.hasPlacard,
    });
    if (!evaluation.legal) continue;

    if (
      filters.freeOnly &&
      !pickup &&
      (evaluation.totalCost > 0 || evaluation.hasUnknownWindow)
    ) {
      continue;
    }

    ranked.push({
      spot,
      walkMinutes: walkById.get(spot.id) ?? 0,
      evaluation,
      plainEnglish: plainEnglish(spot, evaluation),
    });
  }

  return ranked;
}

/** Known spots with unlisted rules for this time sort after confident results. */
function sortRanked(ranked: RankedSpot[]): RankedSpot[] {
  return [...ranked].sort((a, b) => {
    const aUnknown = a.evaluation.hasUnknownWindow;
    const bUnknown = b.evaluation.hasUnknownWindow;
    if (aUnknown !== bUnknown) return aUnknown ? 1 : -1;
    if (a.walkMinutes !== b.walkMinutes) return a.walkMinutes - b.walkMinutes;
    return a.evaluation.totalCost - b.evaluation.totalCost;
  });
}

/**
 * Ranks spots for a destination + filter set, sorted by walk time then cost.
 *
 * When `freeOnly` is on and nothing free falls within `maxWalk`, this widens
 * the search to the nearest free legal spot beyond that radius, capped at
 * `WIDEN_CEILING_MINUTES` (or the requested maxWalk if it's already wider).
 * Outside of `freeOnly`, an empty result stays empty — filling the gap with
 * nearby OSM spots of unknown rules is a presentation-layer concern, not
 * this engine's job.
 */
export function rank(
  spots: Spot[],
  dest: LatLng,
  filters: Filters,
  provider: WalkTimeProvider = defaultWalkTimeProvider,
): RankResult {
  const candidates = spots.filter((s) => spotMatchesSpecials(s, filters.specials));

  // Segment spots (e.g. a block-long curb) use their midpoint for walk time;
  // everything else is passed through unchanged (it already satisfies LatLng).
  const points: LatLng[] = candidates.map((s) =>
    s.geometry === "segment" && s.lat2 != null && s.lng2 != null
      ? { lat: (s.lat + s.lat2) / 2, lng: (s.lng + s.lng2) / 2 }
      : s,
  );
  const walks = provider.walkTimes(dest, points);
  const walkById = new Map(candidates.map((s, i) => [s.id, walks[i]]));

  const allMatches = evaluateCandidates(candidates, walkById, filters);
  let withinCap = allMatches.filter((r) => r.walkMinutes <= filters.maxWalk);
  let widenedTo: number | null = null;

  if (filters.freeOnly && withinCap.length === 0) {
    const ceiling = Math.max(filters.maxWalk, WIDEN_CEILING_MINUTES);
    const beyond = allMatches
      .filter((r) => r.walkMinutes > filters.maxWalk && r.walkMinutes <= ceiling)
      .sort((a, b) => a.walkMinutes - b.walkMinutes);

    if (beyond.length > 0) {
      widenedTo = beyond[0].walkMinutes;
      withinCap = allMatches.filter((r) => r.walkMinutes <= widenedTo!);
    }
  }

  const results = sortRanked(withinCap);

  return {
    top: results.slice(0, 5),
    more: results.slice(5),
    widenedTo,
  };
}
