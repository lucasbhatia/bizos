"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Power, PowerOff } from "lucide-react";

interface PluginInfo {
  id: string;
  name: string;
  description: string;
  version: string;
  requiredTools: string[];
  enabled: boolean;
  loaded: boolean;
  createdAt: string;
}

export default function PluginsPage() {
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form state
  const [formId, setFormId] = useState("");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formVersion, setFormVersion] = useState("1.0.0");
  const [formTools, setFormTools] = useState("");

  const fetchPlugins = useCallback(async () => {
    try {
      const res = await fetch("/api/plugins");
      if (res.ok) {
        const data = await res.json();
        setPlugins(data.plugins ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlugins();
  }, [fetchPlugins]);

  async function handleRegister() {
    setActionLoading("register");
    try {
      const res = await fetch("/api/plugins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register",
          id: formId,
          name: formName,
          description: formDescription,
          version: formVersion,
          requiredTools: formTools
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      if (res.ok) {
        setShowRegister(false);
        setFormId("");
        setFormName("");
        setFormDescription("");
        setFormVersion("1.0.0");
        setFormTools("");
        await fetchPlugins();
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function handleToggle(pluginId: string, enabled: boolean) {
    setActionLoading(pluginId);
    try {
      const res = await fetch("/api/plugins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", id: pluginId, enabled }),
      });
      if (res.ok) {
        await fetchPlugins();
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRemove(pluginId: string) {
    setActionLoading(pluginId);
    try {
      const res = await fetch("/api/plugins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", id: pluginId }),
      });
      if (res.ok) {
        await fetchPlugins();
      }
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">Loading plugins...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Plugin Management
          </h1>
          <p className="text-sm text-slate-500">
            Register, enable, and manage agent plugins
          </p>
        </div>
        <Button onClick={() => setShowRegister(!showRegister)}>
          <Plus className="h-4 w-4 mr-1" />
          Register Plugin
        </Button>
      </div>

      {/* Register form */}
      {showRegister && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Register New Plugin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pluginId">Plugin ID</Label>
                <Input
                  id="pluginId"
                  placeholder="e.g., tariff-lookup"
                  value={formId}
                  onChange={(e) => setFormId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pluginName">Name</Label>
                <Input
                  id="pluginName"
                  placeholder="e.g., Tariff Lookup Plugin"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pluginDesc">Description</Label>
              <Textarea
                id="pluginDesc"
                placeholder="What does this plugin do?"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pluginVersion">Version</Label>
                <Input
                  id="pluginVersion"
                  value={formVersion}
                  onChange={(e) => setFormVersion(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pluginTools">Required Tools (comma-separated)</Label>
                <Input
                  id="pluginTools"
                  placeholder="e.g., supabase, llm"
                  value={formTools}
                  onChange={(e) => setFormTools(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleRegister}
                disabled={
                  !formId ||
                  !formName ||
                  !formDescription ||
                  actionLoading === "register"
                }
              >
                Register
              </Button>
              <Button variant="ghost" onClick={() => setShowRegister(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">
              Total Plugins
            </p>
            <p className="text-3xl font-bold text-slate-900">
              {plugins.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Enabled</p>
            <p className="text-3xl font-bold text-green-600">
              {plugins.filter((p) => p.enabled).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Loaded</p>
            <p className="text-3xl font-bold text-blue-600">
              {plugins.filter((p) => p.loaded).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Plugins table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registered Plugins</CardTitle>
        </CardHeader>
        <CardContent>
          {plugins.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tools</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plugins.map((plugin) => (
                  <TableRow key={plugin.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{plugin.name}</p>
                        <p className="text-xs text-slate-500 max-w-[200px] truncate">
                          {plugin.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {plugin.id}
                    </TableCell>
                    <TableCell>{plugin.version}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Badge
                          className={
                            plugin.enabled
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }
                        >
                          {plugin.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                        {plugin.loaded && (
                          <Badge className="bg-blue-100 text-blue-800">
                            Loaded
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {plugin.requiredTools.length > 0
                        ? plugin.requiredTools.join(", ")
                        : "None"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            handleToggle(plugin.id, !plugin.enabled)
                          }
                          disabled={actionLoading === plugin.id}
                        >
                          {plugin.enabled ? (
                            <PowerOff className="h-4 w-4 text-orange-600" />
                          ) : (
                            <Power className="h-4 w-4 text-green-600" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600"
                          onClick={() => handleRemove(plugin.id)}
                          disabled={actionLoading === plugin.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">
              No plugins registered. Register one to get started.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
