"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  addToast: (message: string, variant?: ToastVariant) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

// ---------------------------------------------------------------------------
// Variant config
// ---------------------------------------------------------------------------

const VARIANT_STYLES: Record<
  ToastVariant,
  { bg: string; border: string; icon: React.ElementType; iconColor: string }
> = {
  success: {
    bg: "bg-green-50",
    border: "border-green-200",
    icon: CheckCircle2,
    iconColor: "text-green-600",
  },
  error: {
    bg: "bg-red-50",
    border: "border-red-200",
    icon: AlertCircle,
    iconColor: "text-red-600",
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: Info,
    iconColor: "text-blue-600",
  },
};

const AUTO_DISMISS_MS = 5000;

// ---------------------------------------------------------------------------
// Single toast
// ---------------------------------------------------------------------------

function ToastCard({
  item,
  onClose,
}: {
  item: ToastItem;
  onClose: (id: string) => void;
}) {
  const [exiting, setExiting] = useState(false);
  const config = VARIANT_STYLES[item.variant];
  const Icon = config.icon;

  useEffect(() => {
    const timeout = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onClose(item.id), 300);
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(timeout);
  }, [item.id, onClose]);

  function handleClose() {
    setExiting(true);
    setTimeout(() => onClose(item.id), 300);
  }

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur transition-all duration-300 ${config.bg} ${config.border} ${
        exiting
          ? "translate-x-full opacity-0"
          : "translate-x-0 opacity-100 animate-in slide-in-from-right-full"
      }`}
    >
      <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${config.iconColor}`} />
      <p className="flex-1 text-sm font-medium text-slate-800">
        {item.message}
      </p>
      <button
        onClick={handleClose}
        className="rounded p-0.5 text-slate-400 transition-colors hover:text-slate-600"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = `toast-${++nextId}`;
      setToasts((prev) => [...prev, { id, message, variant }]);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast container — top right */}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastCard item={t} onClose={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
