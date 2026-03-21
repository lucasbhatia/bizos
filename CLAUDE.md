# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

## Build Playbook
Full step-by-step build plan is in docs/BUILD_PLAYBOOK.md.
Always reference it before starting a new step.

## Architecture Rules
- tenant_id on EVERY table. RLS enforced. No exceptions.
- Workflow = deterministic state machine. No free-form status changes.
- AI agents start at L0 (advisory). Human approves all actions.
- All agent actions logged to ai_action_logs with confidence + citations.
- audit_events is APPEND-ONLY. No updates, no deletes.
- Server Components by default. "use client" only when interactive.

## Commands
- `npm run dev` — start dev server
- `npm run build` — production build (run before every commit)
- `npm run lint` — ESLint
- `npm run test` — run tests (Vitest)
- `npm run test:watch` — run tests in watch mode
- `npx supabase` — Supabase CLI
- `npx tsx scripts/<name>.ts` — run TypeScript scripts

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
- Phase: 2 (AI Agents Layer)
- Next: Step 16
- Completed: Steps 1–15

## Build Log
- [2026-03-20] Step 1: Project initialization ✓ (commit 49130cd)
- [2026-03-20] Step 2: Database schema v1 ✓ (commit 4e1ea6e)
- [2026-03-20] Step 3: Authentication flow ✓ (commit ecdb654)
- [2026-03-20] Step 4: Seed script ✓ (commit 2126bef)
- [2026-03-20] Step 5: Sidebar navigation ✓ (commit 09e9885)
- [2026-03-20] Step 6: Dashboard ✓ (commit 7cae1ed)
- [2026-03-20] Step 7: Cases list page ✓ (commit 3daa042)
- [2026-03-20] Step 8: Case detail page ✓ (commit bcea3b8)
- [2026-03-20] Step 9: Document upload ✓ (commit a872c8f)
- [2026-03-20] Step 10: Task system ✓ (commit 7568801)
- [2026-03-20] Step 11: New case wizard ✓ (commit 641d81f)
- [2026-03-20] Step 12: Audit trail ✓ (commit eecd124)
- [2026-03-20] Step 13: Agent infrastructure ✓ (commit 910d824)
- [2026-03-20] Step 14: Document parsing agent ✓ (commit 5521a5b)
- [2026-03-20] Step 15: Intake agent ✓ (commit f2b7426)

## Build Rules
- After EVERY step: run /step-complete to commit and update status
- Before EVERY step: run /step-start to verify clean state
- If something breaks: run /health-check before debugging
- Never skip validation. Always `npm run build` before committing.
- One step at a time. Don't combine multiple playbook steps.
