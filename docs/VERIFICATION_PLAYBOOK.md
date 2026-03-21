# BizOS Verification & Debugging Playbook
## Systematic Code Health Sweep — Every Page, Every Agent, Every Flow
### Run this AFTER completing all 48 build steps

Version 1.0 — March 2026

---

# How This Works

This playbook walks Claude Code through a systematic verification of every feature built in Steps 1–48. It catches runtime errors, broken imports, missing components, bad queries, and integration failures that `npm run build` can't detect.

## The Pattern

1. Claude checks each area methodically
2. Fixes issues as it finds them
3. Commits fixes in logical batches
4. Produces a health report at the end

---

# Phase V1: Build & Lint Clean

## Step V1: Full Build + Lint Sweep

```
Run these checks and fix EVERY error before moving on:

1. Run `npm run build` — fix all TypeScript errors until it passes with zero errors
2. Run `npm run lint` — fix all ESLint warnings and errors
3. Search the entire codebase for:
   - Any `any` types (replace with proper types)
   - Any `// @ts-ignore` or `// @ts-expect-error` (fix the underlying issue)
   - Any `console.log` that shouldn't be in production (keep only intentional debug logs)
   - Any hardcoded localhost URLs or test credentials
   - Any TODO comments that are actually blocking issues
4. Run `npm run test` if tests exist — fix any failures
5. Check that .env.local.example has every env var the app needs
6. Verify .gitignore covers: .env.local, .env, node_modules, .next, .DS_Store

Commit as "fix: clean build — zero TS errors, zero lint warnings"
```

---

# Phase V2: Authentication & Authorization

## Step V2: Auth Flow Verification

```
Test every authentication path and fix what's broken:

1. SIGNUP FLOW:
   - Go to /signup, create a new account
   - Verify the user appears in BOTH auth.users AND public.users tables
   - Verify the user gets assigned to a tenant
   - Verify redirect to /dashboard after signup

2. LOGIN FLOW:
   - Go to /login, log in with seed account admin@acme.com
   - Verify redirect to /dashboard
   - Verify getCurrentUser() returns full profile with role and tenant_id
   - Check the sidebar shows correct nav items for admin role

3. LOGOUT FLOW:
   - Click logout
   - Verify redirect to /login
   - Verify visiting /dashboard redirects back to /login

4. ROLE-BASED ACCESS:
   - Log in as each seed user role (admin, ops_manager, specialist, finance)
   - Verify each role sees only their permitted nav items
   - Verify admin can access /audit but specialist cannot
   - Verify finance can access finance pages but not settings

5. SESSION PERSISTENCE:
   - Log in, close the browser tab, reopen localhost:3000
   - Should still be logged in (session persists)
   - Verify middleware refreshes the session

6. EDGE CASES:
   - Try accessing /dashboard with an expired/invalid session
   - Try accessing API routes without auth headers
   - Verify RLS blocks cross-tenant data access

Fix every issue found. Commit as "fix: auth flow — all paths verified"
```

---

# Phase V3: Dashboard & Navigation

## Step V3: Dashboard Data Accuracy

```
Verify the dashboard shows correct, real data:

1. STATS CARDS:
   - Query the database directly for active case count
   - Compare with what the dashboard shows — must match exactly
   - Do the same for: cases due today, missing docs count, overdue tasks
   - If any number is wrong, fix the query

2. EXCEPTION STACK:
   - Verify stuck cases are calculated correctly (time in current status > SLA)
   - Verify urgent cases appear
   - Verify overdue tasks appear
   - Click an exception row — should navigate to the correct case

3. CASES BY STATUS:
   - Count cases per status in the database
   - Compare with the dashboard chart/counts — must match exactly

4. RECENT ACTIVITY:
   - Verify last 10 audit events are shown
   - Verify timestamps are formatted correctly (not raw ISO strings)
   - Verify actor names show correctly (not just IDs)
   - Verify entity links work

5. RESPONSIVE LAYOUT:
   - Check dashboard at full width, tablet width (768px), and mobile (375px)
   - Nothing should overflow or be cut off
   - Cards should stack on mobile

6. EMPTY STATE:
   - What happens if there are zero cases? Zero tasks? Zero audit events?
   - Should show a helpful empty state, not crash or show blank space

Fix every issue. Commit as "fix: dashboard — data accuracy verified"
```

---

# Phase V4: Cases System

## Step V4: Cases List Page

```
Verify the cases list page works completely:

1. DATA DISPLAY:
   - All seed data cases appear in the table
   - Case number, client, mode, status, priority, ETA, assigned user all show correctly
   - Status badges have correct colors (yellow=awaiting, blue=prep, red=hold, green=released)

2. FILTERS:
   - Test each filter independently: status, priority, client, assigned user, date range
   - Test combining 2-3 filters together
   - Verify filters update URL params
   - Verify refreshing the page preserves filter state
   - Verify clearing filters shows all cases again

3. SORTING:
   - Click each column header — should toggle asc/desc
   - Verify sort actually works (not just visual indicator change)
   - Date sorting should handle null ETAs gracefully

4. SEARCH:
   - Search by case number — should find exact match
   - Search by client name — should find partial match
   - Search with no results — should show "no cases found" message

5. PAGINATION:
   - If there are enough cases, verify pagination works
   - Verify page count is correct
   - Verify navigating pages preserves filters

6. QUICK ACTIONS:
   - Change priority on a case — verify it saves to database
   - Reassign a case — verify it saves
   - Verify audit events are created for these actions

7. NEW CASE BUTTON:
   - Click "New Case" — should open the creation wizard
   - Verify the wizard loads without errors (full test in next step)

Fix every issue. Commit as "fix: cases list — all features verified"
```

## Step V5: Case Detail Page

```
This is the most complex page. Test every tab:

1. HEADER:
   - Case number, client, status badge, priority badge all display correctly
   - Mode of transport shows with icon
   - ETA and dates display correctly (formatted, not raw timestamps)
   - Assigned user shows name (not UUID)
   - Risk score indicator displays

2. STATUS TRANSITIONS:
   - Test EVERY valid transition:
     intake → awaiting_docs ✓
     awaiting_docs → docs_validated ✓
     docs_validated → classification_review ✓
     classification_review → entry_prep ✓
     entry_prep → submitted ✓
     submitted → govt_review ✓
     govt_review → released ✓
     govt_review → hold ✓
     hold → entry_prep ✓
     released → billing ✓
     billing → closed ✓
   - Verify each creates a workflow_event AND audit_event
   - Test INVALID transitions (should be rejected):
     intake → submitted (should NOT be possible)
     closed → intake (should NOT be possible)
   - Verify the dropdown only shows valid next statuses

3. OVERVIEW TAB:
   - Timeline shows correct current stage highlighted
   - Completed stages are checked
   - Future stages are grayed
   - Key dates display correctly
   - Quick stats (docs uploaded vs required, tasks open vs completed) are accurate

4. DOCUMENTS TAB:
   - Required documents checklist shows based on mode of transport
   - Missing docs are flagged
   - Uploaded docs show file name, date, version
   - Upload button works (test with a real PDF)
   - After upload, document appears in the list
   - If Document Agent ran, extracted fields show with confidence badges
   - Accept/Reject/Edit buttons work on extracted fields

5. TASKS TAB:
   - Tasks linked to this case appear
   - Create task button works and pre-links to the case
   - Complete/cancel task actions work
   - Overdue tasks are highlighted

6. CLASSIFICATION TAB (if exists):
   - "Get HTS Suggestions" button invokes the classification agent
   - Results show with confidence scores and rationale
   - Approve button only visible to licensed broker users

7. COMMUNICATIONS TAB (if exists):
   - AI-drafted emails appear
   - Edit/Send and Discard buttons work
   - Sent messages are logged

8. ACTIVITY TAB:
   - All events for this case appear in chronological order
   - User actions, agent actions, and system events are all shown
   - Timestamps and actor names display correctly

Fix every issue. Commit as "fix: case detail — all tabs verified"
```

## Step V6: Case Creation Wizard

```
Test the new case creation flow end-to-end:

1. Open the new case wizard
2. STEP 1 — Basic Info:
   - Client dropdown loads with all clients
   - Client search works
   - Mode of transport selection works
   - Priority selection works
   - ETA date picker works
   - Business unit dropdown loads

3. STEP 2 — Assign + Notes:
   - Specialist dropdown shows only specialist-role users
   - Required doc checklist pre-populates based on mode:
     Ocean → commercial_invoice, packing_list, bill_of_lading, arrival_notice, poa
     Air → commercial_invoice, packing_list, airway_bill, poa
   - Can add/remove doc requirements
   - Notes textarea works

4. STEP 3 — Review + Create:
   - Summary shows all entered info correctly
   - "Create Case" button works
   - After creation:
     * case_number is auto-generated
     * Status is 'intake'
     * workflow_event created (null → intake)
     * Initial tasks created (collect docs, review setup)
     * audit_event created
     * Redirects to new case detail page

5. VALIDATION:
   - Try submitting without required fields — should show errors
   - Try creating a case with same reference number — handle gracefully

Fix every issue. Commit as "fix: case creation — full wizard verified"
```

---

# Phase V5: Documents & Tasks

## Step V7: Document Upload System

```
Test the document upload system:

1. Upload a real PDF to a case
   - Drag and drop works
   - Click to upload works
   - Progress indicator shows during upload
   - File appears in documents list after upload

2. File type validation:
   - PDF → accepted
   - PNG/JPG → accepted
   - XLSX/DOCX → accepted
   - .exe, .sh → rejected with clear error message

3. File size validation:
   - Small file → accepted
   - File > 25MB → rejected with clear error message

4. Storage verification:
   - File is stored in Supabase Storage at correct path
     (/{tenant_id}/{case_id}/{doc_type}/{filename})
   - Download button retrieves the correct file
   - PDF viewer shows the PDF inline

5. Version handling:
   - Upload a second file of the same doc_type
   - Version number increments
   - Both versions are accessible

6. Document Agent integration:
   - After upload, parse_status changes to 'pending' then 'processing'
   - If ANTHROPIC_API_KEY is set, agent runs and extracts fields
   - Extracted fields appear with confidence badges
   - If API key is not set, graceful failure (not crash)

7. Audit trail:
   - Upload creates audit_event
   - Agent parse creates ai_action_log

Fix every issue. Commit as "fix: document upload — full pipeline verified"
```

## Step V8: Task System

```
Test the task management system:

1. TASKS LIST PAGE (/tasks):
   - "My Tasks" shows only tasks assigned to current user
   - "All Tasks" shows all tenant tasks (for ops_manager+)
   - Filters work: status, priority, case, assignee, due date
   - Sorting works: by due date, priority, created date

2. CREATE TASK:
   - Modal opens with all fields
   - Can assign to any team member
   - Can link to a case (optional)
   - Due date picker works
   - Form validation works (can't submit without title)
   - Creates task + audit_event

3. TASK ACTIONS:
   - Mark complete → status changes, completed_at is set
   - Reassign → assigned_user changes
   - Change priority → priority updates
   - Cancel → status changes, reason is recorded
   - All actions create audit events

4. TASK INTEGRATION:
   - Tasks created by agents appear in the tasks list
   - Tasks linked to cases appear on the case detail Tasks tab
   - Overdue tasks are highlighted (red if overdue, yellow if due soon)

Fix every issue. Commit as "fix: task system — all actions verified"
```

---

# Phase V6: AI Agents

## Step V9: Agent System Verification

```
Test every AI agent. If ANTHROPIC_API_KEY is not configured,
test that agents fail gracefully. If it IS configured, test full functionality.

1. AGENT INFRASTRUCTURE:
   - All 6 agents are registered (check registry)
   - POST /api/agents/invoke works with a valid agent ID
   - POST /api/agents/invoke returns 404 for invalid agent ID
   - All agent invocations are logged to ai_action_logs
   - Approval gateway correctly identifies L0 (needs approval) vs L1+ (auto-approve)

2. DOCUMENT PARSER AGENT:
   - Upload a commercial invoice PDF
   - Agent classifies it correctly
   - Extracted fields include: shipper, consignee, invoice_number, total_value
   - Low-confidence fields are flagged
   - Review task is created for low-confidence results
   - If document is unreadable, agent returns graceful failure (not crash)

3. INTAKE AGENT:
   - Go to the intake queue page
   - Use "Test Intake" to simulate an email
   - Agent creates a draft case with extracted details
   - Missing fields are flagged (not invented)
   - "Confirm + Create Case" creates a real case
   - "Reject" discards the draft

4. CLASSIFICATION AGENT:
   - On a case with extracted product descriptions
   - Click "Get HTS Suggestions"
   - Agent returns 2-3 candidate codes with rationale
   - Each has a "why it might be wrong" section
   - Low confidence triggers broker review task
   - Only licensed broker can approve codes

5. OPS COORDINATOR AGENT:
   - Click "Run Ops Check" on dashboard (or hit the API)
   - Agent identifies stuck cases correctly
   - Tasks are created for stuck cases
   - Running again does NOT create duplicate tasks
   - Escalation works for cases stuck > 2x SLA

6. FINANCE AGENT:
   - Move a case to 'billing' status
   - Agent generates invoice draft
   - Draft includes reasonable line items
   - Review task created for finance role

7. CLIENT COMMS AGENT:
   - Trigger a missing docs scenario
   - Agent drafts a professional email
   - Email references correct case details and client name
   - Draft is editable before sending

For any agent that crashes or produces incorrect results,
fix the agent code and its prompts. Commit as "fix: agents — all 6 verified"
```

---

# Phase V7: Audit & Compliance

## Step V10: Audit Trail Completeness

```
Verify the audit trail captures EVERYTHING:

1. Check that these actions ALL create audit_events:
   - User login/logout
   - Case created
   - Case status changed
   - Task created/completed/cancelled/reassigned
   - Document uploaded
   - Agent invoked (with inputs/outputs)
   - Human accepted/rejected agent suggestion
   - Priority changed
   - User assigned/reassigned

2. Audit viewer page (/audit):
   - Loads for admin and broker_lead roles only
   - Other roles get 403 or redirect
   - Filters work: date range, event type, entity type, actor
   - Search works: by entity_id, by details content
   - CSV export downloads correct data
   - Pagination works

3. Data integrity:
   - audit_events table rejects UPDATE operations
   - audit_events table rejects DELETE operations
   - All events have: tenant_id, event_type, entity_type, entity_id,
     actor_type, actor_id, action, details, created_at

Fix any gaps. Commit as "fix: audit trail — complete coverage verified"
```

---

# Phase V8: Integration Points

## Step V11: API Routes Health Check

```
Test every API route in the application:

1. List all API routes in /app/api/
2. For each route, test:
   - Authenticated request returns correct data
   - Unauthenticated request returns 401
   - Invalid input returns 400 with helpful error message
   - Wrong tenant data returns empty (RLS blocks it)
   - Missing required fields return validation errors

3. Specific routes to test:
   - POST /api/documents/upload — file upload works
   - POST /api/documents/parse — triggers document agent
   - POST /api/documents/decision — accept/reject extracted fields
   - POST /api/agents/invoke — agent invocation
   - POST /api/agents/ops-coordinator/run — ops check
   - Any case status change endpoints
   - Any task CRUD endpoints
   - Any client portal endpoints (if built)

4. Error handling:
   - No route should return a raw stack trace to the client
   - All errors should be logged server-side
   - All errors should return structured JSON to the client

Fix every issue. Commit as "fix: API routes — all endpoints verified"
```

---

# Phase V9: Cross-Cutting Concerns

## Step V12: Multi-Tenancy Verification

```
This is critical for the acquisition model. Verify tenant isolation:

1. If you have seed data for only one tenant, create a second test tenant
   with its own users, cases, and documents.

2. Log in as Tenant A user:
   - Can see only Tenant A's cases, documents, tasks, clients
   - Cannot see Tenant B's data in any view
   - API routes return only Tenant A's data

3. Log in as Tenant B user:
   - Same verification in reverse

4. Cross-tenant API test:
   - Try to access Tenant B's case ID while logged in as Tenant A
   - Should return 404 or empty, never Tenant B's data

5. RLS verification:
   - Run a direct SQL query (in Supabase SQL editor) as the anon role
     with Tenant A's JWT — should only see Tenant A's data
   - Verify every table has RLS enabled and policies are correct

This is a security-critical check. Any failure here must be fixed immediately.
Commit as "fix: multi-tenancy — complete isolation verified"
```

## Step V13: Error Handling & Edge Cases

```
Test edge cases that autonomous building often misses:

1. EMPTY STATES:
   - Dashboard with zero cases
   - Cases list with no matching filters
   - Case detail with zero documents
   - Tasks page with zero tasks
   - Audit trail with zero events
   All should show helpful empty state messages, not crashes or blank pages.

2. LOADING STATES:
   - Slow network: do components show loading indicators?
   - Add skeleton loaders or spinners where missing

3. LONG CONTENT:
   - Case with a very long client name — does it truncate or overflow?
   - Document with a very long filename
   - Task with a very long description
   - Audit event with a large details JSON

4. CONCURRENT ACTIONS:
   - Two users viewing the same case — does it handle correctly?
   - Status change while another user is on the same page

5. BROWSER BACK/FORWARD:
   - Navigate case list → case detail → back
   - Apply filters → navigate away → back — filters preserved?

6. FORM VALIDATION:
   - Every form should validate on submit
   - Error messages should be clear and specific
   - Invalid data should never reach the database

Fix every issue. Commit as "fix: edge cases — empty states, loading, overflow"
```

## Step V14: Final Health Report

```
Generate a comprehensive health report:

1. Run `npm run build` — confirm zero errors
2. Run `npm run lint` — confirm zero warnings
3. Count total files, components, API routes, and agents
4. List every page route and its status (working/broken)
5. List every API route and its status
6. List every agent and its status
7. List any known issues or TODOs that remain
8. List any features that were skipped or partially built
9. Performance check: how long does the dashboard take to load?
10. Security check: any exposed secrets, missing auth checks, or RLS gaps?

Output this as a markdown file at docs/HEALTH_REPORT.md
Update CLAUDE.md with the verification results.
Commit as "docs: verification complete — health report generated"
```

---

# Quick Fix Patterns

## When a page shows "Application Error"

```
The page at [URL] shows "Application error: a client-side exception has occurred."
Check the browser console and Next.js terminal output. Fix the root cause.
Common causes: missing import, undefined variable, failed Supabase query,
hydration mismatch between server and client components.
```

## When a page loads but shows wrong data

```
The [page/component] shows [what it shows] but should show [what's expected].
Check the Supabase query. Run the query directly in SQL editor to verify.
Then check the component is mapping the data correctly.
```

## When an agent fails

```
The [agent name] agent failed with: [error].
Check lib/agents/[agent-name]/index.ts.
Common causes: bad Claude API prompt, missing field in input schema,
Supabase query returning unexpected shape, missing error handling.
```

---

End of Verification Playbook
