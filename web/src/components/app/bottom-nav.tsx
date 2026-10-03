"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ChartLine, House, Plus, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuickAdd } from "./quick-add";

const tabs = [
  { href: "/", label: "Today", icon: House, match: (p: string) => p === "/" },
  { href: "/diary", label: "Diary", icon: BookOpen, match: (p: string) => p.startsWith("/diary") || p.startsWith("/log") },
  { href: "/progress", label: "Progress", icon: ChartLine, match: (p: string) => p.startsWith("/progress") },
  { href: "/me", label: "Me", icon: UserRound, match: (p: string) => p.startsWith("/me") },
];

export function BottomNav() {
  const pathname = usePathname();
  const { open } = useQuickAdd();
  const [left, right] = [tabs.slice(0, 2), tabs.slice(2)];

  const renderTab = (tab: (typeof tabs)[number]) => {
    const active = tab.match(pathname);
    const Icon = tab.icon;
    return (
      <Link
        key={tab.href}
        href={tab.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
          active ? "text-primary" : "text-muted-foreground active:text-foreground",
        )}
      >
        <Icon className="size-6" strokeWidth={active ? 2.4 : 1.9} />
        {tab.label}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t bg-background/90 pb-safe backdrop-blur-xl supports-[backdrop-filter]:bg-background/75"
    >
      <div className="flex items-stretch px-2">
        {left.map(renderTab)}
        <div className="flex flex-1 items-center justify-center">
          <button
            type="button"
            onClick={open}
            aria-label="Add a log"
            className="-mt-5 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-background transition-transform active:scale-95"
          >
            <Plus className="size-7" strokeWidth={2.5} />
          </button>
        </div>
        {right.map(renderTab)}
      </div>
    </nav>
  );
}
