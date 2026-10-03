"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Choice<T extends string> {
  value: T;
  label: string;
  description?: string;
  icon?: ReactNode;
}

interface ChoiceListProps<T extends string> {
  label: string;
  value: T | undefined;
  onChange: (value: T) => void;
  choices: Choice<T>[];
  columns?: 1 | 2;
}

/** Large tappable radio cards. Uses native radios so keyboard and screen readers work. */
export function ChoiceList<T extends string>({ label, value, onChange, choices, columns = 1 }: ChoiceListProps<T>) {
  return (
    <fieldset>
      <legend className="sr-only">{label}</legend>
      <div className={cn("grid gap-2.5", columns === 2 && "grid-cols-2")}>
        {choices.map((choice) => {
          const checked = choice.value === value;
          return (
            <label
              key={choice.value}
              className={cn(
                "relative flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border bg-card px-4 py-3 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                checked ? "border-primary bg-accent" : "active:bg-muted",
              )}
            >
              <input
                type="radio"
                name={label}
                value={choice.value}
                checked={checked}
                onChange={() => onChange(choice.value)}
                className="sr-only"
              />
              {choice.icon && (
                <span className={cn("text-2xl leading-none", !checked && "grayscale-[30%]")} aria-hidden>
                  {choice.icon}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium">{choice.label}</span>
                {choice.description && <span className="block text-xs text-muted-foreground">{choice.description}</span>}
              </span>
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full border-2",
                  checked ? "border-primary bg-primary text-primary-foreground" : "border-input",
                )}
              >
                {checked && <Check className="size-3.5" strokeWidth={3} />}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Compact two-to-four option toggle, e.g. sex or chart range. */
export function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-muted p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "min-h-10 rounded-lg px-3 text-sm font-medium transition-colors",
            o.value === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
