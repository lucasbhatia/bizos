"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  CheckSquare,
  Users,
  DollarSign,
  BarChart3,
  Settings,
  Menu,
  X,
  ScrollText,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/logout-button";
import type { UserWithTenant, UserRole } from "@/lib/types/database";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "broker_lead", "ops_manager", "specialist", "finance", "viewer"] },
  { label: "Cases", href: "/cases", icon: Briefcase, roles: ["admin", "broker_lead", "ops_manager", "specialist", "finance"] },
  { label: "Documents", href: "/documents", icon: FileText, roles: ["admin", "broker_lead", "ops_manager", "specialist", "finance"] },
  { label: "Tasks", href: "/tasks", icon: CheckSquare, roles: ["admin", "broker_lead", "ops_manager", "specialist", "finance"] },
  { label: "Clients", href: "/clients", icon: Users, roles: ["admin", "ops_manager", "broker_lead"] },
  { label: "Finance", href: "/finance", icon: DollarSign, roles: ["admin", "finance"] },
  { label: "Reports", href: "/reports", icon: BarChart3, roles: ["admin", "ops_manager", "broker_lead"] },
  { label: "Audit Trail", href: "/audit", icon: ScrollText, roles: ["admin", "broker_lead"] },
  { label: "Settings", href: "/settings", icon: Settings, roles: ["admin"] },
];

export function Sidebar({ user }: { user: UserWithTenant }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleItems = navItems.filter((item) =>
    item.roles.includes(user.role)
  );

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-slate-200 px-4">
        <span className="text-lg font-semibold text-slate-900">BizOS</span>
      </div>
      {user.tenant && (
        <div className="border-b border-slate-200 px-4 py-2">
          <p className="text-xs text-slate-500">{user.tenant.name}</p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-3">
        {visibleItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-slate-200 text-slate-900"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      <div className="border-t border-slate-200 p-4">
        <div className="mb-2">
          <p className="text-sm font-medium text-slate-900">{user.full_name}</p>
          <Badge variant="secondary" className="mt-1 text-xs">
            {user.role.replace("_", " ")}
          </Badge>
        </div>
        <LogoutButton />
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-3 z-50 md:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden h-screen w-64 flex-col border-r border-slate-200 bg-white md:flex">
        {sidebarContent}
      </aside>
    </>
  );
}
