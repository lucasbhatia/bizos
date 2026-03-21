"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Plus, Trash2 } from "lucide-react";

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

interface NewInvoiceFormProps {
  clients: { id: string; name: string }[];
  cases: { id: string; case_number: string; client_account_id: string }[];
}

export function NewInvoiceForm({ clients, cases }: NewInvoiceFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clientId, setClientId] = useState("");
  const [caseId, setCaseId] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [taxRate, setTaxRate] = useState(0);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unit_price: 0, amount: 0 },
  ]);

  const filteredCases = cases.filter(
    (c) => !clientId || c.client_account_id === clientId
  );

  function updateLineItem(idx: number, field: keyof LineItem, value: string) {
    setLineItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[idx] };

      if (field === "description") {
        item.description = value;
      } else {
        const numVal = parseFloat(value) || 0;
        if (field === "quantity") {
          item.quantity = numVal;
          item.amount = numVal * item.unit_price;
        } else if (field === "unit_price") {
          item.unit_price = numVal;
          item.amount = item.quantity * numVal;
        } else {
          item.amount = numVal;
        }
      }

      updated[idx] = item;
      return updated;
    });
  }

  function addLineItem() {
    setLineItems((prev) => [
      ...prev,
      { description: "", quantity: 1, unit_price: 0, amount: 0 },
    ]);
  }

  function removeLineItem(idx: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) {
      setError("Please select a client");
      return;
    }
    if (lineItems.length === 0 || lineItems.some((li) => !li.description)) {
      setError("All line items must have a description");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_account_id: clientId,
          entry_case_id: caseId || undefined,
          line_items: lineItems,
          subtotal: Math.round(subtotal * 100) / 100,
          tax: Math.round(tax * 100) / 100,
          total: Math.round(total * 100) / 100,
          payment_terms: paymentTerms || undefined,
          due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create invoice");
        return;
      }

      const data = await res.json();
      router.push(`/finance/${data.invoice.id}`);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Client & Case */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="client">Client *</Label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger id="client">
              <SelectValue placeholder="Select client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="case">Linked Case (optional)</Label>
          <Select value={caseId} onValueChange={setCaseId}>
            <SelectTrigger id="case">
              <SelectValue placeholder="Select case" />
            </SelectTrigger>
            <SelectContent>
              {filteredCases.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.case_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Payment Terms & Due Date */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <Label htmlFor="terms">Payment Terms</Label>
          <Input
            id="terms"
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value)}
            placeholder="e.g. Net 30"
          />
        </div>
        <div>
          <Label htmlFor="due">Due Date</Label>
          <Input
            id="due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="tax">Tax Rate (%)</Label>
          <Input
            id="tax"
            type="number"
            step="0.01"
            min="0"
            value={taxRate}
            onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

      {/* Line Items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label>Line Items</Label>
          <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
            <Plus className="mr-1 h-4 w-4" />
            Add Item
          </Button>
        </div>

        <div className="space-y-3">
          {lineItems.map((item, idx) => (
            <div
              key={idx}
              className="grid grid-cols-12 gap-2 items-end"
            >
              <div className="col-span-5">
                {idx === 0 && (
                  <Label className="text-xs text-slate-500">Description</Label>
                )}
                <Input
                  value={item.description}
                  onChange={(e) =>
                    updateLineItem(idx, "description", e.target.value)
                  }
                  placeholder="Service description"
                />
              </div>
              <div className="col-span-2">
                {idx === 0 && (
                  <Label className="text-xs text-slate-500">Qty</Label>
                )}
                <Input
                  type="number"
                  step="1"
                  min="1"
                  value={item.quantity}
                  onChange={(e) =>
                    updateLineItem(idx, "quantity", e.target.value)
                  }
                />
              </div>
              <div className="col-span-2">
                {idx === 0 && (
                  <Label className="text-xs text-slate-500">Unit Price</Label>
                )}
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.unit_price}
                  onChange={(e) =>
                    updateLineItem(idx, "unit_price", e.target.value)
                  }
                />
              </div>
              <div className="col-span-2">
                {idx === 0 && (
                  <Label className="text-xs text-slate-500">Amount</Label>
                )}
                <Input
                  type="number"
                  step="0.01"
                  value={item.amount.toFixed(2)}
                  readOnly
                  className="bg-slate-50"
                />
              </div>
              <div className="col-span-1">
                {lineItems.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLineItem(idx)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="mt-4 ml-auto w-64 space-y-1 border-t pt-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">
              Tax ({taxRate}%)
            </span>
            <span>{formatCurrency(tax)}</span>
          </div>
          <div className="flex justify-between text-base font-bold border-t pt-2">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes for the invoice..."
          rows={3}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push("/finance")}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Invoice"}
        </Button>
      </div>
    </form>
  );
}
