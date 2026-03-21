"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  MessageSquare,
  Menu,
  X,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/logout-button";

interface PortalNavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const portalNavItems: PortalNavItem[] = [
  { label: "Dashboard", href: "/portal", icon: LayoutDashboard },
  { label: "My Cases", href: "/portal/cases", icon: Briefcase },
  { label: "Documents", href: "/portal/documents", icon: FileText },
  { label: "Messages", href: "/portal/messages", icon: MessageSquare },
];

interface PortalSidebarProps {
  contactName: string;
  companyName: string;
}

export function PortalSidebar({ contactName, companyName }: PortalSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <>
      {/* Branding */}
      <div className="flex h-14 items-center border-b border-slate-200 px-4">
        <span className="text-lg font-semibold text-slate-900">
          BizOS Client Portal
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-3">
        {portalNavItems.map((item) => {
          const isActive =
            item.href === "/portal"
              ? pathname === "/portal"
              : pathname.startsWith(item.href);
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
          <p className="text-sm font-medium text-slate-900">{contactName}</p>
          <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <Building2 className="h-3 w-3" />
            {companyName}
          </div>
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
