"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const CURBS: { color: string; label: string; meaning: string }[] = [
  { color: "#EF4444", label: "Red", meaning: "No stopping" },
  { color: "#F5A524", label: "Yellow", meaning: "Commercial loading" },
  { color: "#FFFFFF", label: "White", meaning: "Passenger loading" },
  { color: "#2EE6A6", label: "Green", meaning: "Short-term parking" },
  { color: "#2563EB", label: "Blue", meaning: "Accessible parking only" },
];

export function CurbColorsSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="font-heading text-lg font-extrabold tracking-heading text-navy">
            Curb colors
          </SheetTitle>
          <SheetDescription>
            Red, yellow, and permit zones are never recommended by parkslo.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-3 px-4 pb-6">
          {CURBS.map((c) => (
            <div key={c.label} className="flex items-center gap-3 text-sm text-navy">
              <span
                className="size-5 shrink-0 rounded-full border border-navy/15"
                style={{ backgroundColor: c.color }}
              />
              <span className="font-semibold">{c.label}</span>
              <span className="text-slate">{c.meaning}</span>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
