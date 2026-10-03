import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Screen({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("space-y-5 px-4 pt-3 pb-6", className)}>{children}</div>;
}

export function Section({
  title,
  action,
  children,
  className,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-2", className)}>
      {(title || action) && (
        <div className="flex min-h-8 items-center justify-between gap-2 px-1">
          {title && <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Panel({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-2xl border bg-card text-card-foreground shadow-xs", className)} {...props} />;
}

export function ListGroup({ className, ...props }: ComponentProps<"ul">) {
  return <ul className={cn("divide-y overflow-hidden rounded-2xl border bg-card shadow-xs", className)} {...props} />;
}

interface RowProps {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  href?: string;
  onClick?: () => void;
  chevron?: boolean;
  className?: string;
}

/** A tappable list row, the basic building block of settings and logs. */
export function Row({ icon, title, subtitle, trailing, href, onClick, chevron, className }: RowProps) {
  const body = (
    <>
      {icon && <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium">{title}</span>
        {subtitle && <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>}
      </span>
      {trailing && <span className="shrink-0 text-sm text-muted-foreground">{trailing}</span>}
      {(chevron ?? Boolean(href)) && <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
    </>
  );
  const rowClass = cn("flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left", className);

  if (href) {
    return (
      <li>
        <Link href={href} className={cn(rowClass, "active:bg-muted")}>
          {body}
        </Link>
      </li>
    );
  }
  if (onClick) {
    return (
      <li>
        <button type="button" onClick={onClick} className={cn(rowClass, "active:bg-muted")}>
          {body}
        </button>
      </li>
    );
  }
  return <li className={rowClass}>{body}</li>;
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-secondary text-secondary-foreground">{icon}</span>
      <p className="font-medium">{title}</p>
      {body && <p className="max-w-xs text-sm text-muted-foreground">{body}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
