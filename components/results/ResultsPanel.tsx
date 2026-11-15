"use client";

import { useState } from "react";
import { ChevronUp, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { RankResult, UnknownSpot } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SpotRow } from "./SpotRow";
import { UnknownSpotRow } from "./UnknownSpotRow";

export interface ResultsPanelProps {
  destinationName: string | null;
  loading: boolean;
  result: RankResult | null;
  unknownSpots: { spot: UnknownSpot; walkMinutes: number }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  widenedToFreeOnly: number | null;
  requestedMaxWalk: number;
  onTryWiderWalk: (minutes: number) => void;
  showSampleFooter: boolean;
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-start gap-3">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ResultsPanel({
  destinationName,
  loading,
  result,
  unknownSpots,
  selectedId,
  onSelect,
  widenedToFreeOnly,
  requestedMaxWalk,
  onTryWiderWalk,
  showSampleFooter,
}: ResultsPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  if (!destinationName) return null;

  const knownCount = result ? result.top.length + result.more.length : 0;
  const totalCount = knownCount + unknownSpots.length;
  const isEmpty = !loading && totalCount === 0;

  return (
    <div
      className={cn(
        "pointer-events-auto flex flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl ring-1 ring-navy/10 transition-[max-height] duration-200",
        "sm:rounded-2xl",
        expanded ? "max-h-[80vh]" : "max-h-[42vh]",
        "sm:max-h-[calc(100vh-7rem)]",
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex shrink-0 flex-col items-center gap-1.5 py-2 sm:hidden"
        aria-label={expanded ? "Collapse results" : "Expand results"}
      >
        <span className="h-1 w-10 rounded-full bg-border" />
      </button>

      <div className="shrink-0 border-b border-border px-4 pb-3 pt-1 sm:pt-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-base font-extrabold tracking-heading text-navy">
            {loading
              ? "Searching…"
              : `${totalCount} option${totalCount === 1 ? "" : "s"} near ${destinationName}`}
          </h2>
          <ChevronUp
            className={cn(
              "size-4 shrink-0 text-slate transition-transform sm:hidden",
              expanded && "rotate-180",
            )}
          />
        </div>

        {widenedToFreeOnly && (
          <p className="mt-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
            No free parking within {requestedMaxWalk} min — showing free options within{" "}
            {widenedToFreeOnly} min.
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {loading ? (
          <LoadingSkeleton />
        ) : isEmpty ? (
          <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
            <SearchX className="size-8 text-slate" />
            <p className="text-sm font-medium text-navy">
              No spots within {requestedMaxWalk} min — try 10?
            </p>
            <Button size="sm" onClick={() => onTryWiderWalk(10)} className="rounded-full">
              Widen to 10 min
            </Button>
          </div>
        ) : (
          <>
            {result?.top.map((r, i) => (
              <SpotRow
                key={r.spot.id}
                ranked={r}
                index={i + 1}
                selected={r.spot.id === selectedId}
                onSelect={() => onSelect(r.spot.id)}
              />
            ))}

            {result && result.more.length > 0 && (
              <>
                {showAll &&
                  result.more.map((r, i) => (
                    <SpotRow
                      key={r.spot.id}
                      ranked={r}
                      index={result.top.length + i + 1}
                      selected={r.spot.id === selectedId}
                      onSelect={() => onSelect(r.spot.id)}
                    />
                  ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="my-1 w-full rounded-lg"
                  onClick={() => setShowAll((s) => !s)}
                >
                  {showAll ? "Show fewer options" : `More options (${result.more.length})`}
                </Button>
              </>
            )}

            {unknownSpots.map(({ spot, walkMinutes }) => (
              <UnknownSpotRow
                key={spot.id}
                spot={spot}
                walkMinutes={walkMinutes}
                onSelect={() => onSelect(spot.id)}
              />
            ))}
          </>
        )}
      </div>

      {showSampleFooter && (
        <p className="shrink-0 border-t border-border px-4 py-2 text-center text-[11px] text-slate">
          Sample data — not verified city data.
        </p>
      )}
    </div>
  );
}
