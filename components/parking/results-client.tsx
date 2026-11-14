"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDestinationById, spots } from "@/lib/data";
import { decodeSearchParams } from "@/lib/query";
import { rank } from "@/lib/rules";
import { SpotCard } from "./spot-card";

export type RawSearchParams = Record<string, string | string[] | undefined>;

function toURLSearchParams(raw: RawSearchParams): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (Array.isArray(value)) {
      if (value[0] !== undefined) params.set(key, value[0]);
    } else if (value !== undefined) {
      params.set(key, value);
    }
  }
  return params;
}

export function ResultsClient({
  searchParams: rawSearchParams,
}: {
  searchParams: RawSearchParams;
}) {
  const [showAll, setShowAll] = useState(false);

  const state = decodeSearchParams(toURLSearchParams(rawSearchParams));
  const dest = state ? getDestinationById(state.destId) : undefined;

  if (!state || !dest) {
    return (
      <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-10 text-center">
        <SearchX className="size-10 text-muted-foreground" />
        <p className="text-base font-medium">We couldn&apos;t find that search.</p>
        <p className="text-sm text-muted-foreground">
          Pick a destination to start over.
        </p>
        <Button nativeButton={false} render={<Link href="/" />}>Back to search</Button>
      </main>
    );
  }

  const { filters } = state;
  const result = rank(spots, dest, filters);
  const totalCount = result.top.length + result.more.length;
  const isEmpty = totalCount === 0;

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={<Link href="/" aria-label="Back to search" />}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold leading-tight">
            {dest.name}
          </p>
        </div>
      </div>

      {!isEmpty ? (
        <p className="text-sm text-muted-foreground">
          {totalCount} option{totalCount === 1 ? "" : "s"} near {dest.name}
        </p>
      ) : null}

      {result.widenedTo ? (
        <div className="rounded-lg border border-amber-400/50 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          No matches within {filters.maxWalk} min — showing options within{" "}
          {result.widenedTo} min.
        </div>
      ) : null}

      {isEmpty ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
          <SearchX className="size-10 text-muted-foreground" />
          <p className="text-base font-medium">
            No legal parking found near {dest.name}
          </p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Try a longer walk, a different trip type, or turning off
            &quot;Free only&quot;.
          </p>
          <Button nativeButton={false} render={<Link href="/" />}>Adjust search</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {result.top.map((ranked) => (
            <SpotCard key={ranked.spot.id} ranked={ranked} />
          ))}

          {result.more.length > 0 ? (
            <>
              {showAll
                ? result.more.map((ranked) => (
                    <SpotCard key={ranked.spot.id} ranked={ranked} />
                  ))
                : null}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowAll((s) => !s)}
              >
                {showAll
                  ? "Show fewer options"
                  : `Show ${result.more.length} more option${
                      result.more.length === 1 ? "" : "s"
                    }`}
              </Button>
            </>
          ) : null}
        </div>
      )}

      <p className="mt-2 text-center text-xs text-muted-foreground">
        Sample data for demo purposes — not verified city parking data.
      </p>
    </main>
  );
}
