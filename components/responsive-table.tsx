"use client";

import { cn } from "@/lib/utils";
import { useRef, useState, useEffect, useCallback } from "react";

interface ResponsiveTableProps {
  children: React.ReactNode;
  className?: string;
  /** Minimum width for the inner table content. Defaults to 640px. */
  minWidth?: number;
}

/**
 * Wrapper for tables that need horizontal scrolling on mobile.
 * Adds touch-friendly scrolling, minimum column widths,
 * and a fade indicator on the right edge when content is scrollable.
 */
export function ResponsiveTable({
  children,
  className,
  minWidth = 640,
}: ResponsiveTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showFade, setShowFade] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isScrollable = el.scrollWidth > el.clientWidth;
    const isNotAtEnd = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    setShowFade(isScrollable && isNotAtEnd);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);

    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll]);

  return (
    <div className={cn("relative w-full", className)}>
      <div
        ref={scrollRef}
        className={cn(
          "w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0",
          "touch-pan-x"
        )}
        style={{
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div style={{ minWidth: `${minWidth}px` }}>{children}</div>
      </div>

      {/* Right-edge fade indicator */}
      {showFade && (
        <div
          className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-12"
          style={{
            background:
              "linear-gradient(to right, transparent, rgba(255,255,255,0.9))",
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
