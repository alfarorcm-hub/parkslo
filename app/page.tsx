"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Accessibility, DoorOpen, Search, SquareParking } from "lucide-react";
import { Motorbike } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrivalEditor, type ArrivalMode } from "@/components/parking/arrival-editor";
import { ChipGroup, type ChipOption } from "@/components/parking/chip-group";
import { DestinationCombobox } from "@/components/parking/destination-combobox";
import { destinations } from "@/lib/data";
import { encodeSearchParams } from "@/lib/query";
import type { MaxWalk, TripType } from "@/lib/types";

const TRIP_OPTIONS: ChipOption<TripType>[] = [
  { value: "park", label: "Park", icon: SquareParking },
  { value: "pickup", label: "Pickup", icon: DoorOpen },
  { value: "accessible", label: "Accessible", icon: Accessibility },
  { value: "motorcycle", label: "Motorcycle", icon: Motorbike },
];

const WALK_OPTIONS: ChipOption<MaxWalk>[] = [
  { value: 3, label: "3 min" },
  { value: 5, label: "5 min" },
  { value: 10, label: "10 min" },
  { value: 15, label: "15 min" },
];

function nowAsTimeString(): string {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, "0")}:${now
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

export default function Home() {
  const router = useRouter();

  const [destId, setDestId] = useState(destinations[0].id);
  const [tripType, setTripType] = useState<TripType>("park");
  const [maxWalk, setMaxWalk] = useState<MaxWalk>(5);
  const [freeOnly, setFreeOnly] = useState(false);
  const [arrivalMode, setArrivalMode] = useState<ArrivalMode>("now");
  const [customTime, setCustomTime] = useState(nowAsTimeString());
  const [stayMinutes, setStayMinutes] = useState(120);

  function handleFindParking() {
    const arrival = new Date();
    if (arrivalMode === "custom") {
      const [h, m] = customTime.split(":").map(Number);
      arrival.setHours(h, m, 0, 0);
    }

    const params = encodeSearchParams({
      destId,
      filters: { tripType, maxWalk, freeOnly, arrival, stayMinutes },
    });

    router.push(`/results?${params.toString()}`);
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col gap-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Where are you going?
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Legal parking near downtown San Luis Obispo.
        </p>
      </div>

      <DestinationCombobox value={destId} onChange={setDestId} />

      <section className="flex flex-col gap-2">
        <Label className="text-xs font-medium text-muted-foreground">
          Trip type
        </Label>
        <ChipGroup options={TRIP_OPTIONS} value={tripType} onChange={setTripType} />
      </section>

      <section className="flex flex-col gap-2">
        <Label className="text-xs font-medium text-muted-foreground">
          Walk time
        </Label>
        <ChipGroup options={WALK_OPTIONS} value={maxWalk} onChange={setMaxWalk} />
      </section>

      <section className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
        <Label htmlFor="free-only" className="text-sm font-normal">
          Free only
        </Label>
        <Switch id="free-only" checked={freeOnly} onCheckedChange={setFreeOnly} />
      </section>

      <ArrivalEditor
        arrivalMode={arrivalMode}
        onArrivalModeChange={setArrivalMode}
        customTime={customTime}
        onCustomTimeChange={setCustomTime}
        stayMinutes={stayMinutes}
        onStayMinutesChange={setStayMinutes}
      />

      <Button
        size="lg"
        className="mt-2 h-12 w-full gap-2 text-base"
        onClick={handleFindParking}
      >
        <Search className="size-4" />
        Find parking
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Sample data for demo purposes — not verified city parking data.
      </p>
    </main>
  );
}
