-- Step 24: Invoices table
CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  entry_case_id uuid REFERENCES entry_cases(id),
  client_account_id uuid NOT NULL REFERENCES client_accounts(id),
  invoice_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  line_items jsonb NOT NULL DEFAULT '[]',
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  tax numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  payment_terms text,
  due_date timestamptz,
  paid_at timestamptz,
  qbo_invoice_id text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoices_tenant ON invoices
  FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE INDEX idx_invoices_case ON invoices(entry_case_id);
CREATE INDEX idx_invoices_client ON invoices(client_account_id);
CREATE INDEX idx_invoices_status ON invoices(status);
