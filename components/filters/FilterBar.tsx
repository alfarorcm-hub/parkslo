"use client";

import type { Filters } from "@/lib/types";
import { FreeOnlyToggle } from "./FreeOnlyToggle";
import { SpecialFilter } from "./SpecialFilter";
import { TimeFilter } from "./TimeFilter";
import { WalkFilter } from "./WalkFilter";

export function FilterBar({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
}) {
  return (
    <div className="pointer-events-auto flex gap-2 overflow-x-auto px-1 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <TimeFilter
        stayMinutes={filters.stayMinutes}
        arrival={filters.arrival}
        onChange={(stayMinutes, arrival) => onChange({ ...filters, stayMinutes, arrival })}
      />
      <WalkFilter maxWalk={filters.maxWalk} onChange={(maxWalk) => onChange({ ...filters, maxWalk })} />
      <SpecialFilter
        specials={filters.specials}
        hasPlacard={filters.hasPlacard}
        onSpecialsChange={(specials) => onChange({ ...filters, specials })}
        onPlacardChange={(hasPlacard) => onChange({ ...filters, hasPlacard })}
      />
      <FreeOnlyToggle
        freeOnly={filters.freeOnly}
        onChange={(freeOnly) => onChange({ ...filters, freeOnly })}
      />
    </div>
  );
}
