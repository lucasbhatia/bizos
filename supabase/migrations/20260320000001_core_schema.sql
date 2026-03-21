-- BizOS Core Database Schema v1
-- Multi-tenant customs brokerage operating system
-- All tables require tenant_id with RLS enforced
--
-- Structure: 1) Enums, 2) Functions, 3) All Tables, 4) All RLS Policies

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE user_role AS ENUM (
  'admin', 'broker_lead', 'ops_manager', 'specialist', 'finance', 'viewer'
);

CREATE TYPE transport_mode AS ENUM ('ocean', 'air', 'truck', 'rail');

CREATE TYPE case_status AS ENUM (
  'intake', 'awaiting_docs', 'docs_validated', 'classification_review',
  'entry_prep', 'submitted', 'govt_review', 'hold', 'released',
  'billing', 'closed', 'archived'
);

CREATE TYPE task_type AS ENUM (
  'review', 'approval', 'data_entry', 'client_request',
  'escalation', 'filing_prep', 'other'
);

CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

CREATE TYPE priority_level AS ENUM ('low', 'normal', 'high', 'urgent');

CREATE TYPE doc_type AS ENUM (
  'commercial_invoice', 'packing_list', 'bill_of_lading',
  'airway_bill', 'arrival_notice', 'poa', 'certificate_of_origin',
  'isf_data', 'other'
);

CREATE TYPE parse_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TYPE actor_type AS ENUM ('user', 'agent', 'system');

CREATE TYPE human_decision AS ENUM ('pending', 'accepted', 'rejected', 'modified');

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TABLES (created in FK-dependency order, NO policies yet)
-- ============================================================================

-- TABLE 1: tenants
CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  timezone text NOT NULL DEFAULT 'America/New_York',
  data_region text NOT NULL DEFAULT 'us',
  settings jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- TABLE 2: users
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  role user_role NOT NULL DEFAULT 'viewer',
  is_licensed_broker boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- TABLE 3: business_units
CREATE TABLE business_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  location text,
  port_code text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_business_units_tenant ON business_units(tenant_id);

CREATE TRIGGER business_units_updated_at
  BEFORE UPDATE ON business_units
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- TABLE 4: client_accounts
CREATE TABLE client_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  importer_of_record_number text,
  default_commodity_profile jsonb NOT NULL DEFAULT '{}',
  billing_terms jsonb NOT NULL DEFAULT '{}',
  sop_notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_accounts_tenant ON client_accounts(tenant_id);

CREATE TRIGGER client_accounts_updated_at
  BEFORE UPDATE ON client_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- TABLE 5: contacts
CREATE TABLE contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_account_id uuid NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  role text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contacts_tenant ON contacts(tenant_id);
CREATE INDEX idx_contacts_client ON contacts(client_account_id);

CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- TABLE 6: entry_cases
CREATE TABLE entry_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_account_id uuid NOT NULL REFERENCES client_accounts(id),
  business_unit_id uuid REFERENCES business_units(id),
  assigned_user_id uuid REFERENCES users(id),
  case_number text NOT NULL,
  mode_of_transport transport_mode NOT NULL,
  status case_status NOT NULL DEFAULT 'intake',
  eta timestamptz,
  actual_arrival timestamptz,
  risk_score float,
  priority priority_level NOT NULL DEFAULT 'normal',
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, case_number)
);

CREATE INDEX idx_entry_cases_tenant ON entry_cases(tenant_id);
CREATE INDEX idx_entry_cases_status ON entry_cases(status);
CREATE INDEX idx_entry_cases_client ON entry_cases(client_account_id);
CREATE INDEX idx_entry_cases_assigned ON entry_cases(assigned_user_id);
CREATE INDEX idx_entry_cases_priority ON entry_cases(priority);

CREATE TRIGGER entry_cases_updated_at
  BEFORE UPDATE ON entry_cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Case number auto-generation
CREATE SEQUENCE case_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_case_number(p_tenant_id uuid)
RETURNS text AS $$
DECLARE
  v_slug text;
  v_year text;
  v_seq int;
BEGIN
  SELECT slug INTO v_slug FROM tenants WHERE id = p_tenant_id;
  v_year := to_char(now(), 'YYYY');
  v_seq := nextval('case_number_seq');
  RETURN v_slug || '-' || v_year || '-' || lpad(v_seq::text, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- TABLE 7: workflow_events (append-only)
CREATE TABLE workflow_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entry_case_id uuid NOT NULL REFERENCES entry_cases(id) ON DELETE CASCADE,
  from_status case_status,
  to_status case_status NOT NULL,
  triggered_by_user_id uuid REFERENCES users(id),
  triggered_by_agent text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_events_tenant ON workflow_events(tenant_id);
CREATE INDEX idx_workflow_events_case ON workflow_events(entry_case_id);

-- TABLE 8: tasks
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entry_case_id uuid REFERENCES entry_cases(id) ON DELETE SET NULL,
  assigned_user_id uuid REFERENCES users(id),
  title text NOT NULL,
  description text,
  task_type task_type NOT NULL DEFAULT 'other',
  status task_status NOT NULL DEFAULT 'pending',
  priority priority_level NOT NULL DEFAULT 'normal',
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_tenant ON tasks(tenant_id);
CREATE INDEX idx_tasks_status_assigned ON tasks(status, assigned_user_id);
CREATE INDEX idx_tasks_case ON tasks(entry_case_id);

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- TABLE 9: documents
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entry_case_id uuid NOT NULL REFERENCES entry_cases(id) ON DELETE CASCADE,
  uploaded_by_user_id uuid REFERENCES users(id),
  doc_type doc_type NOT NULL,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  file_hash text,
  file_size_bytes bigint,
  version integer NOT NULL DEFAULT 1,
  parse_status parse_status NOT NULL DEFAULT 'pending',
  extracted_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_tenant ON documents(tenant_id);
CREATE INDEX idx_documents_case ON documents(entry_case_id);

-- TABLE 10: audit_events (append-only)
CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  actor_type actor_type NOT NULL,
  actor_id text NOT NULL,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_events_tenant ON audit_events(tenant_id);
CREATE INDEX idx_audit_events_entity ON audit_events(entity_type, entity_id);
CREATE INDEX idx_audit_events_created ON audit_events(created_at);

-- TABLE 11: ai_action_logs
CREATE TABLE ai_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_type text NOT NULL,
  entry_case_id uuid REFERENCES entry_cases(id) ON DELETE SET NULL,
  action text NOT NULL,
  inputs jsonb NOT NULL DEFAULT '{}',
  outputs jsonb NOT NULL DEFAULT '{}',
  confidence float,
  citations jsonb NOT NULL DEFAULT '[]',
  human_decision human_decision,
  human_decision_by uuid REFERENCES users(id),
  human_decision_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_action_logs_tenant ON ai_action_logs(tenant_id);
CREATE INDEX idx_ai_action_logs_case ON ai_action_logs(entry_case_id);

-- ============================================================================
-- ROW LEVEL SECURITY — all tables, all policies
-- (defined AFTER all tables exist so cross-table references work)
-- ============================================================================

-- tenants
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenants_select ON tenants FOR SELECT
  USING (id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY tenants_update ON tenants FOR UPDATE
  USING (id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select ON users FOR SELECT
  USING (tenant_id IN (SELECT u.tenant_id FROM users AS u WHERE u.id = auth.uid()));

CREATE POLICY users_update ON users FOR UPDATE
  USING (tenant_id IN (SELECT u.tenant_id FROM users AS u WHERE u.id = auth.uid()));

CREATE POLICY users_insert ON users FOR INSERT
  WITH CHECK (true);

-- business_units
ALTER TABLE business_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY business_units_select ON business_units FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY business_units_all ON business_units FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- client_accounts
ALTER TABLE client_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY client_accounts_select ON client_accounts FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY client_accounts_all ON client_accounts FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- contacts
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY contacts_select ON contacts FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY contacts_all ON contacts FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- entry_cases
ALTER TABLE entry_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY entry_cases_select ON entry_cases FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY entry_cases_all ON entry_cases FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- workflow_events
ALTER TABLE workflow_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY workflow_events_select ON workflow_events FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY workflow_events_insert ON workflow_events FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY workflow_events_no_update ON workflow_events FOR UPDATE
  USING (false);

CREATE POLICY workflow_events_no_delete ON workflow_events FOR DELETE
  USING (false);

-- tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY tasks_select ON tasks FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY tasks_all ON tasks FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY documents_select ON documents FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY documents_all ON documents FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- audit_events (append-only)
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_events_select ON audit_events FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY audit_events_insert ON audit_events FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY audit_events_no_update ON audit_events FOR UPDATE
  USING (false);

CREATE POLICY audit_events_no_delete ON audit_events FOR DELETE
  USING (false);

-- ai_action_logs
ALTER TABLE ai_action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_action_logs_select ON ai_action_logs FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY ai_action_logs_all ON ai_action_logs FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));
