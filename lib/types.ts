export type SpotKind =
  | "garage"
  | "lot"
  | "street"
  | "loading"
  | "accessible"
  | "motorcycle";

export interface Rule {
  /** 0 = Sunday .. 6 = Saturday */
  days: number[];
  /** "HH:MM" 24-hour */
  start: string;
  /** "HH:MM" 24-hour */
  end: string;
  pricePerHour: number;
  maxMinutes: number | null;
}

export interface Spot {
  id: string;
  name: string;
  kind: SpotKind;
  lat: number;
  lng: number;
  rules: Rule[];
  notes: string;
  source: string;
  verified: boolean;
  verifiedOn: string | null;
}

export interface Destination {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export type TripType = "park" | "pickup" | "accessible" | "motorcycle";

export type MaxWalk = 3 | 5 | 10 | 15;

export interface Filters {
  tripType: TripType;
  maxWalk: MaxWalk;
  freeOnly: boolean;
  arrival: Date;
  stayMinutes: number;
}

export interface Evaluation {
  legal: boolean;
  reason: string;
  totalCost: number;
  freeAfter: string | null;
  warnings: string[];
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
  widenedTo: MaxWalk | null;
}

/**
 * Interface for walking-time calculation so a real walking/directions API
 * can be swapped in later without touching the rules engine or UI.
 */
export interface WalkTimeProvider {
  walkMinutes(dest: Destination, spot: Spot): number;
}
