import {
  Accessibility,
  DoorOpen,
  ParkingMeter,
  SquareParking,
  Timer,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { Motorbike } from "lucide-react";
import type { SpotKind } from "@/lib/types";

const KIND_ICONS: Record<SpotKind, LucideIcon> = {
  garage: Warehouse,
  lot: SquareParking,
  street: ParkingMeter,
  loading: DoorOpen,
  green: Timer,
  accessible: Accessibility,
  motorcycle: Motorbike,
};

export const KIND_LABELS: Record<SpotKind, string> = {
  garage: "Garage",
  lot: "Lot",
  street: "Street",
  loading: "Loading zone",
  green: "Short-term",
  accessible: "Accessible",
  motorcycle: "Motorcycle",
};

export function KindIcon({
  kind,
  className,
}: {
  kind: SpotKind;
  className?: string;
}) {
  const Icon = KIND_ICONS[kind];
  return <Icon className={className} />;
}
