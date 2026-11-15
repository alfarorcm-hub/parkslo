"use client";

import { Navigation } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { KindIcon, KIND_LABELS } from "@/components/parking/kind-icon";
import { describeRule } from "@/lib/rules";
import { verdict } from "@/lib/theme";
import type { RankedSpot, UnknownSpot } from "@/lib/types";

function directionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

function verdictFor(ranked: RankedSpot): { label: string; color: string } {
  if (!ranked.evaluation.legal) {
    return { label: "Not OK for this stay", color: verdict.notOk };
  }
  if (ranked.evaluation.hasUnknownWindow) {
    return { label: "Rules not listed — check signs", color: verdict.warning };
  }
  return { label: "OK for your whole stay", color: verdict.ok };
}

export function SpotDetailSheet({
  ranked,
  unknown,
  open,
  onOpenChange,
}: {
  ranked: RankedSpot | null;
  unknown: { spot: UnknownSpot; walkMinutes: number } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (unknown) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="font-heading text-lg font-extrabold tracking-heading text-navy">
              {unknown.spot.name}
            </SheetTitle>
            <SheetDescription>{unknown.walkMinutes} min walk (est.)</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-4 pb-6">
            <div
              className="rounded-xl p-4 text-base font-extrabold text-navy"
              style={{ backgroundColor: verdict.warning }}
            >
              Rules unknown — check posted signs
            </div>
            <p className="text-sm text-slate">
              From OpenStreetMap. We don&apos;t have verified rules for this spot yet.
            </p>
            <Button
              nativeButton={false}
              render={
                <a
                  href={directionsUrl(unknown.spot.lat, unknown.spot.lng)}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
              className="gap-2"
            >
              <Navigation className="size-4" />
              Directions
            </Button>
            <p className="text-center text-xs text-slate">
              Guidance only. Posted signs take priority.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (!ranked) return null;
  const { spot, evaluation, walkMinutes } = ranked;
  const v = verdictFor(ranked);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 font-heading text-lg font-extrabold tracking-heading text-navy">
            <KindIcon kind={spot.kind} className="size-5 shrink-0" />
            {spot.name}
          </SheetTitle>
          <SheetDescription>
            {KIND_LABELS[spot.kind]} · {walkMinutes} min walk (est.)
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 pb-6">
          <div
            className="rounded-xl p-4 text-base font-extrabold text-navy"
            style={{ backgroundColor: v.color }}
          >
            {v.label}
            {!evaluation.legal && (
              <p className="mt-1 text-sm font-semibold">{evaluation.reason}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            {spot.rules.map((rule, i) => (
              <p key={i} className="text-sm text-navy">
                {describeRule(rule)}
              </p>
            ))}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate">
            {spot.spaces != null && <span>{spot.spaces} spaces</span>}
            {spot.accessibleSpaces != null && spot.accessibleSpaces > 0 && (
              <span>{spot.accessibleSpaces} accessible</span>
            )}
            {spot.evChargers != null && spot.evChargers > 0 && (
              <span>{spot.evChargers} EV chargers</span>
            )}
            {spot.clearance && <span>Clearance {spot.clearance}</span>}
            {spot.zone && <span className="capitalize">{spot.zone} zone</span>}
          </div>

          {spot.notes && <p className="text-sm text-slate">{spot.notes}</p>}

          <div className="flex flex-wrap items-center gap-2">
            {spot.verified ? (
              <Badge variant="outline" className="border-mint/60 text-navy">
                Verified {spot.verifiedOn}
              </Badge>
            ) : (
              <Badge variant="outline" className="border-border text-slate">
                Unverified
              </Badge>
            )}
            {spot.source && <span className="text-xs text-slate">Source: {spot.source}</span>}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              nativeButton={false}
              render={
                <a
                  href={directionsUrl(spot.lat, spot.lng)}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
              className="flex-1 gap-2"
            >
              <Navigation className="size-4" />
              Directions
            </Button>
            {evaluation.totalCost > 0 && (
              <Button
                variant="outline"
                nativeButton={false}
                render={
                  <a href="https://www.paybyphone.com/" target="_blank" rel="noopener noreferrer" />
                }
                className="flex-1"
              >
                Pay with PayByPhone
              </Button>
            )}
          </div>

          <p className="text-center text-xs text-slate">
            Guidance only. Posted signs take priority.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
