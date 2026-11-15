import { Footprints, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { status } from "@/lib/theme";
import type { UnknownSpot } from "@/lib/types";

export function UnknownSpotRow({
  spot,
  walkMinutes,
  onSelect,
}: {
  spot: UnknownSpot;
  walkMinutes: number;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-mist/60"
    >
      <div className="relative mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-mist">
        <span
          className="absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-white"
          style={{ backgroundColor: status.unknown }}
        />
        <MapPin className="size-4.5 text-slate" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-navy">{spot.name}</p>
        <p className="flex items-center gap-1 text-xs font-bold text-navy">
          <Footprints className="size-3 text-slate" />
          {walkMinutes} min est.
        </p>
        <p className="mt-1 text-xs text-slate">Rules unknown — check posted signs</p>
        <Badge variant="outline" className="mt-1.5 border-border text-[10px] text-slate">
          From OpenStreetMap
        </Badge>
      </div>
    </button>
  );
}
