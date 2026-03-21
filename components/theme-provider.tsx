"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

// ============================================================================
// Types
// ============================================================================

type Theme = "light" | "dark";

interface BrandingSettings {
  primary_color?: string;
  secondary_color?: string;
  company_name?: string;
  logo_url?: string;
}

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  branding: BrandingSettings;
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

const DEFAULT_BRANDING: BrandingSettings = {
  primary_color: "#2563EB",
  secondary_color: "#0D9488",
  company_name: "",
  logo_url: "",
};

// ============================================================================
// Helpers
// ============================================================================

/** Convert a hex color like "#2563EB" to "37 99 235" (space-separated RGB). */
function hexToRgbString(hex: string): string | null {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!match) return null;
  const num = parseInt(match[1], 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `${r} ${g} ${b}`;
}

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
  /** Tenant branding loaded from DB */
  tenantBranding?: BrandingSettings;
  /** Default theme when nothing is stored */
  defaultTheme?: Theme;
}

export function ThemeProvider({
  children,
  tenantSettings,
  tenantBranding,
  defaultTheme = "light",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [branding, setBranding] = useState<BrandingSettings>(
    tenantBranding ?? DEFAULT_BRANDING
  );

  // On mount, read persisted preference
  useEffect(() => {
    const stored = localStorage.getItem("bizos-theme") as Theme | null;
    if (stored === "light" || stored === "dark") {
      setThemeState(stored);
    }
  }, []);

  // Sync branding when tenantBranding prop changes
  useEffect(() => {
    if (tenantBranding) {
      setBranding(tenantBranding);
    }
  }, [tenantBranding]);

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

    // Apply brand colors as CSS custom properties
    if (branding.primary_color) {
      const rgb = hexToRgbString(branding.primary_color);
      if (rgb) {
        root.style.setProperty("--bizos-brand-primary", rgb);
        root.style.setProperty("--bizos-brand-primary-hex", branding.primary_color);
      }
    }
    if (branding.secondary_color) {
      const rgb = hexToRgbString(branding.secondary_color);
      if (rgb) {
        root.style.setProperty("--bizos-brand-secondary", rgb);
        root.style.setProperty("--bizos-brand-secondary-hex", branding.secondary_color);
      }
    }

    // Overlay tenant-specific overrides if present
    if (tenantSettings) {
      for (const [key, value] of Object.entries(tenantSettings)) {
        root.style.setProperty(key, value);
      }
    }
  }, [theme, tenantSettings, branding]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    localStorage.setItem("bizos-theme", next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, branding }}>
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
