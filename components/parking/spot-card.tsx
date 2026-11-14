import { Footprints } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { RankedSpot } from "@/lib/types";
import { KindIcon, KIND_LABELS } from "./kind-icon";
import { cn } from "@/lib/utils";

export function SpotCard({ ranked }: { ranked: RankedSpot }) {
  const { spot, walkMinutes, plainEnglish } = ranked;

  return (
    <Card className="border-border/70">
      <CardContent className="flex gap-3 px-4">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
          <KindIcon kind={spot.kind} className="size-5 text-foreground" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">
                {spot.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {KIND_LABELS[spot.kind]}
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground">
              <Footprints className="size-3.5" />
              {walkMinutes} min
            </span>
          </div>

          <p
            className={cn(
              "text-sm",
              ranked.evaluation.totalCost > 0
                ? "text-foreground"
                : "text-emerald-600 dark:text-emerald-400",
            )}
          >
            {plainEnglish}
          </p>

          {spot.notes ? (
            <p className="text-xs text-muted-foreground">{spot.notes}</p>
          ) : null}

          {!spot.verified ? (
            <Badge
              variant="outline"
              className="mt-1 w-fit border-amber-400/60 text-[10px] text-amber-600 dark:text-amber-400"
            >
              Unverified sample data
            </Badge>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
