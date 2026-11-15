"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { SpecialCategory } from "@/lib/types";
import { chipClass } from "./chip-style";

const OPTIONS: { value: SpecialCategory; label: string }[] = [
  { value: "motorcycle", label: "Motorcycle" },
  { value: "accessible", label: "Accessible (disabled placard)" },
  { value: "pickup", label: "Pickup / drop-off" },
  { value: "ev", label: "EV charging" },
];

export function SpecialFilter({
  specials,
  hasPlacard,
  onSpecialsChange,
  onPlacardChange,
}: {
  specials: SpecialCategory[];
  hasPlacard: boolean;
  onSpecialsChange: (specials: SpecialCategory[]) => void;
  onPlacardChange: (hasPlacard: boolean) => void;
}) {
  const active = specials.length > 0;

  function toggle(value: SpecialCategory, checked: boolean) {
    if (checked) {
      onSpecialsChange([...specials, value]);
    } else {
      onSpecialsChange(specials.filter((s) => s !== value));
      if (value === "accessible") onPlacardChange(false);
    }
  }

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="ghost" className={chipClass(active)} />}>
        Special{active ? ` (${specials.length})` : ""}
        <ChevronDown className="size-3.5 opacity-60" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 rounded-2xl p-4">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-label text-slate">
          Special needs
        </p>
        <div className="flex flex-col gap-3">
          {OPTIONS.map((opt) => (
            <div key={opt.value}>
              <label className="flex items-center gap-2.5 text-sm text-navy">
                <Checkbox
                  checked={specials.includes(opt.value)}
                  onCheckedChange={(checked) => toggle(opt.value, checked === true)}
                />
                {opt.label}
              </label>
              {opt.value === "accessible" && specials.includes("accessible") && (
                <label className="ml-6 mt-2 flex items-center gap-2.5 text-sm text-slate">
                  <Checkbox
                    checked={hasPlacard}
                    onCheckedChange={(checked) => onPlacardChange(checked === true)}
                  />
                  I have a disabled placard
                </label>
              )}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
