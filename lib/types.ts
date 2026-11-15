export interface LatLng {
  lat: number;
  lng: number;
}

export type SpotKind =
  | "garage"
  | "lot"
  | "street"
  | "loading"
  | "green"
  | "accessible"
  // legacy kind from the original sample data, kept so old fallback rows stay valid
  | "motorcycle";

export interface Rule {
  /** 0 = Sunday .. 6 = Saturday */
  days: number[];
  /** "HH:MM" 24-hour, "24:00" allowed to mean end-of-day */
  start: string;
  end: string;
  pricePerHour: number;
  maxMinutes: number | null;
  /** Caps the cost accrued under this rule per calendar day. */
  dailyMax?: number | null;
  /** This window is a no-parking/tow-away window — always illegal, regardless of price. */
  illegal?: boolean;
  /** Rules aren't listed for this window — don't charge, flag as unknown instead of legal/illegal. */
  unknown?: boolean;
  /** Human-readable description, e.g. "Tow-away Thursdays 5-9 PM (Farmers' Market)". */
  label?: string;
}

/**
 * Supplementary tags from the CSV data source. A spot's primary category is
 * `kind`, but e.g. a garage can also host some accessible stalls — these
 * flags let the Special filters pick it up without changing its kind.
 */
export interface SpotTags {
  accessible: boolean;
  loading: boolean;
  motorcycle: boolean;
}

export type SpotGeometry = "point" | "segment";

export interface Spot extends LatLng {
  id: string;
  name: string;
  kind: SpotKind;
  rules: Rule[];
  tags?: SpotTags;
  /** "segment" spots (e.g. a block-long curb) also carry a second endpoint. */
  geometry?: SpotGeometry;
  lat2?: number;
  lng2?: number;
  spaces?: number | null;
  accessibleSpaces?: number | null;
  evChargers?: number | null;
  clearance?: string | null;
  /** Disabled placard holders park free here with no time limit, when true. */
  placardFree?: boolean;
  /** Defaults to true (allowed) when not specified. */
  motorcycleAllowed?: boolean;
  zone?: string | null;
  notes: string;
  source: string;
  verified: boolean;
  verifiedOn: string | null;
}

export interface Destination extends LatLng {
  id: string;
  name: string;
}

/** A nearby parking spot from OpenStreetMap with no known rules. */
export interface UnknownSpot extends LatLng {
  id: string;
  name: string;
  kind: "unknown";
}

export type SpecialCategory = "motorcycle" | "accessible" | "pickup" | "ev";

export interface Filters {
  /** Empty = general parking (garage/lot/street/green). */
  specials: SpecialCategory[];
  /** Max walk time in minutes, 1-30 (continuous, user-adjustable). */
  maxWalk: number;
  freeOnly: boolean;
  arrival: Date;
  stayMinutes: number;
  /** "I have a disabled placard" — only meaningful when "accessible" is selected. */
  hasPlacard: boolean;
}

export interface Evaluation {
  legal: boolean;
  reason: string;
  totalCost: number;
  freeAfter: string | null;
  warnings: string[];
  /** The stay overlapped a window whose rules aren't listed in our data. */
  hasUnknownWindow: boolean;
}

export interface RankedSpot {
  spot: Spot;
  walkMinutes: number;
  evaluation: Evaluation;
  plainEnglish: string;
}

export interface RankResult {
  top: RankedSpot[];
  more: RankedSpot[];
  /** Exact walk minutes results were widened to, or null if not widened. */
  widenedTo: number | null;
}

/**
 * Interface for walking-time calculation so a real walking/directions API
 * (e.g. Google Maps) can be swapped in later without touching the rules
 * engine or UI. `walkTimes` is the batch form used when ranking many spots.
 */
export interface WalkTimeProvider {
  walkMinutes(dest: LatLng, spot: LatLng): number;
  walkTimes(dest: LatLng, spots: LatLng[]): number[];
}
