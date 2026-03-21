-- Messages table for client-broker communication
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  entry_case_id uuid REFERENCES entry_cases(id),
  client_account_id uuid NOT NULL REFERENCES client_accounts(id),
  sender_type text NOT NULL CHECK (sender_type IN ('client', 'broker')),
  sender_id text NOT NULL,
  sender_name text NOT NULL,
  body text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS policy for tenant access
CREATE POLICY messages_tenant ON messages FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Indexes
CREATE INDEX idx_messages_client ON messages(client_account_id, created_at DESC);
CREATE INDEX idx_messages_case ON messages(entry_case_id, created_at DESC);
