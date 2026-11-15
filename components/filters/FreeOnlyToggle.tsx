"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { chipClass } from "./chip-style";

export function FreeOnlyToggle({
  freeOnly,
  onChange,
}: {
  freeOnly: boolean;
  onChange: (freeOnly: boolean) => void;
}) {
  return (
    <Button
      variant="ghost"
      className={chipClass(freeOnly)}
      aria-pressed={freeOnly}
      onClick={() => onChange(!freeOnly)}
    >
      {freeOnly && <Check className="size-3.5" strokeWidth={3} />}
      Free only
    </Button>
  );
}
