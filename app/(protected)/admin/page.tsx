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
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const { tenants, analytics } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Admin Dashboard
          </h1>
          <p className="text-sm text-slate-500">
            Super-admin view across all tenants
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
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
                  value={newTenantName}
                  onChange={(e) => setNewTenantName(e.target.value)}
                  placeholder="Acme Brokerage"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenant-slug">Slug</Label>
                <Input
                  id="tenant-slug"
                  value={newTenantSlug}
                  onChange={(e) => setNewTenantSlug(e.target.value)}
                  placeholder="acme-brokerage"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-name">Admin Full Name</Label>
                <Input
                  id="admin-name"
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Tenants
            </CardTitle>
            <Building2 className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{tenants.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{analytics.total_users}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Cases</CardTitle>
            <Briefcase className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{analytics.total_cases}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Agent Invocations
            </CardTitle>
            <Bot className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {analytics.total_agent_invocations}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tenant list */}
      <Card>
        <CardHeader>
          <CardTitle>All Tenants</CardTitle>
          <CardDescription>
            Manage tenants across the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
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
                    className="text-center text-slate-500"
                  >
                    No tenants found
                  </TableCell>
                </TableRow>
              ) : (
                tenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">
                      {tenant.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{tenant.slug}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {tenant.user_count}
                    </TableCell>
                    <TableCell className="text-right">
                      {tenant.case_count}
                    </TableCell>
                    <TableCell>
                      {new Date(tenant.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
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
