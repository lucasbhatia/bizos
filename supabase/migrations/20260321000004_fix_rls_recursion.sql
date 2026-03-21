-- =============================================================================
-- Fix RLS infinite recursion bug
-- =============================================================================
-- Problem: The users table RLS policy references the users table itself,
-- causing infinite recursion when any authenticated query runs.
--
-- Solution: Create a SECURITY DEFINER function that bypasses RLS to get
-- the current user's tenant_id, then use it in all RLS policies.
-- =============================================================================

-- 1. Create a helper function that runs with elevated privileges (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM users WHERE id = auth.uid()
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_id() TO anon;

-- =============================================================================
-- 2. Drop ALL existing RLS policies and recreate using public.get_tenant_id()
-- =============================================================================

-- tenants
DROP POLICY IF EXISTS tenants_select ON tenants;
DROP POLICY IF EXISTS tenants_update ON tenants;
CREATE POLICY tenants_select ON tenants FOR SELECT
  USING (id = public.get_tenant_id());
CREATE POLICY tenants_update ON tenants FOR UPDATE
  USING (id = public.get_tenant_id());

-- users (this was the recursive one)
DROP POLICY IF EXISTS users_select ON users;
DROP POLICY IF EXISTS users_update ON users;
DROP POLICY IF EXISTS users_insert ON users;
CREATE POLICY users_select ON users FOR SELECT
  USING (tenant_id = public.get_tenant_id());
CREATE POLICY users_update ON users FOR UPDATE
  USING (tenant_id = public.get_tenant_id());
CREATE POLICY users_insert ON users FOR INSERT
  WITH CHECK (true);

-- business_units
DROP POLICY IF EXISTS business_units_select ON business_units;
DROP POLICY IF EXISTS business_units_all ON business_units;
CREATE POLICY business_units_all ON business_units FOR ALL
  USING (tenant_id = public.get_tenant_id());

-- client_accounts
DROP POLICY IF EXISTS client_accounts_select ON client_accounts;
DROP POLICY IF EXISTS client_accounts_all ON client_accounts;
CREATE POLICY client_accounts_all ON client_accounts FOR ALL
  USING (tenant_id = public.get_tenant_id());

-- contacts
DROP POLICY IF EXISTS contacts_select ON contacts;
DROP POLICY IF EXISTS contacts_all ON contacts;
CREATE POLICY contacts_all ON contacts FOR ALL
  USING (tenant_id = public.get_tenant_id());

-- entry_cases
DROP POLICY IF EXISTS entry_cases_select ON entry_cases;
DROP POLICY IF EXISTS entry_cases_all ON entry_cases;
CREATE POLICY entry_cases_all ON entry_cases FOR ALL
  USING (tenant_id = public.get_tenant_id());

-- workflow_events
DROP POLICY IF EXISTS workflow_events_select ON workflow_events;
DROP POLICY IF EXISTS workflow_events_insert ON workflow_events;
DROP POLICY IF EXISTS workflow_events_no_update ON workflow_events;
DROP POLICY IF EXISTS workflow_events_no_delete ON workflow_events;
CREATE POLICY workflow_events_select ON workflow_events FOR SELECT
  USING (tenant_id = public.get_tenant_id());
CREATE POLICY workflow_events_insert ON workflow_events FOR INSERT
  WITH CHECK (tenant_id = public.get_tenant_id());
CREATE POLICY workflow_events_no_update ON workflow_events FOR UPDATE
  USING (false);
CREATE POLICY workflow_events_no_delete ON workflow_events FOR DELETE
  USING (false);

-- tasks
DROP POLICY IF EXISTS tasks_select ON tasks;
DROP POLICY IF EXISTS tasks_all ON tasks;
CREATE POLICY tasks_all ON tasks FOR ALL
  USING (tenant_id = public.get_tenant_id());

-- documents
DROP POLICY IF EXISTS documents_select ON documents;
DROP POLICY IF EXISTS documents_all ON documents;
CREATE POLICY documents_all ON documents FOR ALL
  USING (tenant_id = public.get_tenant_id());

-- audit_events (append-only: SELECT and INSERT only, no UPDATE/DELETE)
DROP POLICY IF EXISTS audit_events_select ON audit_events;
DROP POLICY IF EXISTS audit_events_insert ON audit_events;
DROP POLICY IF EXISTS audit_events_no_update ON audit_events;
DROP POLICY IF EXISTS audit_events_no_delete ON audit_events;
CREATE POLICY audit_events_select ON audit_events FOR SELECT
  USING (tenant_id = public.get_tenant_id());
CREATE POLICY audit_events_insert ON audit_events FOR INSERT
  WITH CHECK (tenant_id = public.get_tenant_id());
CREATE POLICY audit_events_no_update ON audit_events FOR UPDATE
  USING (false);
CREATE POLICY audit_events_no_delete ON audit_events FOR DELETE
  USING (false);

-- ai_action_logs
DROP POLICY IF EXISTS ai_action_logs_select ON ai_action_logs;
DROP POLICY IF EXISTS ai_action_logs_all ON ai_action_logs;
CREATE POLICY ai_action_logs_all ON ai_action_logs FOR ALL
  USING (tenant_id = public.get_tenant_id());

-- =============================================================================
-- 3. Fix policies on tables from later migrations (if they exist)
-- =============================================================================

-- messages (from migration 20260321000001)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'messages' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS messages_tenant ON messages;
    EXECUTE 'CREATE POLICY messages_tenant ON messages FOR ALL USING (tenant_id = public.get_tenant_id())';
  END IF;
END $$;

-- invoices (from migration 20260321000002)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'invoices' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS invoices_tenant ON invoices;
    EXECUTE 'CREATE POLICY invoices_tenant ON invoices FOR ALL USING (tenant_id = public.get_tenant_id())';
  END IF;
END $$;

-- patterns (from migration 20260321000003)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'patterns' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS patterns_tenant ON patterns;
    EXECUTE 'CREATE POLICY patterns_tenant ON patterns FOR ALL USING (tenant_id = public.get_tenant_id())';
  END IF;
END $$;

-- =============================================================================
-- 4. Add database-level trigger to enforce append-only on audit_events
--    (defense in depth — blocks even service role modifications)
-- =============================================================================

CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only: % operations are not allowed', TG_OP;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_events_no_modify ON audit_events;
CREATE TRIGGER audit_events_no_modify
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_modification();

-- =============================================================================
-- 5. Fix case_number sequence to avoid collisions
--    Reset sequence to max existing value + 1
-- =============================================================================

DO $$
DECLARE
  max_seq integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(case_number FROM '\d+$') AS integer)), 0) + 1
  INTO max_seq
  FROM entry_cases;

  IF max_seq > 0 THEN
    PERFORM setval('case_number_seq', max_seq, false);
  END IF;
END $$;
