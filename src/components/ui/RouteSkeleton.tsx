import { Skeleton } from "@/components/ui/primitives";

/** Shown while a lazily-loaded route chunk downloads. */
export function RouteSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading page">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-56 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
