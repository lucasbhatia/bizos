"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Paintbrush,
  Upload,
  RotateCcw,
  Save,
  LayoutDashboard,
  Briefcase,
  CheckSquare,
  ChevronLeft,
} from "lucide-react";
import Link from "next/link";

interface BrandingSettings {
  primary_color: string;
  secondary_color: string;
  company_name: string;
  logo_url: string;
}

const DEFAULTS: BrandingSettings = {
  primary_color: "#2563EB",
  secondary_color: "#0D9488",
  company_name: "",
  logo_url: "",
};

export default function BrandingPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<BrandingSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchBranding = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/branding");
      if (res.status === 403) {
        router.push("/dashboard");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch branding");
      const data = (await res.json()) as BrandingSettings;
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void fetchBranding();
  }, [fetchBranding]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/admin/branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error: string };
        throw new Error(body.error);
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setSettings(DEFAULTS);
  }

  function updateField<K extends keyof BrandingSettings>(
    key: K,
    value: BrandingSettings[K]
  ) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-slate-500">Loading branding settings...</p>
      </div>
    );
  }

  const displayName = settings.company_name || "BizOS";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-2"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Admin
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">
          Brand Customization
        </h1>
        <p className="text-sm text-slate-500">
          Customize your tenant&apos;s look and feel with your own branding.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Settings Form */}
        <div className="space-y-6">
          {/* Colors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Paintbrush className="h-4 w-4 text-slate-500" />
                Brand Colors
              </CardTitle>
              <CardDescription>
                Choose your primary and secondary brand colors.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="primary-color">Primary Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    id="primary-color"
                    type="color"
                    value={settings.primary_color}
                    onChange={(e) =>
                      updateField("primary_color", e.target.value)
                    }
                    className="h-10 w-14 cursor-pointer rounded border border-slate-200 p-1"
                  />
                  <Input
                    value={settings.primary_color}
                    onChange={(e) =>
                      updateField("primary_color", e.target.value)
                    }
                    placeholder="#2563EB"
                    className="w-32 font-mono text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondary-color">Secondary Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    id="secondary-color"
                    type="color"
                    value={settings.secondary_color}
                    onChange={(e) =>
                      updateField("secondary_color", e.target.value)
                    }
                    className="h-10 w-14 cursor-pointer rounded border border-slate-200 p-1"
                  />
                  <Input
                    value={settings.secondary_color}
                    onChange={(e) =>
                      updateField("secondary_color", e.target.value)
                    }
                    placeholder="#0D9488"
                    className="w-32 font-mono text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Upload className="h-4 w-4 text-slate-500" />
                Company Identity
              </CardTitle>
              <CardDescription>
                Set your company name and logo for the sidebar and portal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  value={settings.company_name}
                  onChange={(e) =>
                    updateField("company_name", e.target.value)
                  }
                  placeholder="Your Company Name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logo-url">Logo URL</Label>
                <Input
                  id="logo-url"
                  value={settings.logo_url}
                  onChange={(e) => updateField("logo_url", e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
                <p className="text-xs text-slate-400">
                  Paste a URL to your company logo. Recommended: 200x40px PNG
                  with transparent background.
                </p>
              </div>
              {settings.logo_url && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500 mb-2">Logo Preview</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={settings.logo_url}
                    alt="Company logo preview"
                    className="h-10 max-w-[200px] object-contain"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Branding"}
            </Button>
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset to Default
            </Button>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm text-green-600 bg-green-50 rounded-lg px-4 py-2">
              Branding saved successfully.
            </p>
          )}
        </div>

        {/* Live Preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Live Preview</CardTitle>
              <CardDescription>
                See how your branding looks in the sidebar and client portal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Mini sidebar preview */}
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">
                  Sidebar
                </p>
                <div
                  className="rounded-lg overflow-hidden shadow-md w-56"
                  style={{ backgroundColor: settings.primary_color }}
                >
                  {/* Logo area */}
                  <div className="px-4 py-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      {settings.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={settings.logo_url}
                          alt="Logo"
                          className="h-6 max-w-[120px] object-contain brightness-0 invert"
                        />
                      ) : (
                        <span className="text-sm font-bold text-white">
                          {displayName}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Nav items */}
                  <div className="p-2 space-y-0.5">
                    {[
                      { icon: LayoutDashboard, label: "Dashboard", active: true },
                      { icon: Briefcase, label: "Cases", active: false },
                      { icon: CheckSquare, label: "Tasks", active: false },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.label}
                          className="flex items-center gap-2 rounded-md px-3 py-2 text-xs"
                          style={{
                            backgroundColor: item.active
                              ? "rgba(255,255,255,0.15)"
                              : "transparent",
                            color: item.active
                              ? "#ffffff"
                              : "rgba(255,255,255,0.65)",
                          }}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {item.label}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Mini portal card preview */}
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">
                  Client Portal Card
                </p>
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm w-72">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="h-8 w-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: settings.primary_color }}
                    >
                      <Briefcase className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Case #2024-0042
                      </p>
                      <p className="text-xs text-slate-500">
                        Ocean Import - FCL
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                      style={{
                        backgroundColor: settings.secondary_color,
                      }}
                    >
                      In Progress
                    </span>
                    <span className="text-xs text-slate-400">
                      ETA: Mar 25
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end">
                    <span
                      className="text-xs font-medium cursor-default"
                      style={{ color: settings.primary_color }}
                    >
                      View Details &rarr;
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
