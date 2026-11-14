import { Database, RefreshCw } from "lucide-react";
import type { ProviderMeta } from "@/types/weather";
import { formatAge } from "@/utils/units";
import { Badge } from "@/components/ui/primitives";

/**
 * Shows which provider answered, when it was fetched, and an explicit
 * stale-data label when the payload came from cache after a provider failure.
 */
export function SourceBadge({
  meta,
  now,
  onRefresh,
  refreshing = false,
}: {
  meta: ProviderMeta;
  now: number;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-dim)]">
      <Badge tone={meta.stale ? "warn" : "info"} className="!text-[11px]">
        <Database size={11} aria-hidden="true" />
        {meta.name}
      </Badge>
      <span>updated {formatAge(meta.fetchedAt, now)}</span>
      {meta.stale && (
        <Badge tone="warn">
          Stale · showing last known data
        </Badge>
      )}
      {meta.partial && <Badge tone="warn">Current conditions only</Badge>}
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Refresh weather data"
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--surface-border)] px-2 py-1 font-semibold text-[var(--text)] transition hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/10"
        >
          <RefreshCw
            size={12}
            aria-hidden="true"
            className={refreshing ? "animate-spin" : ""}
          />
          Refresh
        </button>
      )}
    </div>
  );
}
