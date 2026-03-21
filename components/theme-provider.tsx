"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

// ============================================================================
// Types
// ============================================================================

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

// ============================================================================
// Default CSS custom properties for the BizOS palette
// ============================================================================

const DEFAULT_THEME_VARS: Record<string, string> = {
  "--bizos-navy": "15 23 42",           // #0F172A
  "--bizos-navy-light": "30 41 59",     // #1E293B
  "--bizos-accent-blue": "37 99 235",   // #2563EB
  "--bizos-teal": "13 148 136",         // #0D9488
};

// ============================================================================
// Context
// ============================================================================

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

interface ThemeProviderProps {
  children: React.ReactNode;
  /** Optional tenant settings that can override default theme vars */
  tenantSettings?: Record<string, string>;
  /** Default theme when nothing is stored */
  defaultTheme?: Theme;
}

export function ThemeProvider({
  children,
  tenantSettings,
  defaultTheme = "light",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);

  // On mount, read persisted preference
  useEffect(() => {
    const stored = localStorage.getItem("bizos-theme") as Theme | null;
    if (stored === "light" || stored === "dark") {
      setThemeState(stored);
    }
  }, []);

  // Apply theme class + CSS custom properties whenever theme or tenant settings change
  useEffect(() => {
    const root = document.documentElement;

    // Toggle dark class (shadcn/ui uses this)
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // Set data-theme for additional selectors
    root.setAttribute("data-theme", theme);

    // Apply default CSS custom properties
    for (const [key, value] of Object.entries(DEFAULT_THEME_VARS)) {
      root.style.setProperty(key, value);
    }

    // Overlay tenant-specific overrides if present
    if (tenantSettings) {
      for (const [key, value] of Object.entries(tenantSettings)) {
        root.style.setProperty(key, value);
      }
    }
  }, [theme, tenantSettings]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    localStorage.setItem("bizos-theme", next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
