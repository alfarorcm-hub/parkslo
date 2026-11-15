"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { destinations as quickPickDestinations } from "@/lib/data";
import { defaultGeocodeProvider } from "@/lib/providers/geocode-provider";
import type { Destination } from "@/lib/types";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 400;

export function SearchBar({
  onSelect,
}: {
  onSelect: (dest: Destination) => void;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Stale suggestions simply won't render — the dropdown only shows them
    // when the query is 2+ chars (see showSuggestions below).
    if (query.trim().length < 2) return;

    const timer = setTimeout(async () => {
      setLoading(true);
      const results = await defaultGeocodeProvider.search(query);
      setSuggestions(results);
      setLoading(false);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function choose(dest: Destination) {
    setQuery(dest.name);
    setOpen(false);
    onSelect(dest);
  }

  const showQuickPicks = open && query.trim() === "";
  const showSuggestions = open && query.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative w-full sm:min-w-[280px] sm:flex-1">
      <form
        className="relative w-full"
        onSubmit={(e) => {
          e.preventDefault();
          if (suggestions[0]) choose(suggestions[0]);
        }}
      >
        <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search an address or place in SLO"
          className="h-11 w-full rounded-xl border-border bg-mist pl-9 pr-11 text-sm"
          aria-label="Search address or place"
        />
        <Button
          type="submit"
          size="icon-lg"
          aria-label="Search"
          className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 rounded-lg bg-mint text-navy hover:bg-mint/80"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
        </Button>
      </form>

      {(showQuickPicks || showSuggestions) && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[1000] max-h-80 overflow-y-auto rounded-2xl bg-white p-2 shadow-lg ring-1 ring-navy/10">
          {showSuggestions && (
            <>
              {suggestions.length === 0 && !loading ? (
                <p className="px-3 py-2 text-sm text-slate">No matches found.</p>
              ) : (
                suggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-mist"
                    onClick={() => choose(s)}
                  >
                    <MapPin className="mt-0.5 size-4 shrink-0 text-slate" />
                    <span className="truncate">{s.name}</span>
                  </button>
                ))
              )}
            </>
          )}

          {showQuickPicks && (
            <>
              <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-label text-slate">
                Popular destinations
              </p>
              <div className="flex flex-wrap gap-2 p-2">
                {quickPickDestinations.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => choose(d)}
                    className={cn(
                      "rounded-full bg-mist px-3 py-1.5 text-sm font-medium text-navy",
                      "transition-transform active:scale-[0.97] hover:bg-mist/70",
                    )}
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
