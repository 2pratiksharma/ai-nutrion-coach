import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ProgressRingProps {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  className?: string;
  /** Tailwind text color class; the ring uses currentColor. */
  tone?: string;
  label: string;
  children?: ReactNode;
}

/** Circular meter. Past 100% the ring stays full and switches to the warning tone. */
export function ProgressRing({
  value,
  max,
  size = 132,
  stroke = 12,
  className,
  tone = "text-primary",
  label,
  children,
}: ProgressRingProps) {
  const pct = max > 0 ? value / max : 0;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const over = pct > 1.05;
  const dash = circumference * Math.min(1, Math.max(0, pct));

  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      className={cn("relative grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        {dash > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            stroke="currentColor"
            strokeDasharray={`${dash} ${circumference}`}
            className={cn(
              "transition-[stroke-dasharray] duration-700 ease-out",
              over ? "text-warning" : tone,
            )}
          />
        )}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        {children}
      </div>
    </div>
  );
}
