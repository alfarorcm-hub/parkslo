"use client";

import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ChipOption<T extends string | number> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

export function ChipGroup<T extends string | number>({
  options,
  value,
  onChange,
  className,
}: {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((opt) => {
        const active = opt.value === value;
        const Icon = opt.icon;
        return (
          <Button
            key={opt.value}
            type="button"
            variant={active ? "default" : "outline"}
            size="sm"
            className="gap-1.5 rounded-full"
            onClick={() => onChange(opt.value)}
          >
            {Icon ? <Icon className="size-3.5" /> : null}
            {opt.label}
          </Button>
        );
      })}
    </div>
  );
}
