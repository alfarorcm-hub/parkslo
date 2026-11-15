"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { CurbColorsSheet } from "@/components/CurbColorsSheet";
import { FilterBar } from "@/components/filters/FilterBar";
import { LegendCard } from "@/components/LegendCard";
import { MapSkeleton } from "@/components/map/MapSkeleton";
import { ResultsPanel } from "@/components/results/ResultsPanel";
import { SpotDetailSheet } from "@/components/SpotDetailSheet";
import { TopBar } from "@/components/TopBar";
import { defaultNearbyParkingProvider } from "@/lib/providers/osm-parking-provider";
import { haversineMeters, rank, walkMinutes } from "@/lib/rules";
import type { Destination, Filters, RankResult, Spot, UnknownSpot } from "@/lib/types";
import type { SpotsSource } from "@/app/api/spots/route";
import { cn } from "@/lib/utils";

const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

const DEDUP_RADIUS_METERS = 60;
const MIN_KNOWN_RESULTS_FOR_OSM = 3;

function defaultFilters(): Filters {
  return {
    specials: [],
    maxWalk: 10,
    freeOnly: false,
    arrival: new Date(),
    stayMinutes: 120,
    hasPlacard: false,
  };
}

export default function Home() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [spotsSource, setSpotsSource] = useState<SpotsSource>("bundled-csv");
  const [spotsLoading, setSpotsLoading] = useState(true);

  const [destination, setDestination] = useState<Destination | null>(null);
  const [filters, setFilters] = useState<Filters>(defaultFilters());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [curbSheetOpen, setCurbSheetOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [rawUnknownSpots, setRawUnknownSpots] = useState<UnknownSpot[]>([]);

  useEffect(() => {
    fetch("/api/spots")
      .then((r) => r.json())
      .then((data: { spots: Spot[]; source: SpotsSource }) => {
        setSpots(data.spots);
        setSpotsSource(data.source);
      })
      .catch(() => {})
      .finally(() => setSpotsLoading(false));
  }, []);

  const result: RankResult | null = useMemo(() => {
    if (!destination || spots.length === 0) return null;
    return rank(spots, destination, filters);
  }, [spots, destination, filters]);

  const knownCount = result ? result.top.length + result.more.length : 0;

  const needsOsmFill = !!destination && knownCount < MIN_KNOWN_RESULTS_FOR_OSM;

  // Fill gaps with nearby OSM parking of unknown rules when we're thin on data.
  useEffect(() => {
    if (!needsOsmFill || !destination) return;
    let cancelled = false;
    defaultNearbyParkingProvider.nearby(destination).then((osmSpots) => {
      if (!cancelled) setRawUnknownSpots(osmSpots);
    });
    return () => {
      cancelled = true;
    };
  }, [needsOsmFill, destination]);

  const unknownSpots = useMemo(() => {
    if (!destination || !needsOsmFill) return [];
    return rawUnknownSpots
      .filter(
        (osm) =>
          !spots.some((s) => haversineMeters(osm.lat, osm.lng, s.lat, s.lng) < DEDUP_RADIUS_METERS),
      )
      .map((osm) => ({ spot: osm, walkMinutes: walkMinutes(destination, osm) }))
      .filter((u) => u.walkMinutes <= filters.maxWalk);
  }, [rawUnknownSpots, spots, destination, filters.maxWalk, needsOsmFill]);

  function handleSelectDestination(dest: Destination) {
    setDestination(dest);
    setHasSearched(true);
    setSelectedId(null);
  }

  function handleSelectSpot(id: string) {
    setSelectedId(id);
    setDetailOpen(true);
  }

  const allResults = result ? [...result.top, ...result.more] : [];
  const selectedRanked = allResults.find((r) => r.spot.id === selectedId) ?? null;
  const selectedUnknown = unknownSpots.find((u) => u.spot.id === selectedId) ?? null;

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-mist">
      <div className="absolute inset-0">
        <MapView
          destination={destination}
          results={allResults}
          unknownSpots={unknownSpots.map((u) => u.spot)}
          selectedId={selectedId}
          onSelect={handleSelectSpot}
          maxWalk={filters.maxWalk}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] flex flex-col gap-2 p-3 sm:max-w-md">
        <TopBar
          showTagline={!hasSearched}
          onSelectDestination={handleSelectDestination}
          onHelp={() => setCurbSheetOpen(true)}
        />
        {destination && <FilterBar filters={filters} onChange={setFilters} />}
      </div>

      <div
        className={cn(
          "pointer-events-none absolute bottom-3 left-3 z-[500]",
          destination && "max-sm:hidden",
        )}
      >
        <LegendCard />
      </div>

      {destination && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[500] sm:inset-x-auto sm:bottom-3 sm:left-3 sm:top-36 sm:w-[380px]">
          <ResultsPanel
            destinationName={destination.name}
            loading={spotsLoading}
            result={result}
            unknownSpots={unknownSpots}
            selectedId={selectedId}
            onSelect={handleSelectSpot}
            widenedToFreeOnly={filters.freeOnly ? (result?.widenedTo ?? null) : null}
            requestedMaxWalk={filters.maxWalk}
            onTryWiderWalk={(m) => setFilters((f) => ({ ...f, maxWalk: m }))}
            showSampleFooter={spotsSource === "sample"}
          />
        </div>
      )}

      <SpotDetailSheet
        ranked={selectedRanked}
        unknown={selectedUnknown}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
      <CurbColorsSheet open={curbSheetOpen} onOpenChange={setCurbSheetOpen} />
    </main>
  );
}
