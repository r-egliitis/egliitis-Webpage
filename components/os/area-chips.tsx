"use client";

import { AreaDot } from "@/components/os/area-dot";
import { chipClass } from "@/components/os/quick-add";
import type { Area } from "@/types/database";

// Single-select area filter. null = all areas.
export function AreaChips({
  areas,
  value,
  onChange,
}: {
  areas: Area[];
  value: string | null;
  onChange: (areaId: string | null) => void;
}) {
  return (
    <div role="group" aria-label="Filter by area" className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <button type="button" aria-pressed={value === null} onClick={() => onChange(null)} className={chipClass(value === null)}>
        All
      </button>
      {areas.map((area) => (
        <button
          key={area.id}
          type="button"
          aria-pressed={value === area.id}
          onClick={() => onChange(value === area.id ? null : area.id)}
          className={chipClass(value === area.id)}
        >
          <AreaDot color={area.color} />
          {area.name}
        </button>
      ))}
    </div>
  );
}
