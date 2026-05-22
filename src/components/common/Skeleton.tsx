export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-zinc-100 dark:bg-white/8 ${className}`} aria-hidden="true" />
  );
}
