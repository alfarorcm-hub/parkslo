"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { status } from "@/lib/theme";

const ITEMS: { color: string; label: string }[] = [
  { color: status.free, label: "Free" },
  { color: status.paid, label: "Paid" },
  { color: status.accessible, label: "Accessible" },
  { color: status.pickup, label: "Pickup / drop-off" },
  { color: status.unknown, label: "Rules unknown" },
];

export function LegendCard() {
  const [open, setOpen] = useState(false);

  return (
    <div className="pointer-events-auto w-fit rounded-2xl bg-white shadow-lg ring-1 ring-navy/10">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-xs font-bold text-navy"
      >
        Legend
        {open ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
      </button>
      {open && (
        <div className="flex flex-col gap-1.5 px-3.5 pb-3">
          {ITEMS.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-xs text-navy">
              <span
                className="size-2.5 shrink-0 rounded-full border border-white"
                style={{ backgroundColor: item.color, boxShadow: "0 0 0 1px rgba(11,27,59,0.15)" }}
              />
              {item.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
