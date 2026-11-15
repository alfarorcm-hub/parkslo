"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { chipClass } from "./chip-style";

const QUICK_PICKS = [5, 10, 15];

export function WalkFilter({
  maxWalk,
  onChange,
}: {
  maxWalk: number;
  onChange: (maxWalk: number) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="ghost" className={chipClass(false)} />}>
        ≤ {maxWalk} min walk
        <ChevronDown className="size-3.5 opacity-60" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 rounded-2xl p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <p className="text-[11px] font-bold uppercase tracking-label text-slate">Max walk</p>
          <p className="font-heading text-lg font-extrabold text-navy">{maxWalk} min</p>
        </div>
        <Slider
          value={[maxWalk]}
          min={1}
          max={30}
          step={1}
          onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
          className="mb-4"
        />
        <div className="flex gap-2">
          {QUICK_PICKS.map((m) => (
            <Button
              key={m}
              variant={maxWalk === m ? "default" : "outline"}
              size="sm"
              className="flex-1 rounded-lg"
              onClick={() => onChange(m)}
            >
              {m} min
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
