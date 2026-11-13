import { cn } from "@/lib/utils";

// Small colour marker for an area. Falls back to the muted text colour.
export function AreaDot({ color, className }: { color: string | null | undefined; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block h-2 w-2 shrink-0 rounded-full bg-muted", className)}
      style={color ? { backgroundColor: color } : undefined}
    />
  );
}
