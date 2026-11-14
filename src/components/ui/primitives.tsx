/** Minimal, accessible UI primitives (shadcn-style API, native implementation). */

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

type ButtonVariant = "primary" | "ghost" | "outline" | "danger";

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--accent)] text-slate-900 hover:brightness-110 border border-black/10",
  ghost:
    "bg-transparent text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/10",
  outline:
    "bg-transparent text-[var(--text)] border border-[var(--surface-border)] hover:bg-black/5 dark:hover:bg-white/10",
  danger: "bg-red-600 text-white hover:bg-red-500 border border-red-700/40",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }
>(function Button(
  { variant = "primary", className = "", type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${buttonStyles[variant]} ${className}`}
      {...props}
    />
  );
});

export function Card({
  className = "",
  children,
  as: Tag = "div",
}: {
  className?: string;
  children: ReactNode;
  as?: "div" | "section" | "article";
}) {
  return <Tag className={`card ${className}`}>{children}</Tag>;
}

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className = "", ...props }, ref) {
  return (
    <input
      ref={ref}
      className={`w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] px-3.5 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-dim)] outline-none transition focus:border-[var(--ring)] ${className}`}
      {...props}
    />
  );
});

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad" | "info";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-black/10 text-[var(--text)] dark:bg-white/10",
    good: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    warn: "bg-amber-500/20 text-amber-800 dark:text-amber-300",
    bad: "bg-red-500/15 text-red-700 dark:text-red-300",
    info: "bg-sky-500/15 text-sky-800 dark:text-sky-300",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-black/10 px-2.5 py-0.5 text-[11px] font-semibold dark:border-white/10 ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-1"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
              active
                ? "bg-[var(--accent)] text-slate-900 shadow"
                : "text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/10"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] px-4 py-3 text-left disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="text-sm font-medium text-[var(--text)]">{label}</span>
      <span
        aria-hidden="true"
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-emerald-500" : "bg-slate-500/50"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}
