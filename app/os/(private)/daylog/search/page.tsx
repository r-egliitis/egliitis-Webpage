import Link from "next/link";
import { Suspense } from "react";
import { SearchResults } from "@/components/daylog/search-results";
import { ListSkeleton } from "@/components/os/skeletons";
import { searchEntries } from "@/lib/daylog/queries";

// Search every entry of every day. The query lives in ?q= (a plain GET form,
// so it works before JavaScript loads and the back button keeps it).
export default function DaylogSearchPage({ searchParams }: PageProps<"/os/daylog/search">) {
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/os/daylog" className="font-mono text-xs text-muted hover:text-fg">
        ← Day Log
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Search</h1>
      <Suspense fallback={<div className="mt-8"><ListSkeleton rows={4} /></div>}>
        <SearchData searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function SearchData({ searchParams }: Pick<PageProps<"/os/daylog/search">, "searchParams">) {
  const raw = (await searchParams).q;
  const query = (Array.isArray(raw) ? raw[0] : raw)?.slice(0, 200) ?? "";
  const results = query ? await searchEntries(query) : [];

  return (
    <>
      <form role="search" action="/os/daylog/search" className="mt-6 flex gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Search entries</span>
          <input
            type="search"
            name="q"
            defaultValue={query}
            autoFocus={!query}
            placeholder="What did you write?"
            enterKeyHint="search"
            className="h-11 w-full rounded-full border border-line bg-transparent px-4 text-base outline-none transition-colors focus:border-fg"
          />
        </label>
        <button type="submit" className="h-11 shrink-0 rounded-full bg-fg px-5 text-sm font-medium text-surface">
          Search
        </button>
      </form>
      <div className="mt-6">
        <SearchResults query={query} results={results} />
      </div>
    </>
  );
}
