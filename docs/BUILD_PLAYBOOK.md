# BizOS AI Build Playbook

**The Complete Prompt-by-Prompt Roadmap**

From Zero to Deployable Customs Operating System Using AI as Your Engineering Team

**Version 1.0 — March 2026**
48 Build Steps • Full Prompts • Success Criteria • Validation Tests

---

## How to Use This Playbook

This document is designed to be used with AI coding tools (Claude Code, Cursor, etc.) as your primary engineering resource. Each step contains everything you need to hand to an AI and get working code back.

### The Build Pattern (Repeat for Every Step)

1. **Read** the step overview to understand what you're building and why it matters.
2. **Copy** the PROMPT into your AI coding tool (Claude Code, Cursor, etc.).
3. **Review** the AI's output against the SUCCESS CRITERIA checklist.
4. **Run** the VALIDATION tests to confirm it actually works.
5. **Check** the WATCH OUT notes for common pitfalls.
6. **Move** to the next step only when all criteria are met.

### Your AI Tool Setup

- **Recommended:** Use Claude Code (terminal) for all coding — it has direct access to your codebase.
- Keep CLAUDE.md updated after every step — this is Claude Code's persistent memory.
- Save every working version before moving to the next step. Git commit after every successful step.

### Critical Rules for AI-Assisted Building

- **NEVER** skip the validation step. AI code often looks right but has subtle bugs.
- **ALWAYS** read the AI's output before running it. Understand what it's doing.
- **ONE STEP AT A TIME.** Don't try to build multiple steps in one prompt.
- When something breaks, paste the error message back to the AI with context.
- Git commit after every successful step. You will need to roll back at some point.
- Keep a running log of decisions and deviations from this playbook.

---

## Technology Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | Next.js 14+ (App Router) + Tailwind CSS | Full-stack React; server components; fast iteration |
| Backend/API | Next.js API routes (start) → separate services (later) | Start monolith, extract as complexity grows |
| Database | PostgreSQL via Supabase | Row-level security for tenancy; auth built in; generous free tier |
| Auth | Supabase Auth | Integrated with DB; supports MFA, magic links, OAuth |
| File Storage | Supabase Storage (S3-compatible) | Same platform; presigned URLs; bucket policies |
| AI/LLM | Anthropic Claude API | Best for structured reasoning, tool use, and long context |
| Deployment | Vercel (frontend) + Supabase (backend/DB) | Zero-config deploys; preview branches |
| Version Control | GitHub | Branch protection, PR reviews, Actions for CI |

---

## Step 0: Create Your Project Context File

Before building anything, create a context file that you'll paste at the beginning of every AI session. This keeps the AI aligned with your project's architecture, conventions, and current state. Update this file after every major step.

**SAVE THIS AS:** `CLAUDE.md` in your project root

```markdown
# BizOS — Customs Brokerage Operating System

## What This Is
Multi-tenant operating system for customs brokerage businesses.
AI-powered agents handle document parsing, case intake, classification,
ops coordination, finance, and client communications.
U.S. customs focus: ACE/EDI filings, 19 CFR compliance, broker supervision.

## Tech Stack
- Frontend: Next.js 14+ (App Router) + TypeScript strict + Tailwind CSS + shadcn/ui
- Backend: Next.js API routes (monolith phase) + Supabase
- Database: PostgreSQL (Supabase) with Row-Level Security on EVERY table
- Auth: Supabase Auth with MFA
- File Storage: Supabase Storage (S3-compatible)
- AI: Anthropic Claude API (claude-sonnet-4-20250514)
- Deploy: Vercel + Supabase

## Architecture Rules
- tenant_id on EVERY table. RLS enforced. No exceptions.
- Workflow = deterministic state machine. No free-form status changes.
- AI agents start at L0 (advisory). Human approves all actions.
- All agent actions logged to ai_action_logs with confidence + citations.
- audit_events is APPEND-ONLY. No updates, no deletes.
- Server Components by default. "use client" only when interactive.

## Build Playbook
Full step-by-step build plan is in docs/BUILD_PLAYBOOK.md.
Always reference it before starting a new step.

## Conventions
- TypeScript strict mode. No `any` types.
- Zod for all runtime validation.
- snake_case for DB, camelCase for TypeScript, kebab-case for files.
- All DB access via Supabase client. Never raw SQL in app code.

## File Structure
/app/(protected)/ — authenticated routes
/app/(public)/ — login, signup
/app/api/ — API routes
/components/ui/ — shadcn components
/lib/supabase/ — client helpers
/lib/agents/ — AI agent infrastructure
/lib/types/ — TypeScript types
/lib/validators/ — Zod schemas

## Current Build Status
- Phase: 1 (Foundation)
- Current Step: Step 1 — Project Initialization
- Completed: nothing yet

## Build Log
(update after each step)

## Build Rules
- After EVERY step: run /step-complete to commit and update status
- Before EVERY step: run /step-start to verify clean state
- If something breaks: run /health-check before debugging
- Never skip validation. Always `npm run build` before committing.
- One step at a time. Don't combine multiple playbook steps.
```

**SUCCESS CRITERIA:**
- ✅ File saved to repo root as CLAUDE.md
- ✅ You understand every line and can explain the stack choices
- ✅ You've committed this to git as your first commit

---

## PHASE 1: FOUNDATION

**Steps 1–12 • Weeks 1–6 • The boring stuff that makes everything else possible**

---

### Step 1: Initialize the Project

Create the Next.js project with all dependencies. This is your codebase skeleton.

**PROMPT — Copy this into Claude Code:**

```
I'm building a customs brokerage operating system called BizOS.
Create a new Next.js 14 project with the App Router. Set up:

1. Next.js 14+ with TypeScript (strict mode)
2. Tailwind CSS with the default config
3. shadcn/ui initialized with the 'default' style and 'slate' base color
4. Supabase JS client (@supabase/supabase-js and @supabase/ssr)
5. Zod for validation
6. A .env.local.example with: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
7. A clean folder structure:
   /app — Next.js App Router pages
   /app/api — API routes
   /components — shared UI components
   /components/ui — shadcn components
   /lib — utilities, supabase client, types
   /lib/supabase — client and server Supabase helpers
   /lib/types — TypeScript type definitions
   /lib/validators — Zod schemas
8. A basic layout.tsx with a placeholder sidebar nav
9. A homepage that says 'BizOS — Customs Operating System'
10. A .gitignore that covers Next.js + .env files

Give me the exact terminal commands and all file contents.
Use the latest stable versions of everything.
```

**SUCCESS CRITERIA:**
- ✅ `npm run dev` starts without errors
- ✅ Homepage renders at localhost:3000 with the BizOS title
- ✅ Tailwind styles are working (you can see styled elements)
- ✅ TypeScript has zero errors (`npm run build` succeeds)
- ✅ Folder structure matches the spec above

**WATCH OUT:**
- ⚠️ Make sure you're on Next.js 14+ with App Router, NOT Pages Router
- ⚠️ If shadcn/ui init fails, check you have the right Tailwind config
- ⚠️ Don't add Supabase project credentials yet — that's Step 2

---

### Step 2: Set Up Supabase Project + Database Schema v1

Create the Supabase project and build the core database schema. This is the most important step in the entire build — the data model is the foundation everything else sits on.

**PROMPT:**

```
[Paste your CLAUDE.md here first]

I need the complete SQL migration for the BizOS core database schema.
This is a multi-tenant customs brokerage platform. Create these tables:

CORE TABLES (every table gets tenant_id as a required FK):

1. tenants — id (uuid), name, slug (unique), timezone, data_region,
   settings (jsonb), created_at, updated_at

2. users — id (uuid, references auth.users), tenant_id, email, full_name,
   role (enum: admin, broker_lead, ops_manager, specialist, finance, viewer),
   is_licensed_broker (boolean), is_active, created_at, updated_at

3. business_units — id, tenant_id, name, location, port_code, is_active

4. client_accounts — id, tenant_id, name, importer_of_record_number,
   default_commodity_profile (jsonb), billing_terms (jsonb),
   sop_notes (text), is_active, created_at

5. contacts — id, tenant_id, client_account_id (FK), name, email,
   phone, role, is_primary

CASE/WORKFLOW TABLES:

6. entry_cases — id, tenant_id, client_account_id (FK),
   business_unit_id (FK), assigned_user_id (FK),
   case_number (unique per tenant), mode_of_transport
   (enum: ocean, air, truck, rail),
   status (enum: intake, awaiting_docs, docs_validated,
   classification_review, entry_prep, submitted, govt_review,
   hold, released, billing, closed, archived),
   eta (timestamptz), actual_arrival (timestamptz),
   risk_score (float), priority (enum: low, normal, high, urgent),
   metadata (jsonb), created_at, updated_at

7. workflow_events — id, tenant_id, entry_case_id (FK),
   from_status, to_status, triggered_by_user_id,
   triggered_by_agent (text, nullable), reason (text),
   created_at (this is append-only — no updates allowed)

8. tasks — id, tenant_id, entry_case_id (FK, nullable),
   assigned_user_id (FK, nullable), title, description,
   task_type (enum: review, approval, data_entry, client_request,
   escalation, filing_prep, other),
   status (enum: pending, in_progress, completed, cancelled),
   priority, due_at (timestamptz), completed_at, created_at

DOCUMENT TABLES:

9. documents — id, tenant_id, entry_case_id (FK),
   uploaded_by_user_id (FK, nullable), doc_type
   (enum: commercial_invoice, packing_list, bill_of_lading,
   airway_bill, arrival_notice, poa, certificate_of_origin,
   isf_data, other),
   file_name, storage_path, file_hash (text), file_size_bytes,
   version (integer, default 1), parse_status
   (enum: pending, processing, completed, failed),
   extracted_data (jsonb), created_at

AUDIT + AI TABLES:

10. audit_events — id, tenant_id, event_type (text),
    entity_type (text), entity_id (uuid), actor_type
    (enum: user, agent, system), actor_id (text),
    action (text), details (jsonb), created_at
    — THIS TABLE IS APPEND-ONLY: no UPDATE or DELETE policies

11. ai_action_logs — id, tenant_id, agent_type (text),
    entry_case_id (FK, nullable), action (text),
    inputs (jsonb), outputs (jsonb), confidence (float),
    citations (jsonb), human_decision
    (enum: pending, accepted, rejected, modified, null),
    human_decision_by (FK to users, nullable),
    human_decision_reason (text, nullable), created_at

REQUIREMENTS:
- Enable Row-Level Security (RLS) on EVERY table
- Create RLS policies so users can only see their own tenant's data
- Add indexes on: tenant_id (all tables), entry_cases.status,
  entry_cases.client_account_id, tasks.status + assigned_user_id,
  documents.entry_case_id, audit_events.entity_type + entity_id
- Add created_at defaults (now()) and updated_at triggers
- Use gen_random_uuid() for all id defaults
- Add a function to auto-generate case_number per tenant
  (format: tenant_slug-YYYY-NNNNN, auto-incrementing)

Give me the complete SQL migration file I can run in Supabase SQL editor.
Include comments explaining each table's purpose.
```

**SUCCESS CRITERIA:**
- ✅ All 11 tables created in Supabase with no SQL errors
- ✅ RLS is enabled on every table (check Supabase dashboard → Auth → Policies)
- ✅ You can insert a test tenant, user, and entry_case
- ✅ Inserting a row with wrong tenant_id returns empty (RLS blocks it)
- ✅ audit_events table rejects UPDATE and DELETE operations
- ✅ case_number auto-generates correctly (e.g., 'acme-2026-00001')

**HOW TO VALIDATE:**
- 🧪 In Supabase SQL editor, insert a test tenant and two users in different tenants
- 🧪 Query entry_cases as User A — should only see Tenant A's cases
- 🧪 Try to UPDATE audit_events — should fail with policy violation
- 🧪 Try to INSERT entry_case with invalid status enum — should fail

---

### Step 3: Authentication Flow

Wire up Supabase Auth with login, signup, and role-based redirects. This must work perfectly before anything else because every subsequent feature depends on knowing who the user is and what tenant they belong to.

**PROMPT:**

```
[Paste CLAUDE.md]

Build the complete authentication flow for BizOS using Supabase Auth.

REQUIREMENTS:
1. Login page at /login with email/password
2. Signup page at /signup that also captures: full_name, and creates
   a record in the public.users table linked to auth.users
3. Middleware (middleware.ts) that:
   - Redirects unauthenticated users to /login
   - Redirects authenticated users away from /login to /dashboard
   - Refreshes the session on every request
4. A Supabase server client helper (lib/supabase/server.ts) that
   works in Server Components and API routes
5. A Supabase browser client helper (lib/supabase/client.ts)
6. A useUser() hook that returns the current user + their role + tenant
7. A server-side getCurrentUser() function that returns the full
   user profile (joined with public.users) for Server Components
8. A logout button component
9. A protected layout wrapper at /app/(protected)/layout.tsx that
   fetches the user and renders the sidebar + main content area

The login/signup pages should be clean and professional using
shadcn/ui components (Card, Input, Button, Label).

After login, redirect to /dashboard.
Give me every file with complete code.
```

**SUCCESS CRITERIA:**
- ✅ Can sign up a new user and see them in Supabase Auth dashboard AND public.users table
- ✅ Can log in and get redirected to /dashboard
- ✅ Visiting /dashboard when logged out redirects to /login
- ✅ getCurrentUser() returns the full profile with role and tenant_id
- ✅ Logout works and redirects to /login

---

### Step 4: Tenant Setup + Seed Data

Create a tenant onboarding flow and seed your first tenant with test data. This gives you a working environment to build every subsequent feature against.

**PROMPT:**

```
[Paste CLAUDE.md]

Build a tenant setup system for BizOS:

1. A seed script (scripts/seed.ts) that creates:
   - 1 tenant: 'Acme Customs Brokerage', slug: 'acme'
   - 5 users with different roles:
     * admin@acme.com (admin, is_licensed_broker: true)
     * ops@acme.com (ops_manager)
     * specialist1@acme.com (specialist)
     * specialist2@acme.com (specialist)
     * finance@acme.com (finance)
   - 2 business units: 'LAX Port Office', 'JFK Port Office'
   - 3 client accounts with contacts:
     * 'TechGlobal Inc' (electronics importer)
     * 'FreshFoods LLC' (perishable goods)
     * 'AutoParts Direct' (auto parts)
   - 10 entry_cases across different statuses and clients
     with realistic data (different modes, ETAs, priorities)
   - 3-5 documents per case (just metadata, not actual files)
   - Workflow events showing status progression for each case
   - 15-20 tasks across cases and users

2. The seed script should use Supabase service role key (not anon)
   and be runnable with: npx tsx scripts/seed.ts

3. Also create a Supabase SQL function or trigger that
   auto-assigns tenant_id based on the authenticated user's tenant
   for inserts (so app code doesn't have to pass tenant_id manually).

Make the seed data realistic for a customs brokerage.
Include varied statuses so dashboards will have interesting data.
```

**SUCCESS CRITERIA:**
- ✅ Seed script runs without errors
- ✅ Can query all 11 tables and see realistic test data
- ✅ Cases span multiple statuses (not all in one stage)
- ✅ Each client has different cases with different priorities
- ✅ Workflow events show logical status progressions

---

### Step 5: Sidebar Navigation + Role-Based Menu

Build the application shell: sidebar navigation that changes based on user role.

**PROMPT:**

```
[Paste CLAUDE.md]

Build the sidebar navigation for BizOS. This is a persistent left sidebar.

STRUCTURE:
- Logo/brand at top ('BizOS' text for now)
- Navigation links (icons + labels, collapsible on mobile):
  * Dashboard (home icon) — all roles
  * Cases (briefcase) — all except viewer
  * Documents (file icon) — all except viewer
  * Tasks (check-square) — all except viewer
  * Clients (users icon) — admin, ops_manager, broker_lead
  * Finance (dollar icon) — admin, finance
  * Reports (bar-chart) — admin, ops_manager, broker_lead
  * Settings (gear) — admin only
- Active state highlighting (current route)
- User info at bottom (name, role badge, logout button)
- Tenant name displayed subtly under the logo

REQUIREMENTS:
- Use lucide-react for icons
- Responsive: full sidebar on desktop, slide-over on mobile
- Role-based: only show menu items the user's role permits
- Use the getCurrentUser() function from Step 3
- The main content area should be to the right of the sidebar

Build this as the layout at /app/(protected)/layout.tsx
Use shadcn/ui components where appropriate.
```

**SUCCESS CRITERIA:**
- ✅ Sidebar renders with all nav items for admin user
- ✅ Logging in as finance user shows only Dashboard, Cases, Documents, Tasks, Finance
- ✅ Active route is highlighted
- ✅ Mobile view shows hamburger menu that opens a slide-over sidebar
- ✅ User info at bottom shows name, role, and tenant
- ✅ Clicking any nav link navigates correctly

---

### Step 6: Dashboard — The Command Center

Build the main dashboard. This is the first screen users see after login.

**PROMPT:**

```
[Paste CLAUDE.md]

Build the BizOS dashboard at /app/(protected)/dashboard/page.tsx

This is a Server Component that fetches real data from Supabase.

LAYOUT (4 sections):

1. STATS ROW (top): 4 metric cards showing:
   - Total Active Cases (status NOT IN closed, archived)
   - Cases Due Today (eta is today)
   - Missing Documents (cases in awaiting_docs status)
   - Overdue Tasks (tasks where due_at < now AND status = pending)
   Each card: big number, label, and a colored indicator
   (green = good, yellow = attention, red = urgent)

2. EXCEPTION STACK (left 2/3): a list of 'things that need attention'
   Query for: cases stuck in a stage > 48 hours, cases with
   priority=urgent, tasks overdue > 24 hours
   Each row: case number, client name, issue description,
   time stuck, assigned user, action button

3. CASES BY STATUS (right 1/3): a simple bar/count showing
   how many cases are in each workflow stage

4. RECENT ACTIVITY (bottom): last 10 audit_events
   showing: timestamp, actor, action, entity link

REQUIREMENTS:
- All data fetched server-side via Supabase (no client fetch)
- Data is real from the seed data we created
- Use shadcn/ui Card, Badge, Table components
- Responsive: stack on mobile, grid on desktop
- Each exception row should link to the case page (even if it
  doesn't exist yet — use /cases/[id] as the href)

This should look like a real operational dashboard, not a demo.
```

**SUCCESS CRITERIA:**
- ✅ Dashboard loads with real numbers from seed data
- ✅ Stats cards show correct counts (verify against raw DB queries)
- ✅ Exception stack shows cases that are actually stuck/overdue
- ✅ Cases by status counts match what's in the database
- ✅ Recent activity shows the last 10 audit events
- ✅ Everything is responsive and looks professional

---

### Step 7: Cases List Page

Build the main cases list — the workhorse view for ops managers and specialists.

**PROMPT:**

```
[Paste CLAUDE.md]

Build the cases list page at /app/(protected)/cases/page.tsx

REQUIREMENTS:
1. A filterable, sortable table of entry_cases with columns:
   Case #, Client, Mode, Status (colored badge), Priority (badge),
   ETA, Assigned To, Last Updated

2. Filters (top bar, using shadcn Select/Popover):
   - Status (multi-select dropdown)
   - Priority (multi-select)
   - Client (searchable dropdown)
   - Assigned User (dropdown)
   - Date range (ETA range)

3. Sort by clicking column headers (toggle asc/desc)

4. Search bar that searches case_number and client name

5. Pagination (25 per page)

6. Quick actions per row:
   - View case (link to /cases/[id])
   - Change priority (dropdown)
   - Reassign (dropdown of team members)

7. Bulk actions (select multiple rows):
   - Bulk reassign
   - Bulk change priority

8. A 'New Case' button (top right) — just opens a modal for now

Use URL search params for filter state so filters survive page refresh.
Fetch data server-side. Use shadcn Table, Badge, Select, Button.
Status badges should be color-coded:
   intake/awaiting_docs = yellow, classification/entry_prep = blue,
   submitted/govt_review = purple, hold = red, released/billing = green,
   closed = gray
```

**SUCCESS CRITERIA:**
- ✅ All seed data cases appear in the table
- ✅ Every filter works and updates URL params
- ✅ Sorting by each column works correctly
- ✅ Search finds cases by case number and client name
- ✅ Pagination shows correct page counts
- ✅ Status badges are correctly colored
- ✅ Quick actions (priority change, reassign) update the database

---

### Step 8: Case Detail Page — The Workspace

This is the single most important screen in the entire application. It's where specialists spend 80% of their time.

**PROMPT:**

```
[Paste CLAUDE.md]

Build the case detail page at /app/(protected)/cases/[id]/page.tsx

This is the primary workspace for a customs entry case.

HEADER SECTION:
- Case number (large), client name, status badge, priority badge
- Mode of transport icon + label
- ETA and actual arrival dates
- Assigned user with avatar/initials
- Risk score indicator (low/medium/high color)
- 'Change Status' dropdown (only shows valid next statuses based
  on current status — enforce state machine transitions)

TABS (below header):

TAB 1: Overview
- Visual timeline showing workflow stages with completed stages
  checked, current stage highlighted, future stages grayed
- Key dates section (created, ETA, arrival, submitted, released)
- Quick stats: docs uploaded vs required, tasks open vs completed

TAB 2: Documents
- Required documents checklist (based on mode of transport):
  Ocean: commercial_invoice, packing_list, bill_of_lading,
  arrival_notice, poa (minimum)
  Air: commercial_invoice, packing_list, airway_bill, poa
- Each doc type shows: status (missing/uploaded/validated),
  file link, uploaded date, version count
- Upload button per doc type
- Extracted data preview (from documents.extracted_data jsonb)

TAB 3: Tasks
- List of tasks linked to this case
- Create task button
- Task card: title, assignee, due date, status, priority
- Complete/cancel actions

TAB 4: Activity/Audit
- Chronological feed of all audit_events and workflow_events
  for this case, plus ai_action_logs
- Each entry: timestamp, actor (user or agent), action, details

REQUIREMENTS:
- Server-side data fetch for the case + related data
- Status changes must: validate transitions, create workflow_event,
  create audit_event, and update the case
- Use shadcn Tabs, Card, Badge, Button, Dialog
- The status change must enforce valid transitions:
  intake → awaiting_docs → docs_validated → classification_review
  → entry_prep → submitted → govt_review → released → billing
  → closed. Plus: govt_review → hold, hold → entry_prep.
```

**SUCCESS CRITERIA:**
- ✅ Case page loads with all real data from seed
- ✅ All 4 tabs render with correct content
- ✅ Timeline shows the correct current stage highlighted
- ✅ Documents tab shows required docs and flags missing ones
- ✅ Status change dropdown only shows valid next statuses
- ✅ Changing status creates both workflow_event AND audit_event
- ✅ Invalid status transitions are rejected
- ✅ Activity tab shows all events in chronological order

**WATCH OUT:**
- ⚠️ This is the biggest single step. It's OK to break this into 2-3 sessions.
- ⚠️ Build the header + tabs structure first, then fill in each tab one at a time.
- ⚠️ The status transition enforcement is critical — test every valid and invalid transition.

---

### Step 9: Document Upload + Storage

Wire up actual file uploads to Supabase Storage.

**PROMPT:**

```
[Paste CLAUDE.md]

Build the document upload system for BizOS:

1. Supabase Storage bucket: 'case-documents' with path structure:
   /{tenant_id}/{case_id}/{doc_type}/{filename}

2. Upload component that:
   - Accepts drag-and-drop or click-to-upload
   - Shows upload progress
   - Validates file types (PDF, PNG, JPG, JPEG, TIFF, XLSX, DOCX)
   - Validates file size (max 25MB)
   - Requires selecting a document type from the enum
   - On success: creates documents table row with storage_path,
     file_hash (SHA-256 of file), file_size, and creates audit_event

3. Document viewer component:
   - Shows PDF inline using an embed/iframe
   - Shows images inline
   - Download button for all file types
   - Version history (if multiple uploads of same doc_type)

4. Storage bucket policies:
   - Authenticated users can upload to their tenant's path
   - Authenticated users can read from their tenant's path
   - No public access

5. API route: POST /api/documents/upload that handles:
   - File upload to Supabase Storage
   - Document record creation
   - File hash generation
   - Audit event creation

Integrate this into the case detail Documents tab.
```

**SUCCESS CRITERIA:**
- ✅ Can upload a PDF to a case and see it appear in the documents list
- ✅ File is stored at the correct path in Supabase Storage
- ✅ Document record appears in the documents table with correct metadata
- ✅ Can view/download the uploaded file
- ✅ Uploading a second file of the same type creates version 2
- ✅ Audit event is created for the upload
- ✅ Cannot access files from another tenant's bucket path

---

### Step 10: Task System

Build the task management system.

**PROMPT:**

```
[Paste CLAUDE.md]

Build the task management system for BizOS:

1. Tasks list page at /app/(protected)/tasks/page.tsx:
   - 'My Tasks' view (default): tasks assigned to current user
   - 'All Tasks' view (ops_manager+ roles): all tenant tasks
   - Filters: status, priority, case, assignee, due date range
   - Sort by due date (default), priority, created date

2. Create Task functionality:
   - Modal form with: title, description, task_type, priority,
     assigned_user (dropdown of team), due_at, linked case (optional)
   - Creates task + audit event

3. Task card/row actions:
   - Mark complete (status → completed, sets completed_at)
   - Reassign
   - Change priority
   - Cancel (with reason)
   All actions create audit events.

4. Task widget on case detail page (Tasks tab):
   - Shows tasks for that case
   - Create task pre-linked to the case

5. Overdue task highlighting:
   - Red badge if due_at < now and status is pending/in_progress
   - Yellow badge if due within 4 hours

Use shadcn Dialog for create/edit, shadcn Badge for status/priority.
```

**SUCCESS CRITERIA:**
- ✅ Can create, complete, reassign, and cancel tasks
- ✅ My Tasks filters correctly to the logged-in user
- ✅ Tasks linked to a case show up on the case detail page
- ✅ Overdue tasks are visually highlighted in red
- ✅ All actions create audit trail entries
- ✅ Ops manager can see all tasks; specialist sees only their own

---

### Step 11: Create New Case Flow

Build the case creation wizard.

**PROMPT:**

```
[Paste CLAUDE.md]

Build a 'New Case' creation flow for BizOS:

Multi-step modal/wizard with 3 steps:

STEP 1: Basic Info
- Select client (searchable dropdown of client_accounts)
- Mode of transport (ocean, air, truck, rail)
- Priority (low, normal, high, urgent)
- ETA (date picker)
- Reference numbers (text field, optional)
- Business unit (dropdown)

STEP 2: Assign + Notes
- Assigned specialist (dropdown of users with specialist role)
- Initial notes (textarea)
- Select which document types are required for this case
  (pre-populated based on mode but editable)

STEP 3: Review + Create
- Summary of all entered information
- 'Create Case' button

ON CREATE:
- Insert entry_case with status: 'intake'
- Create workflow_event (null → intake)
- Create initial tasks:
  * 'Collect required documents' assigned to specialist
  * 'Review case setup' assigned to ops_manager
- Create audit_event
- Auto-generate case_number
- Redirect to the new case detail page

Use shadcn Dialog, Steps pattern, form validation with Zod.
```

**SUCCESS CRITERIA:**
- ✅ Can create a new case through all 3 wizard steps
- ✅ Case number auto-generates correctly
- ✅ Required doc checklist pre-populates based on transport mode
- ✅ Initial tasks are created automatically
- ✅ Workflow event and audit event are created
- ✅ Redirects to the new case page after creation
- ✅ All form fields validate correctly

---

### Step 12: Audit Trail Viewer

Build a dedicated audit trail page for compliance.

**PROMPT:**

```
[Paste CLAUDE.md]

Build an audit trail viewer at /app/(protected)/audit/page.tsx
(admin and broker_lead roles only)

1. Chronological list of ALL audit_events for the tenant
2. Filters: date range, event_type, entity_type, actor_type,
   specific actor (user or agent name)
3. Search by entity_id or details content
4. Each event shows:
   - Timestamp (formatted nicely)
   - Actor: user name OR agent name with [AI] badge
   - Action: what happened (human-readable)
   - Entity: link to the case/task/document
   - Details: expandable JSON viewer for full details
5. Export button: download filtered results as CSV
6. Pagination (50 per page)

This must be a read-only view. No edit/delete capabilities.
Use shadcn Table, Badge, DatePicker, and Collapsible for details.
```

**SUCCESS CRITERIA:**
- ✅ Audit page shows all events from all previous steps
- ✅ Every case creation, status change, task action, and doc upload is visible
- ✅ Filters narrow results correctly
- ✅ CSV export works and contains all filtered data
- ✅ Only admin and broker_lead can access this page
- ✅ Entity links navigate to the correct case/task/document

---

## PHASE 1 COMPLETE — CHECKPOINT

At this point you have a working multi-tenant application with:
- ✅ Authentication + role-based access
- ✅ Full case lifecycle management with state machine transitions
- ✅ Document upload and storage
- ✅ Task assignment and tracking
- ✅ Complete audit trail

**Before moving to Phase 2, spend a day using it with your seed data.** Create cases, move them through stages, upload documents, create tasks. Find and fix the friction points.

---

## PHASE 2: AI AGENTS LAYER

**Steps 13–18 • Weeks 7–12 • This is where the system starts working FOR you**

---

### Step 13: Agent Infrastructure — The Orchestration Layer

Before building any agents, build the infrastructure they all share.

**PROMPT:**

```
[Paste CLAUDE.md]

Build the AI Agent Orchestration Layer for BizOS. This is the
infrastructure that ALL agents will use. No individual agents yet —
just the framework.

1. Agent Registry (lib/agents/registry.ts):
   - A TypeScript Map that stores agent definitions
   - Each agent definition: id, name, description, type,
     autonomyLevel (L0-L3), tools (string[]), handler function
   - registerAgent() and getAgent() functions

2. Agent Runner (lib/agents/runner.ts):
   - executeAgent(agentId, input, context) function that:
     a) Looks up agent in registry
     b) Calls the agent's handler function
     c) Logs the attempt to ai_action_logs table
     d) Returns the result with confidence score
   - Context includes: tenant_id, user_id (who triggered),
     case_id (if applicable), trigger_event (what caused this)

3. Approval Gateway (lib/agents/approval.ts):
   - checkApprovalRequired(agentId, action, confidence) that
     returns whether human approval is needed based on:
     * Agent's autonomy level
     * Action type (read vs write vs regulatory)
     * Confidence threshold (configurable per agent)
   - If approval required: creates a task of type 'approval'
     assigned to the appropriate role
   - If no approval needed: executes the action directly

4. Claude API Helper (lib/agents/llm.ts):
   - callClaude(systemPrompt, userPrompt, options) function
   - Options: model (default claude-sonnet-4-20250514), maxTokens,
     temperature (default 0 for deterministic), responseFormat
   - Handles: rate limiting, retries with exponential backoff,
     error logging, token usage tracking
   - Returns structured response with usage stats

5. Agent Types (lib/types/agents.ts):
   - TypeScript interfaces for: AgentDefinition, AgentInput,
     AgentOutput, AgentContext, ApprovalRequest, ToolCall

6. API route: POST /api/agents/invoke
   - Accepts: agentId, input, context
   - Calls executeAgent()
   - Returns result
   - Only accessible by authenticated users with appropriate roles

KEY DESIGN DECISIONS:
- All agents are async (return promises)
- All agents must return: output, confidence (0-1), citations []
- All agent invocations are logged BEFORE and AFTER execution
- If Claude API call fails, log error and return graceful failure
- Never throw unhandled exceptions from agent code

This should be production-quality infrastructure, not a prototype.
```

**SUCCESS CRITERIA:**
- ✅ Can register a test agent and invoke it via the API route
- ✅ ai_action_logs table records the invocation with inputs and outputs
- ✅ Approval gateway correctly identifies when approval is needed
- ✅ Claude API helper successfully calls the Anthropic API and returns a response
- ✅ Error handling works: bad API key returns graceful error, not crash
- ✅ Token usage is tracked and logged

**WATCH OUT:**
- ⚠️ Don't build any actual agents yet — this step is ONLY the framework
- ⚠️ Test with a dummy agent that just echoes its input
- ⚠️ Make sure the Claude API key is in .env.local and never committed to git
- ⚠️ The approval gateway is the safety net — test it thoroughly

---

### Step 14: Document Parsing Agent

Your first real AI agent.

**PROMPT:**

```
[Paste CLAUDE.md]

Build the Document Parsing Agent for BizOS. This agent runs when
a new document is uploaded to a case.

Agent Definition:
- ID: 'document-parser'
- Autonomy Level: L0 (all results require human review)
- Trigger: document uploaded (parse_status = 'pending')

Agent Logic (lib/agents/document-parser/index.ts):

1. CLASSIFY the document type:
   - Read the document content (for PDFs, extract text first)
   - Use Claude to classify it as one of our doc_type enums
   - Return confidence score

2. EXTRACT key fields based on document type:
   For commercial_invoice: shipper, consignee, invoice_number,
     invoice_date, currency, total_value, line_items (description,
     quantity, unit_price, total, country_of_origin, HS_code_hint)
   For packing_list: total_packages, gross_weight, net_weight,
     dimensions, package_type
   For bill_of_lading: bl_number, vessel_name, voyage,
     port_of_loading, port_of_discharge, container_numbers
   For airway_bill: awb_number, flight, origin, destination, pieces

3. VALIDATE extracted data against case data:
   - Does the consignee match the client account?
   - Do weights/quantities match across docs?
   - Flag any inconsistencies as alerts

4. UPDATE the document record:
   - Set extracted_data jsonb with all extracted fields
   - Set parse_status to 'completed' or 'failed'
   - Each extracted field must include: value, confidence, source

5. CREATE follow-up items:
   - If confidence < 0.7 on any field: create review task
   - If inconsistencies found: create alert task
   - If document type doesn't match expected: flag it

Claude Prompt Structure:
- System prompt defines the agent's role and output schema
- User prompt includes the document text/content
- Response must be structured JSON matching our schema
- Include explicit instruction: 'If you cannot find evidence for a
  field, set value to null and confidence to 0. Never guess.'

API Integration:
- For PDF text extraction: use pdf-parse npm library
- Fetch the file from Supabase Storage, extract text, send to Claude

Register this agent in the registry.
Trigger: when a document's parse_status is set to 'pending',
invoke this agent.

UI Integration:
- On the case Documents tab, after parsing completes, show:
  * Extracted fields with confidence badges (green >0.85, yellow
    0.7-0.85, red <0.7)
  * 'Accept' / 'Reject' / 'Edit' buttons per field
  * Agent's confidence and reasoning expandable panel
- Human decisions (accept/reject/edit) logged to ai_action_logs
```

**SUCCESS CRITERIA:**
- ✅ Upload a real commercial invoice PDF → agent extracts shipper, amounts, line items
- ✅ Upload a bill of lading → agent extracts BL number, vessel, ports
- ✅ Extracted fields appear in the Documents tab with confidence badges
- ✅ Low-confidence fields are flagged and a review task is auto-created
- ✅ Accept/Reject/Edit buttons work and log human decisions
- ✅ Agent's reasoning chain is viewable in the expandable panel
- ✅ parse_status correctly transitions from pending → processing → completed
- ✅ If document text extraction fails, parse_status = 'failed' with error logged

**HOW TO VALIDATE:**
- 🧪 Upload a blurry/bad scan — agent should return low confidence, not hallucinated values
- 🧪 Upload a document that doesn't match any type — agent should flag it as 'other'
- 🧪 Upload an invoice for a different company than the case client — agent should flag the inconsistency
- 🧪 Check ai_action_logs — every parse attempt should be fully logged

---

### Step 15: Intake Agent (Email → Case)

This agent converts inbound emails into structured case drafts.

**PROMPT:**

```
[Paste CLAUDE.md]

Build the Intake Agent for BizOS. This agent processes inbound emails
and creates draft cases.

For now, simulate email input (actual Gmail integration comes later).
Build the agent so it accepts email-like input.

Agent Definition:
- ID: 'intake-agent'
- Autonomy Level: L0 (creates draft cases that humans must confirm)

Input: { from, to, subject, body, attachmentNames[], clientAccountId? }

Agent Logic:
1. MATCH to client: use email sender address and content to match
   to a client_account. If ambiguous, flag for human selection.
2. EXTRACT case details from email body:
   - Shipment reference numbers
   - Mode of transport
   - ETA or estimated dates
   - Commodity descriptions
   - Special instructions or urgency indicators
3. DETECT duplicates: check for already open cases with similar
   reference numbers or matching ETAs for this client
4. GENERATE draft case + tasks + client response email draft

Output:
  {
    draft_case: { client_id, mode, priority, eta, notes, metadata },
    extracted_fields: [{ field, value, confidence, evidence }],
    missing_fields: [{ field, why_needed, suggested_question }],
    duplicate_candidates: [{ case_id, similarity_reason }],
    suggested_tasks: [{ title, assignee_role, due_hours, priority }],
    client_response_draft: { subject, body },
    risk_flags: string[]
  }

UI: Build an 'Intake Queue' page at /app/(protected)/intake/page.tsx
- Shows pending intake items (AI draft cases awaiting confirmation)
- Each item: email preview, AI's draft, confidence
- Actions: 'Confirm + Create Case', 'Reject', 'Needs More Info'
- Also add a manual 'Test Intake' button to simulate email input

Register in agent registry.
```

**SUCCESS CRITERIA:**
- ✅ Paste a sample customs email → agent creates a reasonable draft case
- ✅ Agent correctly identifies client from email content
- ✅ Missing information is flagged (not invented)
- ✅ Duplicate detection works when a similar case already exists
- ✅ Draft case can be edited before confirming
- ✅ Confirming creates a real case with all standard artifacts
- ✅ Client response email draft is professional and asks for missing docs

---

### Step 16: Classification Support Agent

Advisory agent for HS/HTS code suggestions. PERMANENTLY capped at L0.

**PROMPT:**

```
[Paste CLAUDE.md]

Build the Classification Support Agent for BizOS.

Agent Definition:
- ID: 'classification-support'
- Autonomy Level: L0 PERMANENTLY (never auto-approves)
- This agent is ADVISORY ONLY. A licensed broker must approve.

Input: product description, materials, use, composition from
  extracted document data + client commodity profile

Agent Logic:
1. Analyze product description and attributes
2. Suggest top 3 candidate HTS codes with:
   - Code + description
   - Confidence score
   - Rationale
   - 'Why it might be wrong' section for each
3. List disambiguating questions to increase confidence
4. Check client's historical classifications for similar products
5. If confidence < 0.75 on all candidates, REQUIRE Licensed Broker
   Review task

UI: Add a 'Classification' tab to the case detail page:
- Line items from commercial invoice
- Per line item: 'Get HTS Suggestions' button
- Shows candidates with rationale in expandable cards
- 'Approve Code' button (only for is_licensed_broker users)
- Approved codes saved to the case

Claude System Prompt must include:
- 'You are an advisory classification assistant. You do NOT make
  final classification decisions.'
- 'Always provide multiple candidates.'
- 'Include the General Rules of Interpretation in your reasoning.'
```

**SUCCESS CRITERIA:**
- ✅ Agent returns 2-3 candidate codes with rationale
- ✅ Each candidate has a 'why it might be wrong' section
- ✅ Low-confidence results auto-create a broker review task
- ✅ Only licensed broker users can approve codes
- ✅ Approved codes are saved and logged

---

### Step 17: Ops Coordinator Agent

Monitors all open cases, detects SLA breaches, takes action.

**PROMPT:**

```
[Paste CLAUDE.md]

Build the Ops Coordinator Agent. This one runs on a SCHEDULE.

Agent Definition:
- ID: 'ops-coordinator'
- Autonomy Level: L1 (can create tasks without approval;
  cannot change case status without approval)

Agent Logic (runs every 15 minutes):

1. DETECT stuck cases by SLA threshold per status:
   - intake: 2 hours
   - awaiting_docs: 24 hours
   - docs_validated: 4 hours
   - classification_review: 8 hours
   - entry_prep: 4 hours
   - govt_review: 48 hours
   - hold: 24 hours
   - released: 4 hours
   - billing: 24 hours

2. DETECT overdue tasks past due_at

3. DETECT missing documents: cases in awaiting_docs > 24h
   with no uploads in last 12 hours

4. For each issue, take action:
   - Stuck < 2x SLA: create task for assigned user
   - Stuck >= 2x SLA: escalate to ops_manager
   - Overdue task < 24h: bump priority to high
   - Overdue task >= 24h: escalate to ops_manager

5. GENERATE daily digest summary

Implementation:
- API route: POST /api/agents/ops-coordinator/run
- Add a 'Run Ops Check' button on dashboard for testing
- Agent must be idempotent: no duplicate tasks for same issue

UI: Add 'AI Exceptions' section to dashboard
```

**SUCCESS CRITERIA:**
- ✅ Agent correctly identifies stuck cases from seed data
- ✅ Tasks are created with correct assignees
- ✅ Running again does NOT create duplicates
- ✅ Escalation logic works for cases stuck > 2x SLA
- ✅ Daily digest is generated with accurate metrics

---

### Step 18: Finance Agent + Client Comms Agent

Two agents that round out core operations.

**PROMPT:**

```
[Paste CLAUDE.md]

Build TWO agents:

=== FINANCE AGENT ===
- ID: 'finance-agent'
- Autonomy Level: L0
- Trigger: case status changes to 'billing'

Logic:
1. Look up client billing terms and rate card
2. Calculate charges based on case attributes
3. Generate invoice draft with line items
4. Create task: 'Review + Send Invoice' for finance role

Store draft invoice in case metadata for now.

=== CLIENT COMMS AGENT ===
- ID: 'client-comms'
- Autonomy Level: L0
- Trigger: various case events

Generates email drafts for:
1. Missing documents request
2. Status update (submitted, released)
3. Hold notification
4. Clearance notification

Each draft should use client contact name, reference case details,
be professional, and never include sensitive regulatory details.

UI: Add 'Communications' section to case detail page:
- AI-drafted emails pending review
- 'Edit + Send' and 'Discard' buttons
- Sent messages log

Register both agents.
```

**SUCCESS CRITERIA:**
- ✅ Moving case to 'billing' triggers Finance Agent with invoice draft
- ✅ Invoice has reasonable line items
- ✅ Review task created for finance role
- ✅ Client Comms generates appropriate emails for each scenario
- ✅ Emails reference correct case details
- ✅ Drafts are editable before sending
- ✅ All agent actions logged

---

## PHASE 2 COMPLETE — CHECKPOINT

You now have 5 working AI agents:
- **Document Parser:** classifies and extracts data from uploaded documents
- **Intake Agent:** converts emails into structured case drafts
- **Classification Support:** suggests HTS codes with rationale
- **Ops Coordinator:** monitors SLAs and creates tasks/escalations
- **Finance + Client Comms:** drafts invoices and client emails

**VALIDATE:** Run through an entire case lifecycle with agents active.

---

## PHASE 3: INTEGRATIONS + CLIENT PORTAL

**Steps 19–30 • Weeks 13–20**

| Step | What You Build | Key Focus |
|------|---------------|-----------|
| 19 | Email Integration (Gmail API) | OAuth2 flow, email sync, auto-trigger Intake Agent |
| 20 | Email Sending (outbound) | Send AI-drafted emails through Gmail with tracking |
| 21 | Client Portal: Auth + Shell | Separate auth flow for clients, portal layout |
| 22 | Client Portal: Case View + Doc Upload | Client sees cases, uploads docs, views timeline |
| 23 | Client Portal: Messages + Notifications | Threaded messages between client and brokerage |
| 24 | Finance: Invoice Table + PDF Generation | Proper invoices table, PDF gen, payment tracking |
| 25 | Finance: QuickBooks Integration | Sync invoices + payments to QBO via REST API |
| 26 | Reporting: Executive Dashboards | Portfolio metrics, trends, agent performance |
| 27 | Executive Brief Agent | Daily auto-generated executive summary |
| 28 | Filing Packet Builder | Assemble validated filing packet from case data |
| 29 | EDI Bridge: Provider Integration POC | Connect to filing provider for submission status |
| 30 | Agent Performance Dashboard | Accuracy, confidence calibration, approval rates |

For each step, use the same prompt pattern from Phase 1-2.

---

## PHASE 4: SCALE + EXPAND

**Steps 31–48 • Weeks 21–36**

| Step | What You Build | Key Focus |
|------|---------------|-----------|
| 31 | Multi-Tenant Admin Dashboard | Create/manage tenants, cross-tenant analytics |
| 32 | Onboarding Agent | Auto-configure new tenants from discovery docs |
| 33 | Data Migration Pipelines | ETL tools for importing from legacy systems |
| 34 | Acquisition Playbook Automation | 100-day checklist as tracked workflow |
| 35 | Agent Autonomy Promotion Pipeline | Automated accuracy scoring + promotion logic |
| 36 | A/B Prompt Testing Framework | Test prompt variants on production traffic |
| 37 | Institutional Memory System | Vector store for patterns, preferences, precedents |
| 38 | Self-Improving Validation Rules | Auto-generate rules from error patterns |
| 39 | Skill/Plugin Framework v1 | Hot-swappable agent capabilities with manifests |
| 40 | ISF (10+2) Adapter | ISF data model, deadline calculator, filing agent |
| 41 | PGA Message Set Adapter | Agency-specific data for regulated commodities |
| 42 | Freight Forwarding Adapter | Booking, consolidation, BL workflow extensions |
| 43 | Drayage/Trucking Adapter | Dispatch, appointment, driver comms extensions |
| 44 | Carrier Tracking Integration | FedEx/UPS/Maersk API for shipment visibility |
| 45 | Advanced Reporting + BI | Custom report builder, scheduled reports |
| 46 | SOC 2 Readiness Checklist | Systematic compliance preparation |
| 47 | Mobile-Responsive Polish | Full mobile experience for field specialists |
| 48 | Production Hardening | Performance, error monitoring, backup verification |

---

## Appendix A: Prompt Engineering Tips

### When the AI Gives You Broken Code

1. Copy the **exact** error message (including stack trace).
2. Paste it back: *'I got this error when running the code. Here's the error: [paste]. Here's the file: [paste]. Fix it.'*
3. If the fix also fails: *'That fix didn't work. Let's take a different approach. What are the possible causes?'*
4. After 3 attempts, start a new session with fresh context.

### How to Write Better Prompts

- **ALWAYS** start with project context (CLAUDE.md handles this in Claude Code)
- Be **SPECIFIC** about file paths
- Specify the **EXACT** queries you want
- Show existing types/interfaces
- Ask for **COMPLETE** files, not snippets
- One feature per prompt
- Test **BEFORE** moving on

### When to Use Different AI Tools

| Task | Best Tool | Why |
|------|-----------|-----|
| Architecture, schema design | Claude (chat) | Needs long context and reasoning |
| Building pages/components | Claude Code (terminal) | Sees your whole codebase |
| Debugging errors | Claude Code (terminal) | Can read actual files |
| Complex SQL migrations | Claude (chat) | Better at precise SQL |
| AI agent prompts | Claude (chat) | Understands its own capabilities |
| Simple additions | Claude Code (terminal) | Fast in-context edits |
| Security review | Claude (chat) | Best at reasoning about implications |

---

## Appendix B: Test Scenarios

### Scenario 1: Happy Path Ocean Import

1. Receive email from TechGlobal Inc about a container of laptops at LAX via ocean.
2. Intake Agent creates a draft case with mode=ocean, client=TechGlobal.
3. Specialist confirms the case → moves to 'awaiting_docs'.
4. Client uploads: commercial invoice, packing list, bill of lading.
5. Document Agent parses all three, extracts fields, flags no issues.
6. Specialist moves case to 'classification_review'.
7. Classification Agent suggests HTS 8471.30 (laptops) with 0.92 confidence.
8. Licensed broker approves the classification.
9. Case moves through entry_prep → submitted → govt_review → released.
10. Finance Agent generates invoice draft. Finance team reviews and sends.
11. Case moves to 'closed'. Full audit trail is complete.

### Scenario 2: Exception Path — Missing Docs + Hold

1. New case for FreshFoods LLC — perishable goods via air.
2. Only airway bill uploaded. Commercial invoice and packing list missing.
3. Ops Coordinator detects case stuck in 'awaiting_docs' > 24h.
4. Client Comms Agent drafts missing-docs email to client.
5. Specialist reviews and sends.
6. Client uploads remaining docs. Document Agent parses them.
7. Inconsistency detected: invoice value doesn't match packing list weight.
8. Alert task created for specialist to resolve.
9. After resolution, case moves through classification → submitted.
10. Government issues a hold. Case moves to 'hold'.
11. Client Comms Agent drafts hold notification. Specialist sends.
12. Hold resolved, case proceeds to release and billing.

---

**End of Playbook**

*BizOS • AI Build Playbook v1.0 • March 2026*
