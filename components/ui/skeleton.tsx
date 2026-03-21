import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Base skeleton
// ---------------------------------------------------------------------------

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-slate-200/60",
        className
      )}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

/** Single line of text */
function SkeletonText({ className }: { className?: string }) {
  return <Skeleton className={cn("h-4 w-full", className)} />;
}

/** Card placeholder */
function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200 bg-white p-5 space-y-3",
        className
      )}
    >
      <Skeleton className="h-4 w-2/5" />
      <Skeleton className="h-3 w-4/5" />
      <Skeleton className="h-3 w-3/5" />
    </div>
  );
}

/** Table row placeholder */
function SkeletonTableRow({
  columns = 5,
  className,
}: {
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-4 py-3 px-4", className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4 flex-1"
          style={{ maxWidth: i === 0 ? "30%" : undefined }}
        />
      ))}
    </div>
  );
}

/** Avatar circle */
function SkeletonAvatar({ className }: { className?: string }) {
  return <Skeleton className={cn("h-10 w-10 rounded-full", className)} />;
}

export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonTableRow,
  SkeletonAvatar,
};
