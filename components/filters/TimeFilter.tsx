"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { hoursMinutesToStayMinutes } from "@/lib/rules";
import { chipClass } from "./chip-style";

const HOURS = Array.from({ length: 13 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

function durationLabel(stayMinutes: number): string {
  const h = Math.floor(stayMinutes / 60);
  const m = stayMinutes % 60;
  if (h === 0) return `${m} m`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} m`;
}

function toTimeString(date: Date): string {
  return `${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

export function TimeFilter({
  stayMinutes,
  arrival,
  onChange,
}: {
  stayMinutes: number;
  arrival: Date;
  onChange: (stayMinutes: number, arrival: Date) => void;
}) {
  const [mode, setMode] = useState<"now" | "custom">("now");
  const [timeStr, setTimeStr] = useState(() => toTimeString(arrival));

  const hours = Math.floor(stayMinutes / 60);
  const minutes = stayMinutes % 60;

  function applyMode(nextMode: "now" | "custom") {
    setMode(nextMode);
    if (nextMode === "now") {
      onChange(stayMinutes, new Date());
    } else {
      const [h, m] = timeStr.split(":").map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      onChange(stayMinutes, d);
    }
  }

  function applyTimeStr(value: string) {
    setTimeStr(value);
    const [h, m] = value.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    onChange(stayMinutes, d);
  }

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="ghost" className={chipClass(false)} />}>
        {durationLabel(stayMinutes)}
        <ChevronDown className="size-3.5 opacity-60" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 rounded-2xl p-4">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-label text-slate">Arriving</p>
        <div className="mb-3 flex gap-2">
          <Button
            variant={mode === "now" ? "default" : "outline"}
            size="sm"
            className="flex-1 rounded-lg"
            onClick={() => applyMode("now")}
          >
            Now
          </Button>
          <Button
            variant={mode === "custom" ? "default" : "outline"}
            size="sm"
            className="flex-1 rounded-lg"
            onClick={() => applyMode("custom")}
          >
            At a time
          </Button>
        </div>
        {mode === "custom" && (
          <input
            type="time"
            value={timeStr}
            onChange={(e) => applyTimeStr(e.target.value)}
            className="mb-4 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        )}

        <p className="mb-2 text-[11px] font-bold uppercase tracking-label text-slate">
          Parking for
        </p>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-[11px] text-slate">Hours</label>
            <select
              value={hours}
              onChange={(e) =>
                onChange(hoursMinutesToStayMinutes(Number(e.target.value), minutes), arrival)
              }
              className="h-10 w-full rounded-lg border border-input bg-background px-2 text-sm"
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-[11px] text-slate">Minutes</label>
            <select
              value={minutes}
              onChange={(e) =>
                onChange(hoursMinutesToStayMinutes(hours, Number(e.target.value)), arrival)
              }
              className="h-10 w-full rounded-lg border border-input bg-background px-2 text-sm"
            >
              {MINUTES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
