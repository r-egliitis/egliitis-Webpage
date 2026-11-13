export function ProgressBar({ done, total, label }: { done: number; total: number; label: string }) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-1.5 w-full overflow-hidden rounded-full bg-fg/10"
    >
      <div className="h-full rounded-full bg-fg transition-[width] duration-500" style={{ width: `${percent}%` }} />
    </div>
  );
}
