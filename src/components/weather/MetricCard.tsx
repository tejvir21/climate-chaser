import type { ReactNode } from "react";
import { Card, Skeleton } from "@/components/ui/primitives";

export function MetricCard({
  icon,
  label,
  value,
  sub,
  loading = false,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  loading?: boolean;
}) {
  return (
    <Card className="flex flex-col gap-1.5 !p-4">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
        <span aria-hidden="true" className="text-[var(--accent)]">{icon}</span>
        {label}
      </div>
      {loading ? (
        <Skeleton className="h-7 w-24" />
      ) : (
        <div className="text-2xl font-extrabold tracking-tight text-[var(--text)]">
          {value}
        </div>
      )}
      {sub && !loading && <div className="text-xs text-[var(--text-dim)]">{sub}</div>}
    </Card>
  );
}
