-- Step 37: Institutional Memory — Patterns table
CREATE TABLE patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  category text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}',
  source_case_id uuid REFERENCES entry_cases(id),
  created_by text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY patterns_tenant ON patterns
  FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE INDEX idx_patterns_category ON patterns(tenant_id, category);
CREATE INDEX idx_patterns_search ON patterns USING gin(to_tsvector('english', title || ' ' || content));
