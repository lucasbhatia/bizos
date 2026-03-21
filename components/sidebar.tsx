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
  Inbox,
  Shield,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { UserWithTenant, UserRole } from "@/lib/types/database";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ---------------------------------------------------------------------------
// Nav configuration
// ---------------------------------------------------------------------------

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
  /** Optional badge count -- wired up later via props/context */
  badge?: number;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "broker_lead", "ops_manager", "specialist", "finance", "viewer"] },
  { label: "Intake", href: "/intake", icon: Inbox, roles: ["admin", "broker_lead", "ops_manager", "specialist"] },
  { label: "Cases", href: "/cases", icon: Briefcase, roles: ["admin", "broker_lead", "ops_manager", "specialist", "finance"] },
  { label: "Documents", href: "/documents", icon: FileText, roles: ["admin", "broker_lead", "ops_manager", "specialist", "finance"] },
  { label: "Tasks", href: "/tasks", icon: CheckSquare, roles: ["admin", "broker_lead", "ops_manager", "specialist", "finance"] },
  { label: "Clients", href: "/clients", icon: Users, roles: ["admin", "ops_manager", "broker_lead"] },
  { label: "Finance", href: "/finance", icon: DollarSign, roles: ["admin", "finance"] },
  { label: "Reports", href: "/reports", icon: BarChart3, roles: ["admin", "ops_manager", "broker_lead"] },
  { label: "Audit Trail", href: "/audit", icon: ScrollText, roles: ["admin", "broker_lead"] },
  { label: "Admin", href: "/admin", icon: Shield, roles: ["admin"] },
  { label: "Settings", href: "/settings", icon: Settings, roles: ["admin"] },
];

const STORAGE_KEY = "bizos-sidebar-collapsed";

// ---------------------------------------------------------------------------
// Helper: user initials
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Sidebar({ user }: { user: UserWithTenant }) {
  const pathname = usePathname();
  const router = useRouter();

  // Collapse state -- persisted in localStorage
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Hydrate collapsed state from localStorage after mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "true") setCollapsed(true);
    } catch {
      // SSR or localStorage unavailable -- ignore
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const visibleItems = navItems.filter((item) =>
    item.roles.includes(user.role)
  );

  // Logout handler
  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const roleLabel = user.role.replace(/_/g, " ");

  // ---------------------------------------------------------------------------
  // Shared sidebar inner content (used by both mobile & desktop)
  // ---------------------------------------------------------------------------
  function renderSidebar(isMobile: boolean) {
    const isCollapsed = isMobile ? false : collapsed;

    return (
      <div className="flex h-full flex-col">
        {/* ---- Logo / Branding ---- */}
        <div className="flex h-16 items-center gap-3 border-b border-white/[0.08] px-4">
          {/* Logo mark */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-500/20">
            B
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <span className="text-base font-bold tracking-tight text-white">
                BizOS
              </span>
              <span className="ml-1.5 text-[10px] font-medium uppercase tracking-widest text-blue-400">
                ops
              </span>
            </div>
          )}
        </div>

        {/* Tenant name */}
        {user.tenant && !isCollapsed && (
          <div className="border-b border-white/[0.06] px-4 py-2.5">
            <p className="truncate text-[11px] font-medium uppercase tracking-wider text-slate-500">
              {user.tenant.name}
            </p>
          </div>
        )}

        {/* ---- Navigation ---- */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          {visibleItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;

            const link = (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (isMobile) setMobileOpen(false);
                }}
                className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-white/[0.08] text-white shadow-sm shadow-black/10"
                    : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                } ${isCollapsed ? "justify-center" : ""}`}
              >
                {/* Active indicator -- left border */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-blue-400" />
                )}

                <Icon
                  className={`h-[18px] w-[18px] shrink-0 transition-colors duration-150 ${
                    isActive
                      ? "text-blue-400"
                      : "text-slate-500 group-hover:text-slate-300"
                  }`}
                />

                {!isCollapsed && (
                  <>
                    <span className="truncate">{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white">
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    )}
                  </>
                )}

                {/* Badge dot when collapsed */}
                {isCollapsed && item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[#0F172A]" />
                )}
              </Link>
            );

            // Wrap in tooltip when collapsed
            if (isCollapsed) {
              return (
                <Tooltip key={item.href} delayDuration={0}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent
                    side="right"
                    className="border-slate-700 bg-slate-800 font-medium text-white"
                  >
                    {item.label}
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="ml-1.5 text-red-400">({item.badge})</span>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return link;
          })}
        </nav>

        {/* ---- Bottom section ---- */}
        <div className="border-t border-white/[0.08] p-3">
          {/* User row */}
          <div
            className={`flex items-center gap-3 rounded-lg px-2 py-2 ${
              isCollapsed ? "justify-center" : ""
            }`}
          >
            {/* Avatar */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-xs font-bold text-white shadow-sm">
              {getInitials(user.full_name)}
            </div>

            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {user.full_name}
                </p>
                <span className="inline-block rounded-md bg-white/[0.08] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {roleLabel}
                </span>
              </div>
            )}
          </div>

          {/* Logout */}
          {isCollapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={handleLogout}
                  className="mt-1 flex w-full items-center justify-center rounded-lg px-3 py-2 text-slate-500 transition-all duration-150 hover:bg-white/[0.04] hover:text-slate-300"
                >
                  <LogOut className="h-[18px] w-[18px]" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="border-slate-700 bg-slate-800 font-medium text-white"
              >
                Sign out
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={handleLogout}
              className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-slate-500 transition-all duration-150 hover:bg-white/[0.04] hover:text-slate-300"
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" />
              Sign out
            </button>
          )}

          {/* Collapse toggle (desktop only) */}
          {!isMobile && (
            <>
              {isCollapsed ? (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={toggleCollapsed}
                      className="mt-1 flex w-full items-center justify-center rounded-lg px-3 py-2 text-slate-500 transition-all duration-150 hover:bg-white/[0.04] hover:text-slate-300"
                    >
                      <PanelLeftOpen className="h-[18px] w-[18px]" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    className="border-slate-700 bg-slate-800 font-medium text-white"
                  >
                    Expand sidebar
                  </TooltipContent>
                </Tooltip>
              ) : (
                <button
                  onClick={toggleCollapsed}
                  className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-slate-500 transition-all duration-150 hover:bg-white/[0.04] hover:text-slate-300"
                >
                  <PanelLeftClose className="h-[18px] w-[18px] shrink-0" />
                  Collapse
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <TooltipProvider>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed left-4 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 transition-colors duration-150 hover:bg-slate-100 md:hidden"
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0F172A] shadow-2xl shadow-black/50 transition-transform duration-200 ease-in-out md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {renderSidebar(true)}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={`hidden h-screen flex-col bg-[#0F172A] transition-[width] duration-200 ease-in-out md:flex ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        {renderSidebar(false)}
      </aside>
    </TooltipProvider>
  );
}
