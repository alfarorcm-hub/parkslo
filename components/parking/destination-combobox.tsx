"use client";

import { useState } from "react";
import { Check, ChevronDown, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { destinations } from "@/lib/data";
import { cn } from "@/lib/utils";

export function DestinationCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = destinations.find((d) => d.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className="h-12 w-full justify-between px-3 text-base font-normal"
          />
        }
      >
        <span className="flex items-center gap-2 truncate">
          <MapPin className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">
            {selected ? selected.name : "Choose a destination"}
          </span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[calc(100vw-2rem)] max-w-sm p-0"
      >
        <Command>
          <CommandInput placeholder="Search downtown SLO..." />
          <CommandList>
            <CommandEmpty>No destination found.</CommandEmpty>
            <CommandGroup>
              {destinations.map((dest) => (
                <CommandItem
                  key={dest.id}
                  value={dest.name}
                  onSelect={() => {
                    onChange(dest.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "size-4",
                      value === dest.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {dest.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
