"use client";

import { Footprints } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { KindIcon } from "@/components/parking/kind-icon";
import { status, statusKindFor } from "@/lib/theme";
import type { RankedSpot } from "@/lib/types";
import { cn } from "@/lib/utils";

function costLabel(ranked: RankedSpot): string {
  if (ranked.evaluation.hasUnknownWindow) return "—";
  if (ranked.evaluation.totalCost === 0) return "Free";
  return `$${ranked.evaluation.totalCost.toFixed(2)}`;
}

export function SpotRow({
  ranked,
  index,
  selected,
  onSelect,
}: {
  ranked: RankedSpot;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const { spot, evaluation } = ranked;
  const unknown = evaluation.hasUnknownWindow;
  const statusKind = unknown ? "unknown" : statusKindFor(spot.kind, evaluation.totalCost);
  const dotColor = status[statusKind];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors",
        selected ? "bg-mist" : "hover:bg-mist/60",
      )}
    >
      <div className="relative mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-mist">
        <span
          className="absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-white"
          style={{ backgroundColor: dotColor }}
        />
        <KindIcon kind={spot.kind} className="size-4.5 text-navy" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-navy">
              <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-navy text-[10px] font-bold text-white">
                {index}
              </span>
              <span className="truncate">{spot.name}</span>
            </p>
            <p className="flex items-center gap-1 text-xs font-bold text-navy">
              <Footprints className="size-3 text-slate" />
              {ranked.walkMinutes} min est.
            </p>
          </div>
          <span className={cn("shrink-0 text-sm font-bold", unknown ? "text-slate" : "text-navy")}>
            {costLabel(ranked)}
          </span>
        </div>

        <p className="mt-1 text-xs text-slate">{ranked.plainEnglish}</p>

        <div className="mt-1.5 flex flex-wrap gap-1">
          {spot.verified ? (
            <Badge variant="outline" className="border-mint/60 text-[10px] text-navy">
              Verified {spot.verifiedOn}
            </Badge>
          ) : (
            <Badge variant="outline" className="border-border text-[10px] text-slate">
              Unverified
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}
