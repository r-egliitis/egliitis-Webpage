import { AreaDot } from "@/components/os/area-dot";
import type { DayStats } from "@/lib/daylog/stats";
import { durationLabel, rangeLabel } from "@/lib/daylog/time";
import type { DaylogTag } from "@/types/database";

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.15em] text-muted">{label}</dt>
      <dd className="mt-1 text-lg font-medium tracking-tight">{value}</dd>
    </div>
  );
}

// One day's numbers: time, slot counts, time per tag, longest gaps.
export function DayStatsView({ stats, tags }: { stats: DayStats; tags: Pick<DaylogTag, "id" | "name" | "color">[] }) {
  const tagById = new Map(tags.map((tag) => [tag.id, tag]));
  const longest = Math.max(1, ...stats.perTag.map((tag) => tag.ms));
  const { empty, skipped, locked } = stats.slots;

  return (
    <section aria-label="Day stats" className="rounded-2xl border border-line p-5">
      <dl className="grid grid-cols-3 gap-4">
        <Figure label="Tracked" value={durationLabel(stats.trackedMs)} />
        <Figure label="Written" value={durationLabel(stats.writtenMs)} />
        <Figure label="Paused" value={stats.pausedMs > 0 ? durationLabel(stats.pausedMs) : "—"} />
      </dl>
      <p className="mt-4 font-mono text-xs text-muted">
        {stats.entries} {stats.entries === 1 ? "entry" : "entries"} · {empty} empty
        {skipped > 0 && ` · ${skipped} skipped`}
        {locked > 0 && ` · ${locked} locked`}
      </p>

      {stats.perTag.length > 0 && (
        <div className="mt-6">
          <h3 className="font-mono text-[0.6875rem] uppercase tracking-[0.15em] text-muted">Time per tag</h3>
          <ul className="mt-3 flex flex-col gap-2.5">
            {stats.perTag.map(({ tagId, ms }) => {
              const tag = tagId ? tagById.get(tagId) : undefined;
              const name = tagId === null ? "Untagged" : (tag?.name ?? "Deleted tag");
              return (
                <li key={tagId ?? "untagged"} className="grid grid-cols-[minmax(0,8rem)_1fr_auto] items-center gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <AreaDot color={tag?.color} />
                    <span className="truncate">{name}</span>
                  </span>
                  <span aria-hidden className="h-2 overflow-hidden rounded-full bg-fg/[0.06]">
                    {/* Ink, not the tag colour: several tag colours are too light to read as bars; the dot carries identity. */}
                    <span className="block h-full rounded-full bg-fg/70" style={{ width: `${(ms / longest) * 100}%` }} />
                  </span>
                  <span className="font-mono text-xs text-muted">{durationLabel(ms)}</span>
                </li>
              );
            })}
          </ul>
          {stats.perTag.filter((tag) => tag.tagId !== null).length > 1 && (
            <p className="mt-2 text-xs text-muted">An entry with several tags counts toward each.</p>
          )}
        </div>
      )}

      {stats.longestGaps.length > 0 && (
        <div className="mt-6">
          <h3 className="font-mono text-[0.6875rem] uppercase tracking-[0.15em] text-muted">Longest gaps</h3>
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-mono text-sm">
            {stats.longestGaps.map((gap) => (
              <li key={gap.start}>
                {rangeLabel(gap.start, gap.end)} <span className="text-muted">({durationLabel(gap.end - gap.start)})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
