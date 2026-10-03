"use client";

import type { ReactNode } from "react";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

/** Swipe-to-dismiss sheet that rises from the bottom, sized like a phone even on desktop. */
export function BottomSheet({ open, onOpenChange, title, description, children, className }: BottomSheetProps) {
  return (
    <Drawer open={open} onOpenChange={(next) => onOpenChange(next)} showSwipeHandle>
      <DrawerContent className="mx-auto w-full max-w-md">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-lg font-semibold">{title}</DrawerTitle>
          {description && <DrawerDescription className="text-left">{description}</DrawerDescription>}
        </DrawerHeader>
        <div className={cn("overflow-y-auto px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]", className)}>
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
