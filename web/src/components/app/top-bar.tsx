"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopBarProps {
  title: string;
  subtitle?: string;
  /** Where the back button goes; history back when omitted but `back` is true. */
  backHref?: string;
  back?: boolean;
  actions?: ReactNode;
  large?: boolean;
}

export function TopBar({ title, subtitle, backHref, back, actions, large }: TopBarProps) {
  const router = useRouter();
  const showBack = back || backHref;

  function goBack() {
    if (backHref) router.push(backHref);
    else if (window.history.length > 1) router.back();
    else router.push("/");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-transparent bg-background/85 pt-safe backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className={cn("flex min-h-14 items-center gap-1 px-2", large && "min-h-16")}>
        {showBack ? (
          <button
            type="button"
            onClick={goBack}
            aria-label="Back"
            className="grid size-11 shrink-0 place-items-center rounded-full text-foreground active:bg-muted"
          >
            <ChevronLeft className="size-6" />
          </button>
        ) : (
          <span className="w-2" />
        )}
        <div className="min-w-0 flex-1">
          <h1 className={cn("truncate font-semibold tracking-tight", large ? "text-2xl" : "text-lg")}>{title}</h1>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1 pr-1">{actions}</div>}
      </div>
    </header>
  );
}

export function IconButton({
  label,
  children,
  onClick,
  className,
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn("grid size-11 place-items-center rounded-full text-foreground active:bg-muted", className)}
    >
      {children}
    </button>
  );
}
