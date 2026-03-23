"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Mail, TrendingUp, Play, X } from "lucide-react";

const STORAGE_KEY = "bizos-welcome-dismissed";

const quickStartCards = [
  {
    title: "Create a Case",
    href: "/cases/new",
    icon: Plus,
    color: "blue",
    bgColor: "bg-blue-100",
    iconColor: "text-blue-600",
    hoverBorder: "hover:border-blue-300",
  },
  {
    title: "Try AI Intake",
    href: "/intake",
    icon: Mail,
    color: "violet",
    bgColor: "bg-violet-100",
    iconColor: "text-violet-600",
    hoverBorder: "hover:border-violet-300",
  },
  {
    title: "Run Ops Check",
    href: "#ops-check",
    icon: TrendingUp,
    color: "emerald",
    bgColor: "bg-emerald-100",
    iconColor: "text-emerald-600",
    hoverBorder: "hover:border-emerald-300",
    description: "Use the Ops Check button below to run an AI health check",
  },
  {
    title: "View Live Demo",
    href: "/demo",
    icon: Play,
    color: "amber",
    bgColor: "bg-amber-100",
    iconColor: "text-amber-600",
    hoverBorder: "hover:border-amber-300",
  },
] as const;

export function WelcomeBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== "true") {
      setDismissed(false);
    }
  }, []);

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, "true");
    setDismissed(true);
  }

  if (dismissed) return null;

  return (
    <div className="relative rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <button
        onClick={handleDismiss}
        className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        aria-label="Dismiss welcome banner"
      >
        <X className="h-4 w-4" />
      </button>

      <h2 className="text-lg font-bold tracking-tight text-slate-900">
        Welcome to BizOS
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Get started with these quick actions to set up your customs brokerage workflow.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {quickStartCards.map((card) => {
          const Icon = card.icon;
          const isAnchor = card.href.startsWith("#");

          const content = (
            <div
              className={`flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 transition-all duration-150 ${card.hoverBorder} hover:shadow-sm cursor-pointer`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${card.bgColor}`}
              >
                <Icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  {card.title}
                </p>
                {"description" in card && card.description && (
                  <p className="mt-0.5 text-xs text-slate-400 line-clamp-2">
                    {card.description}
                  </p>
                )}
              </div>
            </div>
          );

          if (isAnchor) {
            return <div key={card.title}>{content}</div>;
          }

          return (
            <Link key={card.title} href={card.href}>
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
