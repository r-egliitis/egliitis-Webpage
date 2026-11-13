// Loading placeholders for /os screens. Pure CSS, no data.

function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-full bg-fg/10 ${className}`} />;
}

export function TodaySkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <Bar className="h-3 w-40" />
      <Bar className="mt-4 h-8 w-32" />
      <Bar className="mt-3 h-3 w-24" />
      <div className="mt-10 space-y-5">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="flex items-center gap-3">
            <div className="h-[22px] w-[22px] animate-pulse rounded-full bg-fg/10" />
            <Bar className="h-4 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-4">
      {Array.from({ length: rows }, (_, row) => (
        <Bar key={row} className="h-10 w-full rounded-xl" />
      ))}
    </div>
  );
}
