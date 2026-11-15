import Link from "next/link";
import { EmptyState } from "@/components/os/empty-state";
import { formatLongDate } from "@/lib/os/dates";
import type { SearchResult } from "@/lib/daylog/queries";
import { highlightParts, searchWords } from "@/lib/daylog/search";
import { formatTime, rangeLabel } from "@/lib/daylog/time";

// Results grouped by day, newest first, with the matched words highlighted.
export function SearchResults({ query, results }: { query: string; results: SearchResult[] }) {
  if (!searchWords(query).length) return null;
  if (results.length === 0) {
    return <EmptyState title="Nothing found.">Try fewer or shorter words.</EmptyState>;
  }

  const words = searchWords(query);
  const byDay = new Map<string, SearchResult[]>();
  for (const result of results) byDay.set(result.day, [...(byDay.get(result.day) ?? []), result]);

  return (
    <div>
      <p className="font-mono text-xs text-muted">
        {results.length === 50 ? "First 50 matches" : `${results.length} ${results.length === 1 ? "match" : "matches"}`}
      </p>
      {[...byDay.entries()].map(([day, dayResults]) => (
        <section key={day} aria-label={formatLongDate(day)} className="mt-6">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-muted">{formatLongDate(day)} {day.slice(0, 4)}</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {dayResults.map((result) => (
              <li key={result.id}>
                <Link
                  href={`/os/daylog/${day}#entry-${result.id}`}
                  className="block rounded-2xl bg-fg/[0.04] px-4 py-3 transition-colors hover:bg-fg/[0.08]"
                >
                  <span className="block font-mono text-[0.6875rem] text-muted">
                    {result.kind === "opening" ? `until ${formatTime(result.start)}` : rangeLabel(result.start, result.end)}
                  </span>
                  <span className="mt-1 block whitespace-pre-wrap break-words leading-snug">
                    {highlightParts(result.body, words).map((part, index) =>
                      part.match ? (
                        <mark key={index} className="rounded bg-fg/15 px-0.5 text-fg">
                          {part.text}
                        </mark>
                      ) : (
                        <span key={index}>{part.text}</span>
                      ),
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
