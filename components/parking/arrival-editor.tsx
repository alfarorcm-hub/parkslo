"use client";

import { ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const DURATION_OPTIONS = [30, 60, 90, 120, 180, 240];

export type ArrivalMode = "now" | "custom";

export interface ArrivalEditorProps {
  arrivalMode: ArrivalMode;
  onArrivalModeChange: (mode: ArrivalMode) => void;
  customTime: string;
  onCustomTimeChange: (time: string) => void;
  stayMinutes: number;
  onStayMinutesChange: (minutes: number) => void;
}

function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes % 60 === 0) return `${minutes / 60} hr`;
  return `${(minutes / 60).toFixed(1)} hr`;
}

function to12Hour(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m.toString().padStart(2, "0")} ${period}`;
}

export function summarizeArrival(
  arrivalMode: ArrivalMode,
  customTime: string,
  stayMinutes: number,
): string {
  const when = arrivalMode === "now" ? "now" : `at ${to12Hour(customTime)}`;
  return `Arriving ${when} · staying ${durationLabel(stayMinutes)}`;
}

export function ArrivalEditor({
  arrivalMode,
  onArrivalModeChange,
  customTime,
  onCustomTimeChange,
  stayMinutes,
  onStayMinutesChange,
}: ArrivalEditorProps) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            variant="outline"
            className="h-12 w-full justify-between px-3 text-base font-normal"
          />
        }
      >
        <span className="flex items-center gap-2 truncate">
          <Clock className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">
            {summarizeArrival(arrivalMode, customTime, stayMinutes)}
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </SheetTrigger>

      <SheetContent side="bottom" className="rounded-t-xl">
        <SheetHeader>
          <SheetTitle>When & how long</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4">
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Arrival
            </p>
            <div className="flex gap-2">
              <Button
                variant={arrivalMode === "now" ? "default" : "outline"}
                className="flex-1"
                onClick={() => onArrivalModeChange("now")}
              >
                Now
              </Button>
              <Button
                variant={arrivalMode === "custom" ? "default" : "outline"}
                className="flex-1"
                onClick={() => onArrivalModeChange("custom")}
              >
                Pick a time
              </Button>
            </div>
            {arrivalMode === "custom" ? (
              <input
                type="time"
                value={customTime}
                onChange={(e) => onCustomTimeChange(e.target.value)}
                className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            ) : null}
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Staying for
            </p>
            <div className="grid grid-cols-3 gap-2">
              {DURATION_OPTIONS.map((minutes) => (
                <Button
                  key={minutes}
                  variant={stayMinutes === minutes ? "default" : "outline"}
                  size="sm"
                  className={cn("w-full")}
                  onClick={() => onStayMinutesChange(minutes)}
                >
                  {durationLabel(minutes)}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <SheetFooter>
          <SheetClose render={<Button className="w-full" />}>Done</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
