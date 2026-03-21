"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Ship,
  FileText,
  MessageSquare,
  Menu,
  X,
  Phone,
  Mail,
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
  { label: "My Shipments", href: "/portal/cases", icon: Ship },
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
      {/* Company branding — white-label ready */}
      <div className="flex h-16 items-center border-b border-slate-100 px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
            {companyName.charAt(0)}
          </div>
          <span className="text-sm font-semibold text-slate-800 tracking-tight">
            {companyName}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wider text-slate-400">
          Menu
        </p>
        <div className="space-y-0.5">
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
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-slate-100 text-slate-900 shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                }`}
              >
                <Icon className={`h-[18px] w-[18px] ${isActive ? "text-slate-700" : ""}`} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Contact info */}
      <div className="border-t border-slate-100 px-4 py-3">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-400">
          Need Help?
        </p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Phone className="h-3 w-3" />
            <span>(555) 123-4567</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Mail className="h-3 w-3" />
            <span>support@broker.com</span>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="border-t border-slate-100 p-4">
        <div className="mb-2">
          <p className="text-sm font-medium text-slate-800">{contactName}</p>
          <p className="text-xs text-slate-400">Client Portal</p>
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
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-white shadow-lg transition-transform md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden h-screen w-64 flex-col border-r border-slate-100 bg-white md:flex">
        {sidebarContent}
      </aside>
    </>
  );
}
