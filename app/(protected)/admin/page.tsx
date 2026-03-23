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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Building2,
  Users,
  Briefcase,
  Bot,
  Plus,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

interface TenantStats {
  id: string;
  name: string;
  slug: string;
  user_count: number;
  case_count: number;
  created_at: string;
}

interface CrossTenantAnalytics {
  total_users: number;
  total_cases: number;
  total_agent_invocations: number;
}

interface AdminData {
  tenants: TenantStats[];
  analytics: CrossTenantAnalytics;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [newTenantName, setNewTenantName] = useState("");
  const [newTenantSlug, setNewTenantSlug] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/tenants");
      if (res.status === 403) {
        router.push("/dashboard");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch admin data");
      const json = (await res.json()) as AdminData;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  async function handleCreateTenant() {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTenantName,
          slug: newTenantSlug,
          adminEmail,
          adminName,
          adminPassword,
        }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error: string };
        throw new Error(body.error);
      }
      setDialogOpen(false);
      setNewTenantName("");
      setNewTenantSlug("");
      setAdminEmail("");
      setAdminName("");
      setAdminPassword("");
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-slate-500">Loading admin dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
          <ShieldCheck className="h-5 w-5 text-red-500" />
        </div>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const { tenants, analytics } = data;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
            <ShieldCheck className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Admin Dashboard
            </h1>
            <p className="text-sm text-slate-500">
              Super-admin view across all tenants
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              New Tenant
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Tenant</DialogTitle>
              <DialogDescription>
                Set up a new brokerage tenant with an initial admin user.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="tenant-name">Tenant Name</Label>
                <Input
                  id="tenant-name"
                  className="h-10 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={newTenantName}
                  onChange={(e) => setNewTenantName(e.target.value)}
                  placeholder="Acme Brokerage"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenant-slug">Slug</Label>
                <Input
                  id="tenant-slug"
                  className="h-10 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={newTenantSlug}
                  onChange={(e) => setNewTenantSlug(e.target.value)}
                  placeholder="acme-brokerage"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-name">Admin Full Name</Label>
                <Input
                  id="admin-name"
                  className="h-10 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Jane Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-email">Admin Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  className="h-10 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@acme.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password">Admin Password</Label>
                <Input
                  id="admin-password"
                  type="password"
                  className="h-10 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Min 8 characters"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleCreateTenant}
                disabled={
                  creating ||
                  !newTenantName ||
                  !newTenantSlug ||
                  !adminEmail ||
                  !adminPassword
                }
              >
                {creating ? "Creating..." : "Create Tenant"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cross-tenant analytics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-xl bg-white shadow-sm border border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Total Tenants
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
              <Building2 className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <p className="text-3xl font-bold text-slate-900">{tenants.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl bg-white shadow-sm border border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Users</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
              <Users className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <p className="text-3xl font-bold text-slate-900">{analytics.total_users}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl bg-white shadow-sm border border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Cases</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
              <Briefcase className="h-4 w-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <p className="text-3xl font-bold text-slate-900">{analytics.total_cases}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl bg-white shadow-sm border border-l-4 border-l-violet-500">
          <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Agent Invocations
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50">
              <Bot className="h-4 w-4 text-violet-500" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <p className="text-3xl font-bold text-slate-900">
              {analytics.total_agent_invocations}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tenant list */}
      <Card className="rounded-xl bg-white shadow-sm border overflow-hidden">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base font-semibold text-slate-800">All Tenants</CardTitle>
          <CardDescription>
            Manage tenants across the platform
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-right">Users</TableHead>
                <TableHead className="text-right">Cases</TableHead>
                <TableHead>Created</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-12"
                  >
                    <div className="flex flex-col items-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 mb-3">
                        <Building2 className="h-5 w-5 text-slate-400" />
                      </div>
                      <p className="text-sm text-slate-500">No tenants found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                tenants.map((tenant, idx) => (
                  <TableRow key={tenant.id} className={`hover:bg-blue-50/30 ${idx % 2 === 1 ? "bg-slate-50/50" : ""}`}>
                    <TableCell className="font-medium text-slate-800">
                      {tenant.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="rounded-full font-mono text-xs">{tenant.slug}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {tenant.user_count}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {tenant.case_count}
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {new Date(tenant.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-blue-50"
                        onClick={() =>
                          router.push(`/admin/playbook?tenant=${tenant.id}`)
                        }
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
