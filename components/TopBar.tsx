"use client";

import Image from "next/image";
import { HelpCircle } from "lucide-react";
import { SearchBar } from "@/components/search/SearchBar";
import type { Destination } from "@/lib/types";

export function TopBar({
  showTagline,
  onSelectDestination,
  onHelp,
}: {
  showTagline: boolean;
  onSelectDestination: (dest: Destination) => void;
  onHelp: () => void;
}) {
  return (
    <div className="pointer-events-auto rounded-2xl bg-white p-3 shadow-lg ring-1 ring-navy/10 sm:p-3.5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex shrink-0 items-center gap-2">
          <Image src="/parkslo-icon.svg" alt="" width={32} height={32} className="rounded-[8px]" />
          <div>
            <span className="font-heading text-xl font-extrabold tracking-heading text-navy">
              parkslo
            </span>
            {showTagline && (
              <p className="text-[10px] font-bold uppercase tracking-label text-slate">
                Find parking. Skip the circling.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onHelp}
            aria-label="Curb colors help"
            className="ml-auto shrink-0 rounded-full p-2 text-slate transition-colors hover:bg-mist sm:hidden"
          >
            <HelpCircle className="size-5" />
          </button>
        </div>

        <div className="flex min-w-0 items-center gap-2 sm:flex-1">
          <SearchBar onSelect={onSelectDestination} />
          <button
            type="button"
            onClick={onHelp}
            aria-label="Curb colors help"
            className="hidden shrink-0 rounded-full p-2 text-slate transition-colors hover:bg-mist sm:block"
          >
            <HelpCircle className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
