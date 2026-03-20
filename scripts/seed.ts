/**
 * Seed script for BizOS development environment.
 * Creates a complete tenant with users, clients, cases, documents, tasks, and audit events.
 *
 * Usage: npx tsx scripts/seed.ts
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  console.error("Set these in .env.local before running the seed script.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Pre-generated UUIDs for referential integrity
const TENANT_ID = randomUUID();
const BU_LAX_ID = randomUUID();
const BU_JFK_ID = randomUUID();
const CLIENT_TECHGLOBAL_ID = randomUUID();
const CLIENT_FRESHFOODS_ID = randomUUID();
const CLIENT_AUTOPARTS_ID = randomUUID();

// User IDs will be set after auth user creation
const userIds: Record<string, string> = {};

const USERS = [
  { email: "admin@acme.com", full_name: "Sarah Chen", role: "admin" as const, is_licensed_broker: true, password: "password123" },
  { email: "ops@acme.com", full_name: "Marcus Johnson", role: "ops_manager" as const, is_licensed_broker: false, password: "password123" },
  { email: "specialist1@acme.com", full_name: "Emily Rodriguez", role: "specialist" as const, is_licensed_broker: false, password: "password123" },
  { email: "specialist2@acme.com", full_name: "David Kim", role: "specialist" as const, is_licensed_broker: false, password: "password123" },
  { email: "finance@acme.com", full_name: "Rachel Thompson", role: "finance" as const, is_licensed_broker: false, password: "password123" },
];

async function createAuthUsers() {
  console.log("Creating auth users...");
  for (const user of USERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
    });
    if (error) {
      // User may already exist
      if (error.message.includes("already")) {
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existing = existingUsers.users.find((u) => u.email === user.email);
        if (existing) {
          userIds[user.email] = existing.id;
          console.log(`  User ${user.email} already exists (${existing.id})`);
          continue;
        }
      }
      console.error(`  Failed to create ${user.email}:`, error.message);
      continue;
    }
    userIds[user.email] = data.user.id;
    console.log(`  Created ${user.email} (${data.user.id})`);
  }
}

async function seed() {
  console.log("Starting BizOS seed...\n");

  // 1. Create auth users
  await createAuthUsers();

  // 2. Create tenant
  console.log("\nCreating tenant...");
  const { error: tenantErr } = await supabase.from("tenants").upsert({
    id: TENANT_ID,
    name: "Acme Customs Brokerage",
    slug: "acme",
    timezone: "America/Los_Angeles",
    settings: { default_currency: "USD", require_dual_approval: true },
  });
  if (tenantErr) console.error("Tenant error:", tenantErr.message);
  else console.log("  Created: Acme Customs Brokerage");

  // 3. Create user profiles
  console.log("\nCreating user profiles...");
  for (const user of USERS) {
    const uid = userIds[user.email];
    if (!uid) continue;
    const { error } = await supabase.from("users").upsert({
      id: uid,
      tenant_id: TENANT_ID,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_licensed_broker: user.is_licensed_broker,
    });
    if (error) console.error(`  Profile error for ${user.email}:`, error.message);
    else console.log(`  ${user.full_name} (${user.role})`);
  }

  // 4. Business units
  console.log("\nCreating business units...");
  const businessUnits = [
    { id: BU_LAX_ID, tenant_id: TENANT_ID, name: "LAX Port Office", location: "Los Angeles, CA", port_code: "2704" },
    { id: BU_JFK_ID, tenant_id: TENANT_ID, name: "JFK Port Office", location: "New York, NY", port_code: "4601" },
  ];
  const { error: buErr } = await supabase.from("business_units").upsert(businessUnits);
  if (buErr) console.error("BU error:", buErr.message);
  else console.log("  Created LAX and JFK offices");

  // 5. Client accounts
  console.log("\nCreating client accounts...");
  const clients = [
    {
      id: CLIENT_TECHGLOBAL_ID,
      tenant_id: TENANT_ID,
      name: "TechGlobal Inc",
      importer_of_record_number: "IOR-TG-2024-001",
      default_commodity_profile: { primary_hts: "8471", category: "electronics", avg_value_per_shipment: 250000 },
      billing_terms: { payment_terms: "Net 30", rate_type: "per_entry", rate: 185 },
      sop_notes: "Always verify FCC compliance certificates. Client requires same-day entry filing on urgent shipments.",
    },
    {
      id: CLIENT_FRESHFOODS_ID,
      tenant_id: TENANT_ID,
      name: "FreshFoods LLC",
      importer_of_record_number: "IOR-FF-2024-015",
      default_commodity_profile: { primary_hts: "0804", category: "perishable_goods", avg_value_per_shipment: 75000 },
      billing_terms: { payment_terms: "Net 15", rate_type: "per_entry", rate: 225 },
      sop_notes: "FDA prior notice required. Temperature-sensitive cargo — flag any arrival delays immediately.",
    },
    {
      id: CLIENT_AUTOPARTS_ID,
      tenant_id: TENANT_ID,
      name: "AutoParts Direct",
      importer_of_record_number: "IOR-AP-2024-033",
      default_commodity_profile: { primary_hts: "8708", category: "auto_parts", avg_value_per_shipment: 120000 },
      billing_terms: { payment_terms: "Net 30", rate_type: "per_entry", rate: 165 },
      sop_notes: "DOT compliance certificates required for safety equipment. Anti-dumping duties may apply on brake rotors from China.",
    },
  ];
  const { error: clientErr } = await supabase.from("client_accounts").upsert(clients);
  if (clientErr) console.error("Client error:", clientErr.message);
  else console.log("  Created 3 client accounts");

  // 6. Contacts
  console.log("\nCreating contacts...");
  const contacts = [
    { tenant_id: TENANT_ID, client_account_id: CLIENT_TECHGLOBAL_ID, name: "James Wong", email: "jwong@techglobal.com", phone: "+1-310-555-0101", role: "Logistics Manager", is_primary: true },
    { tenant_id: TENANT_ID, client_account_id: CLIENT_TECHGLOBAL_ID, name: "Lisa Park", email: "lpark@techglobal.com", phone: "+1-310-555-0102", role: "VP Supply Chain", is_primary: false },
    { tenant_id: TENANT_ID, client_account_id: CLIENT_FRESHFOODS_ID, name: "Carlos Mendez", email: "cmendez@freshfoods.com", phone: "+1-212-555-0201", role: "Import Coordinator", is_primary: true },
    { tenant_id: TENANT_ID, client_account_id: CLIENT_FRESHFOODS_ID, name: "Anna Brooks", email: "abrooks@freshfoods.com", phone: "+1-212-555-0202", role: "Compliance Officer", is_primary: false },
    { tenant_id: TENANT_ID, client_account_id: CLIENT_AUTOPARTS_ID, name: "Mike Chen", email: "mchen@autoparts.com", phone: "+1-718-555-0301", role: "Purchasing Director", is_primary: true },
  ];
  const { error: contactErr } = await supabase.from("contacts").upsert(contacts);
  if (contactErr) console.error("Contact error:", contactErr.message);
  else console.log("  Created 5 contacts");

  // 7. Entry cases
  console.log("\nCreating entry cases...");
  const specialist1Id = userIds["specialist1@acme.com"];
  const specialist2Id = userIds["specialist2@acme.com"];

  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
  const daysFromNow = (d: number) => new Date(now.getTime() + d * 86400000).toISOString();

  const cases = [
    { id: randomUUID(), tenant_id: TENANT_ID, client_account_id: CLIENT_TECHGLOBAL_ID, business_unit_id: BU_LAX_ID, assigned_user_id: specialist1Id, case_number: "acme-2026-00001", mode_of_transport: "ocean", status: "released", eta: daysAgo(10), actual_arrival: daysAgo(9), risk_score: 0.15, priority: "normal", metadata: { reference: "PO-TG-2026-001" }, created_at: daysAgo(15) },
    { id: randomUUID(), tenant_id: TENANT_ID, client_account_id: CLIENT_TECHGLOBAL_ID, business_unit_id: BU_LAX_ID, assigned_user_id: specialist1Id, case_number: "acme-2026-00002", mode_of_transport: "air", status: "govt_review", eta: daysAgo(2), actual_arrival: daysAgo(1), risk_score: 0.4, priority: "high", metadata: { reference: "PO-TG-2026-045" }, created_at: daysAgo(5) },
    { id: randomUUID(), tenant_id: TENANT_ID, client_account_id: CLIENT_FRESHFOODS_ID, business_unit_id: BU_JFK_ID, assigned_user_id: specialist2Id, case_number: "acme-2026-00003", mode_of_transport: "ocean", status: "awaiting_docs", eta: daysFromNow(3), risk_score: 0.25, priority: "urgent", metadata: { reference: "PO-FF-2026-012", fda_notice: true }, created_at: daysAgo(3) },
    { id: randomUUID(), tenant_id: TENANT_ID, client_account_id: CLIENT_FRESHFOODS_ID, business_unit_id: BU_JFK_ID, assigned_user_id: specialist2Id, case_number: "acme-2026-00004", mode_of_transport: "air", status: "classification_review", eta: daysFromNow(1), risk_score: 0.6, priority: "high", metadata: { reference: "PO-FF-2026-018" }, created_at: daysAgo(4) },
    { id: randomUUID(), tenant_id: TENANT_ID, client_account_id: CLIENT_AUTOPARTS_ID, business_unit_id: BU_LAX_ID, assigned_user_id: specialist1Id, case_number: "acme-2026-00005", mode_of_transport: "ocean", status: "entry_prep", eta: daysFromNow(2), risk_score: 0.7, priority: "normal", metadata: { reference: "PO-AP-2026-007", anti_dumping_review: true }, created_at: daysAgo(6) },
    { id: randomUUID(), tenant_id: TENANT_ID, client_account_id: CLIENT_AUTOPARTS_ID, business_unit_id: BU_LAX_ID, assigned_user_id: specialist2Id, case_number: "acme-2026-00006", mode_of_transport: "truck", status: "intake", eta: daysFromNow(5), risk_score: 0.1, priority: "low", metadata: { reference: "PO-AP-2026-011" }, created_at: daysAgo(1) },
    { id: randomUUID(), tenant_id: TENANT_ID, client_account_id: CLIENT_TECHGLOBAL_ID, business_unit_id: BU_JFK_ID, assigned_user_id: specialist1Id, case_number: "acme-2026-00007", mode_of_transport: "air", status: "hold", eta: daysAgo(4), actual_arrival: daysAgo(3), risk_score: 0.85, priority: "urgent", metadata: { reference: "PO-TG-2026-052", hold_reason: "CBP exam" }, created_at: daysAgo(7) },
    { id: randomUUID(), tenant_id: TENANT_ID, client_account_id: CLIENT_FRESHFOODS_ID, business_unit_id: BU_JFK_ID, assigned_user_id: specialist2Id, case_number: "acme-2026-00008", mode_of_transport: "ocean", status: "billing", eta: daysAgo(12), actual_arrival: daysAgo(11), risk_score: 0.2, priority: "normal", metadata: { reference: "PO-FF-2026-005" }, created_at: daysAgo(18) },
    { id: randomUUID(), tenant_id: TENANT_ID, client_account_id: CLIENT_AUTOPARTS_ID, business_unit_id: BU_LAX_ID, assigned_user_id: specialist1Id, case_number: "acme-2026-00009", mode_of_transport: "rail", status: "submitted", eta: daysAgo(1), actual_arrival: daysAgo(0), risk_score: 0.35, priority: "normal", metadata: { reference: "PO-AP-2026-019" }, created_at: daysAgo(8) },
    { id: randomUUID(), tenant_id: TENANT_ID, client_account_id: CLIENT_TECHGLOBAL_ID, business_unit_id: BU_LAX_ID, assigned_user_id: specialist2Id, case_number: "acme-2026-00010", mode_of_transport: "ocean", status: "docs_validated", eta: daysFromNow(4), risk_score: 0.3, priority: "normal", metadata: { reference: "PO-TG-2026-060" }, created_at: daysAgo(2) },
  ];

  const { error: caseErr } = await supabase.from("entry_cases").upsert(cases);
  if (caseErr) console.error("Case error:", caseErr.message);
  else console.log(`  Created ${cases.length} entry cases`);

  // 8. Workflow events (status progressions)
  console.log("\nCreating workflow events...");
  const opsId = userIds["ops@acme.com"];
  const workflowEvents: {
    tenant_id: string;
    entry_case_id: string;
    from_status: string | null;
    to_status: string;
    triggered_by_user_id: string | undefined;
    reason: string | null;
    created_at: string;
  }[] = [];

  // Case 1: released (full progression)
  const case1Statuses = ["intake", "awaiting_docs", "docs_validated", "classification_review", "entry_prep", "submitted", "govt_review", "released"];
  for (let i = 0; i < case1Statuses.length; i++) {
    workflowEvents.push({
      tenant_id: TENANT_ID,
      entry_case_id: cases[0].id,
      from_status: i === 0 ? null : case1Statuses[i - 1],
      to_status: case1Statuses[i],
      triggered_by_user_id: i < 2 ? opsId : specialist1Id,
      reason: null,
      created_at: daysAgo(15 - i * 2),
    });
  }

  // Case 7: on hold (went through to govt_review then hold)
  const case7Statuses = ["intake", "awaiting_docs", "docs_validated", "classification_review", "entry_prep", "submitted", "govt_review", "hold"];
  for (let i = 0; i < case7Statuses.length; i++) {
    workflowEvents.push({
      tenant_id: TENANT_ID,
      entry_case_id: cases[6].id,
      from_status: i === 0 ? null : case7Statuses[i - 1],
      to_status: case7Statuses[i],
      triggered_by_user_id: specialist1Id,
      reason: i === 7 ? "CBP intensive exam ordered" : null,
      created_at: daysAgo(7 - i),
    });
  }

  // Other cases: just the progression to current status
  const caseProgressions: [number, string[]][] = [
    [1, ["intake", "awaiting_docs", "docs_validated", "classification_review", "entry_prep", "submitted", "govt_review"]],
    [2, ["intake", "awaiting_docs"]],
    [3, ["intake", "awaiting_docs", "docs_validated", "classification_review"]],
    [4, ["intake", "awaiting_docs", "docs_validated", "classification_review", "entry_prep"]],
    [5, ["intake"]],
    [7, ["intake", "awaiting_docs", "docs_validated", "classification_review", "entry_prep", "submitted", "govt_review", "released", "billing"]],
    [8, ["intake", "awaiting_docs", "docs_validated", "classification_review", "entry_prep", "submitted"]],
    [9, ["intake", "awaiting_docs", "docs_validated"]],
  ];

  for (const [caseIdx, statuses] of caseProgressions) {
    for (let i = 0; i < statuses.length; i++) {
      workflowEvents.push({
        tenant_id: TENANT_ID,
        entry_case_id: cases[caseIdx].id,
        from_status: i === 0 ? null : statuses[i - 1],
        to_status: statuses[i],
        triggered_by_user_id: specialist1Id,
        reason: null,
        created_at: daysAgo(cases[caseIdx].created_at ? 10 - i : 5 - i),
      });
    }
  }

  const { error: wfErr } = await supabase.from("workflow_events").insert(workflowEvents);
  if (wfErr) console.error("Workflow error:", wfErr.message);
  else console.log(`  Created ${workflowEvents.length} workflow events`);

  // 9. Documents (metadata only, no actual files)
  console.log("\nCreating document metadata...");
  const documents = [
    // Case 1 (released) - complete docs
    { tenant_id: TENANT_ID, entry_case_id: cases[0].id, uploaded_by_user_id: specialist1Id, doc_type: "commercial_invoice", file_name: "TG-2026-001-CI.pdf", storage_path: `${TENANT_ID}/${cases[0].id}/commercial_invoice/TG-2026-001-CI.pdf`, file_hash: "abc123", file_size_bytes: 245000, parse_status: "completed", extracted_data: { invoice_number: "INV-2026-001", total_value: 248500, currency: "USD" } },
    { tenant_id: TENANT_ID, entry_case_id: cases[0].id, uploaded_by_user_id: specialist1Id, doc_type: "packing_list", file_name: "TG-2026-001-PL.pdf", storage_path: `${TENANT_ID}/${cases[0].id}/packing_list/TG-2026-001-PL.pdf`, file_hash: "def456", file_size_bytes: 180000, parse_status: "completed", extracted_data: { total_pieces: 450, total_weight_kg: 12500 } },
    { tenant_id: TENANT_ID, entry_case_id: cases[0].id, uploaded_by_user_id: specialist1Id, doc_type: "bill_of_lading", file_name: "TG-2026-001-BOL.pdf", storage_path: `${TENANT_ID}/${cases[0].id}/bill_of_lading/TG-2026-001-BOL.pdf`, file_hash: "ghi789", file_size_bytes: 320000, parse_status: "completed", extracted_data: { bol_number: "MSKU1234567", vessel: "MSC ANNA", port_of_loading: "CNSHA", port_of_discharge: "USLAX" } },
    { tenant_id: TENANT_ID, entry_case_id: cases[0].id, uploaded_by_user_id: specialist1Id, doc_type: "poa", file_name: "TG-POA-2026.pdf", storage_path: `${TENANT_ID}/${cases[0].id}/poa/TG-POA-2026.pdf`, file_hash: "jkl012", file_size_bytes: 95000, parse_status: "completed", extracted_data: {} },
    // Case 2 (govt_review) - most docs
    { tenant_id: TENANT_ID, entry_case_id: cases[1].id, uploaded_by_user_id: specialist1Id, doc_type: "commercial_invoice", file_name: "TG-2026-045-CI.pdf", storage_path: `${TENANT_ID}/${cases[1].id}/commercial_invoice/TG-2026-045-CI.pdf`, file_hash: "mno345", file_size_bytes: 210000, parse_status: "completed", extracted_data: { invoice_number: "INV-2026-045", total_value: 185000, currency: "USD" } },
    { tenant_id: TENANT_ID, entry_case_id: cases[1].id, uploaded_by_user_id: specialist1Id, doc_type: "packing_list", file_name: "TG-2026-045-PL.pdf", storage_path: `${TENANT_ID}/${cases[1].id}/packing_list/TG-2026-045-PL.pdf`, file_hash: "pqr678", file_size_bytes: 155000, parse_status: "completed", extracted_data: { total_pieces: 200, total_weight_kg: 5000 } },
    { tenant_id: TENANT_ID, entry_case_id: cases[1].id, uploaded_by_user_id: specialist1Id, doc_type: "airway_bill", file_name: "TG-2026-045-AWB.pdf", storage_path: `${TENANT_ID}/${cases[1].id}/airway_bill/TG-2026-045-AWB.pdf`, file_hash: "stu901", file_size_bytes: 125000, parse_status: "completed", extracted_data: { awb_number: "176-12345678", airline: "Korean Air" } },
    // Case 3 (awaiting_docs) - missing docs
    { tenant_id: TENANT_ID, entry_case_id: cases[2].id, uploaded_by_user_id: specialist2Id, doc_type: "commercial_invoice", file_name: "FF-2026-012-CI.pdf", storage_path: `${TENANT_ID}/${cases[2].id}/commercial_invoice/FF-2026-012-CI.pdf`, file_hash: "vwx234", file_size_bytes: 190000, parse_status: "pending", extracted_data: {} },
    // Case 5 (entry_prep)
    { tenant_id: TENANT_ID, entry_case_id: cases[4].id, uploaded_by_user_id: specialist1Id, doc_type: "commercial_invoice", file_name: "AP-2026-007-CI.pdf", storage_path: `${TENANT_ID}/${cases[4].id}/commercial_invoice/AP-2026-007-CI.pdf`, file_hash: "yza567", file_size_bytes: 275000, parse_status: "completed", extracted_data: { invoice_number: "INV-AP-007", total_value: 118000 } },
    { tenant_id: TENANT_ID, entry_case_id: cases[4].id, uploaded_by_user_id: specialist1Id, doc_type: "bill_of_lading", file_name: "AP-2026-007-BOL.pdf", storage_path: `${TENANT_ID}/${cases[4].id}/bill_of_lading/AP-2026-007-BOL.pdf`, file_hash: "bcd890", file_size_bytes: 310000, parse_status: "completed", extracted_data: { bol_number: "OOLU7654321" } },
    { tenant_id: TENANT_ID, entry_case_id: cases[4].id, uploaded_by_user_id: specialist1Id, doc_type: "packing_list", file_name: "AP-2026-007-PL.pdf", storage_path: `${TENANT_ID}/${cases[4].id}/packing_list/AP-2026-007-PL.pdf`, file_hash: "efg123", file_size_bytes: 145000, parse_status: "completed", extracted_data: { total_pieces: 850 } },
    { tenant_id: TENANT_ID, entry_case_id: cases[4].id, uploaded_by_user_id: specialist1Id, doc_type: "poa", file_name: "AP-POA-2026.pdf", storage_path: `${TENANT_ID}/${cases[4].id}/poa/AP-POA-2026.pdf`, file_hash: "hij456", file_size_bytes: 88000, parse_status: "completed", extracted_data: {} },
  ];

  const { error: docErr } = await supabase.from("documents").insert(documents);
  if (docErr) console.error("Document error:", docErr.message);
  else console.log(`  Created ${documents.length} documents`);

  // 10. Tasks
  console.log("\nCreating tasks...");
  const tasks = [
    { tenant_id: TENANT_ID, entry_case_id: cases[2].id, assigned_user_id: specialist2Id, title: "Collect missing documents for FreshFoods shipment", description: "Bill of lading, packing list, and POA still needed", task_type: "data_entry", status: "in_progress", priority: "urgent", due_at: daysFromNow(1) },
    { tenant_id: TENANT_ID, entry_case_id: cases[3].id, assigned_user_id: specialist2Id, title: "Review HTS classification for perishable goods", description: "Verify classification for tropical fruit import under 0804", task_type: "review", status: "pending", priority: "high", due_at: daysFromNow(2) },
    { tenant_id: TENANT_ID, entry_case_id: cases[4].id, assigned_user_id: specialist1Id, title: "Check anti-dumping duty applicability", description: "Brake rotors from China may be subject to AD/CVD orders", task_type: "review", status: "pending", priority: "normal", due_at: daysFromNow(3) },
    { tenant_id: TENANT_ID, entry_case_id: cases[6].id, assigned_user_id: specialist1Id, title: "Respond to CBP exam request", description: "Prepare documentation for intensive exam on hold case", task_type: "escalation", status: "in_progress", priority: "urgent", due_at: daysAgo(1) },
    { tenant_id: TENANT_ID, entry_case_id: cases[6].id, assigned_user_id: opsId, title: "Notify TechGlobal about CBP hold", description: "Client needs to be informed about potential delays", task_type: "client_request", status: "pending", priority: "high", due_at: daysAgo(0) },
    { tenant_id: TENANT_ID, entry_case_id: cases[7].id, assigned_user_id: userIds["finance@acme.com"], title: "Generate invoice for FreshFoods case #8", description: "Case released — prepare billing", task_type: "other", status: "pending", priority: "normal", due_at: daysFromNow(5) },
    { tenant_id: TENANT_ID, entry_case_id: cases[1].id, assigned_user_id: specialist1Id, title: "Monitor CBP processing for TechGlobal air shipment", description: "High-priority entry under government review", task_type: "review", status: "in_progress", priority: "high", due_at: daysFromNow(1) },
    { tenant_id: TENANT_ID, entry_case_id: null, assigned_user_id: opsId, title: "Weekly team capacity review", description: "Review case assignments and rebalance if needed", task_type: "review", status: "pending", priority: "normal", due_at: daysFromNow(2) },
    { tenant_id: TENANT_ID, entry_case_id: cases[5].id, assigned_user_id: specialist2Id, title: "Process new truck entry intake", description: "New AutoParts case needs initial setup", task_type: "data_entry", status: "pending", priority: "low", due_at: daysFromNow(4) },
    { tenant_id: TENANT_ID, entry_case_id: cases[0].id, assigned_user_id: specialist1Id, title: "Archive released TechGlobal case", description: "Case fully released — verify all docs and archive", task_type: "other", status: "pending", priority: "low", due_at: daysFromNow(7) },
    { tenant_id: TENANT_ID, entry_case_id: null, assigned_user_id: userIds["admin@acme.com"], title: "Review broker license renewals", description: "Annual license review due next month", task_type: "review", status: "pending", priority: "normal", due_at: daysFromNow(14) },
    { tenant_id: TENANT_ID, entry_case_id: cases[8].id, assigned_user_id: specialist1Id, title: "Track rail shipment arrival", description: "AutoParts rail entry submitted — monitor for CBP release", task_type: "review", status: "in_progress", priority: "normal", due_at: daysFromNow(2) },
    // Completed tasks
    { tenant_id: TENANT_ID, entry_case_id: cases[0].id, assigned_user_id: specialist1Id, title: "File entry for TechGlobal ocean shipment", description: "Prepare and submit 7501 entry", task_type: "filing_prep", status: "completed", priority: "normal", due_at: daysAgo(5), completed_at: daysAgo(6) },
    { tenant_id: TENANT_ID, entry_case_id: cases[0].id, assigned_user_id: opsId, title: "Review TechGlobal case setup", description: "Verify case details and assignment", task_type: "review", status: "completed", priority: "normal", due_at: daysAgo(12), completed_at: daysAgo(13) },
    { tenant_id: TENANT_ID, entry_case_id: cases[7].id, assigned_user_id: specialist2Id, title: "File entry for FreshFoods shipment", description: "Entry preparation and submission", task_type: "filing_prep", status: "completed", priority: "normal", due_at: daysAgo(8), completed_at: daysAgo(9) },
    // Overdue tasks
    { tenant_id: TENANT_ID, entry_case_id: cases[3].id, assigned_user_id: specialist2Id, title: "Request FDA prior notice for FreshFoods", description: "FDA prior notice must be filed before arrival", task_type: "filing_prep", status: "pending", priority: "urgent", due_at: daysAgo(2) },
    { tenant_id: TENANT_ID, entry_case_id: cases[4].id, assigned_user_id: specialist1Id, title: "Verify DOT compliance certificates", description: "AutoParts safety equipment needs DOT certs", task_type: "review", status: "pending", priority: "high", due_at: daysAgo(1) },
  ];

  const { error: taskErr } = await supabase.from("tasks").insert(tasks);
  if (taskErr) console.error("Task error:", taskErr.message);
  else console.log(`  Created ${tasks.length} tasks`);

  // 11. Audit events
  console.log("\nCreating audit events...");
  const adminId = userIds["admin@acme.com"];
  const auditEvents = [
    { tenant_id: TENANT_ID, event_type: "case.created", entity_type: "entry_case", entity_id: cases[0].id, actor_type: "user", actor_id: opsId || "", action: "Created case acme-2026-00001", details: { client: "TechGlobal Inc", mode: "ocean" }, created_at: daysAgo(15) },
    { tenant_id: TENANT_ID, event_type: "case.status_changed", entity_type: "entry_case", entity_id: cases[0].id, actor_type: "user", actor_id: specialist1Id || "", action: "Changed status from entry_prep to submitted", details: { from: "entry_prep", to: "submitted" }, created_at: daysAgo(5) },
    { tenant_id: TENANT_ID, event_type: "case.status_changed", entity_type: "entry_case", entity_id: cases[0].id, actor_type: "user", actor_id: specialist1Id || "", action: "Changed status from govt_review to released", details: { from: "govt_review", to: "released" }, created_at: daysAgo(2) },
    { tenant_id: TENANT_ID, event_type: "document.uploaded", entity_type: "document", entity_id: randomUUID(), actor_type: "user", actor_id: specialist1Id || "", action: "Uploaded commercial_invoice for case acme-2026-00001", details: { doc_type: "commercial_invoice", file: "TG-2026-001-CI.pdf" }, created_at: daysAgo(12) },
    { tenant_id: TENANT_ID, event_type: "case.created", entity_type: "entry_case", entity_id: cases[6].id, actor_type: "user", actor_id: opsId || "", action: "Created case acme-2026-00007", details: { client: "TechGlobal Inc", mode: "air", priority: "urgent" }, created_at: daysAgo(7) },
    { tenant_id: TENANT_ID, event_type: "case.status_changed", entity_type: "entry_case", entity_id: cases[6].id, actor_type: "system", actor_id: "system", action: "Case placed on hold — CBP exam ordered", details: { from: "govt_review", to: "hold", reason: "CBP intensive exam" }, created_at: daysAgo(1) },
    { tenant_id: TENANT_ID, event_type: "task.created", entity_type: "task", entity_id: randomUUID(), actor_type: "user", actor_id: opsId || "", action: "Created task: Respond to CBP exam request", details: { case: "acme-2026-00007", assignee: "Emily Rodriguez" }, created_at: daysAgo(1) },
    { tenant_id: TENANT_ID, event_type: "case.created", entity_type: "entry_case", entity_id: cases[5].id, actor_type: "user", actor_id: opsId || "", action: "Created case acme-2026-00006", details: { client: "AutoParts Direct", mode: "truck" }, created_at: daysAgo(1) },
    { tenant_id: TENANT_ID, event_type: "task.completed", entity_type: "task", entity_id: randomUUID(), actor_type: "user", actor_id: specialist1Id || "", action: "Completed task: File entry for TechGlobal ocean shipment", details: { case: "acme-2026-00001" }, created_at: daysAgo(6) },
    { tenant_id: TENANT_ID, event_type: "user.login", entity_type: "user", entity_id: adminId || randomUUID(), actor_type: "user", actor_id: adminId || "", action: "User logged in", details: { ip: "192.168.1.100" }, created_at: daysAgo(0) },
  ];

  const { error: auditErr } = await supabase.from("audit_events").insert(auditEvents);
  if (auditErr) console.error("Audit error:", auditErr.message);
  else console.log(`  Created ${auditEvents.length} audit events`);

  console.log("\n✅ Seed complete!");
  console.log("\nTest credentials:");
  console.log("  admin@acme.com / password123");
  console.log("  ops@acme.com / password123");
  console.log("  specialist1@acme.com / password123");
  console.log("  specialist2@acme.com / password123");
  console.log("  finance@acme.com / password123");
}

seed().catch(console.error);
