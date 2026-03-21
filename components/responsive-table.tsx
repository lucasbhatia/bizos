"use client";

import { cn } from "@/lib/utils";

interface ResponsiveTableProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wrapper for tables that need horizontal scrolling on mobile.
 * Adds touch-friendly scrolling and proper overflow handling.
 */
export function ResponsiveTable({ children, className }: ResponsiveTableProps) {
  return (
    <div
      className={cn(
        "w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0",
        "touch-pan-x",
        className
      )}
    >
      <div className="min-w-[640px]">{children}</div>
    </div>
  );
}
