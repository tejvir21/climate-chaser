import { AlertTriangle, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/primitives";
import type { ProviderId } from "@/types/weather";

export function ErrorState({
  title = "Weather data is unavailable",
  message,
  attempted,
  onRetry,
  retrying = false,
}: {
  title?: string;
  message: string;
  attempted?: ProviderId[];
  onRetry?: () => void;
  retrying?: boolean;
}) {
  return (
    <div
      role="alert"
      className="card mx-auto max-w-lg p-6 text-center"
    >
      <AlertTriangle
        size={36}
        aria-hidden="true"
        className="mx-auto text-amber-400"
      />
      <h2 className="mt-3 text-lg font-extrabold text-[var(--text)]">{title}</h2>
      <p className="mt-1 text-sm text-[var(--text-dim)]">{message}</p>
      {attempted && attempted.length > 0 && (
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-dim)]">
          Attempted: {attempted.join(" → ")}
        </p>
      )}
      {onRetry && (
        <Button className="mt-4" onClick={onRetry} disabled={retrying}>
          <RefreshCw
            size={15}
            aria-hidden="true"
            className={retrying ? "animate-spin" : ""}
          />
          {retrying ? "Retrying…" : "Try again"}
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  children,
}: {
  title: string;
  message: string;
  children?: ReactNode;
}) {
  return (
    <div className="card mx-auto max-w-md p-6 text-center">
      <h2 className="text-base font-extrabold text-[var(--text)]">{title}</h2>
      <p className="mt-1 text-sm text-[var(--text-dim)]">{message}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
