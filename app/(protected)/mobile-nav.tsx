"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  CheckSquare,
  MoreHorizontal,
} from "lucide-react";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { UserRole } from "@/lib/types/database";

interface MobileNavProps {
  userRole: UserRole;
}

interface TabItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const PRIMARY_TABS: TabItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Cases", href: "/cases", icon: Briefcase },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
];

const MORE_ITEMS: { label: string; href: string; roles: UserRole[] }[] = [
  { label: "Documents", href: "/documents", roles: ["admin", "broker_lead", "ops_manager", "specialist", "finance"] },
  { label: "Clients", href: "/clients", roles: ["admin", "ops_manager", "broker_lead"] },
  { label: "Finance", href: "/finance", roles: ["admin", "finance"] },
  { label: "Reports", href: "/reports", roles: ["admin", "ops_manager", "broker_lead"] },
  { label: "Audit Trail", href: "/audit", roles: ["admin", "broker_lead"] },
  { label: "Settings", href: "/settings", roles: ["admin"] },
  { label: "Admin", href: "/admin", roles: ["admin"] },
];

export function MobileNav({ userRole }: MobileNavProps) {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  const visibleMoreItems = MORE_ITEMS.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white md:hidden"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-14">
        {PRIMARY_TABS.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={`
                relative flex flex-1 flex-col items-center gap-1 text-xs font-medium
                min-h-[44px] min-w-[44px] justify-center
                transition-all duration-150
                active:scale-95
                ${
                  isActive
                    ? "text-blue-600"
                    : "text-slate-500 active:text-slate-900"
                }
              `}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-blue-600"
                  aria-hidden="true"
                />
              )}
              <Icon className="h-5 w-5" />
              {tab.label}
            </Link>
          );
        })}

        {/* More button */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button
              aria-label="More navigation options"
              className={`
                relative flex flex-1 flex-col items-center gap-1 text-xs font-medium
                min-h-[44px] min-w-[44px] justify-center
                transition-all duration-150
                active:scale-95
                ${
                  sheetOpen
                    ? "text-blue-600"
                    : "text-slate-500 active:text-slate-900"
                }
              `}
            >
              {sheetOpen && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-blue-600"
                  aria-hidden="true"
                />
              )}
              <MoreHorizontal className="h-5 w-5" />
              More
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-xl">
            <SheetHeader>
              <SheetTitle>More</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-3 py-4">
              {visibleMoreItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSheetOpen(false)}
                    className={`
                      flex flex-col items-center gap-2 rounded-lg p-3 text-sm font-medium
                      min-h-[44px] justify-center
                      transition-all duration-150
                      active:scale-95
                      ${
                        isActive
                          ? "bg-blue-50 text-blue-600"
                          : "text-slate-600 hover:bg-slate-50"
                      }
                    `}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
