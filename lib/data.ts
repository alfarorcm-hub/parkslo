import destinationsJson from "@/data/destinations.json";
import spotsJson from "@/data/spots.json";
import type { Destination, Spot } from "./types";

export const destinations: Destination[] = destinationsJson;
export const spots: Spot[] = spotsJson as Spot[];

export function getDestinationById(id: string): Destination | undefined {
  return destinations.find((d) => d.id === id);
}
