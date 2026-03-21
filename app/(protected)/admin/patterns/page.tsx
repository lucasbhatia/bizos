"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Trash2 } from "lucide-react";

interface Pattern {
  id: string;
  tenant_id: string;
  category: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  source_case_id: string | null;
  created_by: string | null;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  classification_precedent: "Classification Precedent",
  client_preference: "Client Preference",
  compliance_note: "Compliance Note",
  procedure: "Procedure",
};

const CATEGORY_COLORS: Record<string, string> = {
  classification_precedent: "bg-purple-100 text-purple-800",
  client_preference: "bg-blue-100 text-blue-800",
  compliance_note: "bg-red-100 text-red-800",
  procedure: "bg-green-100 text-green-800",
};

export default function PatternsPage() {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form state
  const [formCategory, setFormCategory] = useState("classification_precedent");
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");

  const fetchPatterns = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (filterCategory !== "all") params.set("category", filterCategory);

      const res = await fetch(`/api/patterns?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPatterns(data.patterns ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterCategory]);

  useEffect(() => {
    fetchPatterns();
  }, [fetchPatterns]);

  async function handleCreate() {
    setActionLoading("create");
    try {
      const res = await fetch("/api/patterns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: formCategory,
          title: formTitle,
          content: formContent,
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setFormTitle("");
        setFormContent("");
        await fetchPatterns();
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(patternId: string) {
    setActionLoading(patternId);
    try {
      const res = await fetch("/api/patterns", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patternId }),
      });
      if (res.ok) {
        await fetchPatterns();
      }
    } finally {
      setActionLoading(null);
    }
  }

  function handleSearch() {
    setLoading(true);
    fetchPatterns();
  }

  if (loading && patterns.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">Loading patterns...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Institutional Memory
          </h1>
          <p className="text-sm text-slate-500">
            Manage patterns, precedents, and procedures for agent learning
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Pattern
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add New Pattern</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="patternTitle">Title</Label>
                <Input
                  id="patternTitle"
                  placeholder="Brief description of the pattern"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="patternContent">Content</Label>
              <Textarea
                id="patternContent"
                placeholder="Detailed description of the pattern, precedent, or procedure..."
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCreate}
                disabled={
                  !formTitle || !formContent || actionLoading === "create"
                }
              >
                Save Pattern
              </Button>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search patterns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleSearch}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Patterns list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Patterns ({patterns.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {patterns.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {patterns.map((pattern) => (
                  <TableRow key={pattern.id}>
                    <TableCell>
                      <Badge
                        className={
                          CATEGORY_COLORS[pattern.category] ??
                          "bg-gray-100 text-gray-800"
                        }
                      >
                        {CATEGORY_LABELS[pattern.category] ?? pattern.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {pattern.title}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600 max-w-[300px] truncate">
                      {pattern.content}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {new Date(pattern.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600"
                        onClick={() => handleDelete(pattern.id)}
                        disabled={actionLoading === pattern.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">
              No patterns found. Add one to get started.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
