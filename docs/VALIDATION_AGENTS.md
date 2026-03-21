# Phase 5: AI Agent Validation Report

**Date:** 2026-03-21
**Environment:** localhost:3000 (dev server), Supabase cloud, Anthropic API (claude-sonnet-4-20250514)
**Auth method:** Cookie-based Supabase SSR auth, signed in as `admin@acme.com`

---

## 5.1 Agent Registry PASS

All 9 agents confirmed registered and accessible via `/api/agents/invoke`:

| Agent ID | Status |
|---|---|
| echo | REGISTERED |
| document-parser | REGISTERED |
| intake-agent | REGISTERED |
| classification-support | REGISTERED |
| ops-coordinator | REGISTERED |
| finance-agent | REGISTERED |
| client-comms | REGISTERED |
| executive-brief | REGISTERED |
| onboarding | REGISTERED |

`initializeAgents()` is called at the top of each API route, ensuring all agents are available. The registry uses a `Map<string, AgentDefinition>` with guard against duplicate registration.

---

## 5.2 Agent Invocation Logging PASS

**Test:** Invoked echo agent via `POST /api/agents/invoke`

- HTTP 200, `success: true`
- Echo returned input data, trigger, and timestamp
- `logId: 6e7afaf3-c87d-4e9d-9ac6-bd3204c56c12` returned
- Verified log entry in `ai_action_logs` table:
  - `agent_type: "echo"`
  - `action: "Echo Agent invoked: manual_test"`
  - `confidence: 1`
- Approval task also created (approval flow is active for all write actions)

---

## 5.4 Intake Agent FAIL

**Test:** Invoked with brake pad shipment email from `john@autoparts.com`

**Result:** `success: false`
**Error:** `Unexpected token '\`', "\`\`\`json\n{\n"... is not valid JSON`

**Root cause:** The Claude API returns JSON wrapped in markdown code fences (`` ```json ... ``` ``), but `handleIntake` calls `JSON.parse(llmResponse.content)` directly without stripping code fences. The system prompt says "Respond with valid JSON" but does not explicitly instruct "no markdown code fences."

**Note:** The agent logic itself (client matching, field extraction, duplicate detection, missing field identification) is well-structured. The intake prompt correctly includes known clients, contacts, and recent cases for context. The issue is purely in JSON response parsing.

**Bug location:** `lib/agents/intake/index.ts` line 118

---

## 5.6 Classification Agent FAIL

**Test:** Invoked with "Ceramic brake pads for passenger vehicles, made of ceramic composite material with steel backing plates"

**Result:** `success: false`
**Error:** `Unexpected token '\`', "\`\`\`json\n{\n"... is not valid JSON`

**Root cause:** Same JSON parsing bug as intake agent. `lib/agents/classification/index.ts` line 126 calls `JSON.parse()` without stripping markdown fences.

**Note:** The classification agent design is solid -- it queries historical approved classifications, fetches client commodity profiles, creates broker review tasks when confidence < 0.75, and the prompt correctly requests GRI rule references and multiple candidates. The system prompt explicitly says "PERMANENTLY L0 -- never auto-approves."

**Bug location:** `lib/agents/classification/index.ts` line 126

---

## 5.9 Ops Coordinator PASS

**Test:** Invoked via `POST /api/agents/ops-coordinator/run` (two consecutive runs)

**Run 1 results:**
- `success: true`
- Stuck cases detected: 4
- Overdue tasks detected: 4
- Missing docs cases: 0
- Total active cases: 10
- Tasks created: 0 (tasks from previous runs already exist)

**Idempotency test (Run 2):**
- Tasks created: 0
- Idempotent: YES -- the agent checks for existing `[Ops Agent]` tasks before creating duplicates

**Audit trail:**
- `audit_events` table has entries with `event_type: "ops_coordinator.run"`

**Design notes:**
- SLA thresholds defined per status (intake: 2h, awaiting_docs: 24h, govt_review: 48h, etc.)
- Severity escalation: warning at 1x SLA, escalation at 2x SLA
- Escalations assigned to ops_manager, warnings to case assignee
- Does NOT use LLM (pure deterministic logic), so no JSON parsing issue

---

## 5.11 Finance Agent FAIL

**Test:** Invoked for case `acme-2026-00001` (released, ocean, TechGlobal Inc)

**Result:** `success: false`
**Error:** `Unexpected token '\`', "\`\`\`json\n{\n"... is not valid JSON`

**Root cause:** Same markdown code fence JSON parsing bug. `lib/agents/finance/index.ts` line 87.

**Note:** The finance agent design includes: fetching client billing terms, extracting data from parsed documents, incorporating approved HTS classifications, creating review tasks for finance role users, and storing draft invoices in case metadata.

**Bug location:** `lib/agents/finance/index.ts` line 87

---

## 5.12 Client Comms Agent FAIL

**Test:** Invoked for case `acme-2026-00003` (awaiting_docs, ocean, FreshFoods LLC) with `eventType: "missing_documents"`

**Result:** `success: false`
**Error:** `Unexpected token '\`', "\`\`\`json\n{\n"... is not valid JSON`

**Root cause:** Same markdown code fence JSON parsing bug. `lib/agents/client-comms/index.ts` line 122.

**Note:** The comms agent correctly: identifies required documents by transport mode, determines which are missing, fetches primary contact info, and stores drafts in case metadata. Supports four event types: missing_documents, status_update, hold_notification, clearance_notification.

**Bug location:** `lib/agents/client-comms/index.ts` line 122

---

## 5.13 Error Handling PASS

**Verified via code review:**

| Component | try/catch | Details |
|---|---|---|
| Agent runner (`runner.ts`) | YES | Catches handler errors, logs failure to `ai_action_logs`, returns structured error |
| LLM client (`llm.ts`) | YES | 3 retries with exponential backoff, skips retry on 401/auth errors |
| Intake agent | YES | Returns `{ success: false, error }` on exception |
| Classification agent | YES | Same pattern |
| Finance agent | YES | Same pattern |
| Client comms agent | YES | Same pattern |
| Document parser agent | YES | Same pattern |
| Executive brief agent | YES | Same pattern |
| Ops coordinator | N/A | No LLM calls; uses null coalescing (`?? []`, `?? 0`) for safety |
| All 6 API routes | YES | Catch errors and return 500 with message |

---

## Summary

| Test | Result | Notes |
|---|---|---|
| 5.1 Agent Registry | PASS | All 9 agents registered |
| 5.2 Echo + Logging | PASS | Invocation logged to `ai_action_logs` |
| 5.4 Intake Agent | FAIL | JSON parsing -- markdown code fences not stripped |
| 5.6 Classification Agent | FAIL | Same JSON parsing bug |
| 5.9 Ops Coordinator | PASS | Stuck detection, idempotency, audit trail all working |
| 5.11 Finance Agent | FAIL | Same JSON parsing bug |
| 5.12 Client Comms Agent | FAIL | Same JSON parsing bug |
| 5.13 Error Handling | PASS | All agents and routes have proper try/catch |

**Overall: 4 PASS, 4 FAIL**

---

## Critical Bug: JSON Parsing of LLM Responses

**Severity:** HIGH -- affects all 5 LLM-powered agents (intake, classification, finance, client-comms, document-parser, executive-brief)

**Problem:** All agents call `JSON.parse(llmResponse.content)` directly. The Claude API (claude-sonnet-4-20250514) frequently returns JSON wrapped in markdown code fences (`` ```json\n{...}\n``` ``), causing `SyntaxError`.

**Affected files:**
- `lib/agents/intake/index.ts:118`
- `lib/agents/classification/index.ts:126`
- `lib/agents/finance/index.ts:87`
- `lib/agents/client-comms/index.ts:122`
- `lib/agents/document-parser/index.ts:109`
- `lib/agents/executive-brief/index.ts:152`

**Recommended fix:** Add a `stripCodeFences()` utility to `lib/agents/llm.ts`:
```typescript
export function extractJSON(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  return fenced ? fenced[1].trim() : raw.trim();
}
```
Then replace `JSON.parse(llmResponse.content)` with `JSON.parse(extractJSON(llmResponse.content))` in all agents.

**Note:** The `onboarding` agent already includes `"Return ONLY valid JSON. No markdown code fences"` in its system prompt, but this is not reliable -- the fix should be in the parsing layer, not the prompt.
