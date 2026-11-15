import { cn } from "@/lib/utils";

export function chipClass(active: boolean, extra?: string): string {
  return cn(
    "h-9 shrink-0 gap-1.5 rounded-full px-3.5 text-sm font-semibold",
    active ? "bg-mint text-navy hover:bg-mint/80" : "bg-mist text-navy hover:bg-mist/70",
    extra,
  );
}
