// Database types mirroring the Supabase schema
// These types are used throughout the app for type-safe DB access

export type UserRole = 'admin' | 'broker_lead' | 'ops_manager' | 'specialist' | 'finance' | 'viewer';

export type TransportMode = 'ocean' | 'air' | 'truck' | 'rail';

export type CaseStatus =
  | 'intake' | 'awaiting_docs' | 'docs_validated' | 'classification_review'
  | 'entry_prep' | 'submitted' | 'govt_review' | 'hold' | 'released'
  | 'billing' | 'closed' | 'archived';

export type TaskType = 'review' | 'approval' | 'data_entry' | 'client_request' | 'escalation' | 'filing_prep' | 'other';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export type PriorityLevel = 'low' | 'normal' | 'high' | 'urgent';

export type DocType =
  | 'commercial_invoice' | 'packing_list' | 'bill_of_lading'
  | 'airway_bill' | 'arrival_notice' | 'poa' | 'certificate_of_origin'
  | 'isf_data' | 'other';

export type ParseStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type ActorType = 'user' | 'agent' | 'system';

export type HumanDecision = 'pending' | 'accepted' | 'rejected' | 'modified';

export type SenderType = 'client' | 'broker';

// ============================================================================
// Table row types
// ============================================================================

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  data_region: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_licensed_broker: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessUnit {
  id: string;
  tenant_id: string;
  name: string;
  location: string | null;
  port_code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientAccount {
  id: string;
  tenant_id: string;
  name: string;
  importer_of_record_number: string | null;
  default_commodity_profile: Record<string, unknown>;
  billing_terms: Record<string, unknown>;
  sop_notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  tenant_id: string;
  client_account_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface EntryCase {
  id: string;
  tenant_id: string;
  client_account_id: string;
  business_unit_id: string | null;
  assigned_user_id: string | null;
  case_number: string;
  mode_of_transport: TransportMode;
  status: CaseStatus;
  eta: string | null;
  actual_arrival: string | null;
  risk_score: number | null;
  priority: PriorityLevel;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WorkflowEvent {
  id: string;
  tenant_id: string;
  entry_case_id: string;
  from_status: CaseStatus | null;
  to_status: CaseStatus;
  triggered_by_user_id: string | null;
  triggered_by_agent: string | null;
  reason: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  tenant_id: string;
  entry_case_id: string | null;
  assigned_user_id: string | null;
  title: string;
  description: string | null;
  task_type: TaskType;
  status: TaskStatus;
  priority: PriorityLevel;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  tenant_id: string;
  entry_case_id: string;
  uploaded_by_user_id: string | null;
  doc_type: DocType;
  file_name: string;
  storage_path: string;
  file_hash: string | null;
  file_size_bytes: number | null;
  version: number;
  parse_status: ParseStatus;
  extracted_data: Record<string, unknown>;
  created_at: string;
}

export interface AuditEvent {
  id: string;
  tenant_id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  actor_type: ActorType;
  actor_id: string;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface AiActionLog {
  id: string;
  tenant_id: string;
  agent_type: string;
  entry_case_id: string | null;
  action: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  confidence: number | null;
  citations: unknown[];
  human_decision: HumanDecision | null;
  human_decision_by: string | null;
  human_decision_reason: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  tenant_id: string;
  entry_case_id: string | null;
  client_account_id: string;
  sender_type: SenderType;
  sender_id: string;
  sender_name: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

// ============================================================================
// Joined / enriched types used in the UI
// ============================================================================

export interface EntryCaseWithRelations extends EntryCase {
  client_account?: ClientAccount;
  assigned_user?: User;
  business_unit?: BusinessUnit;
}

export interface TaskWithRelations extends Task {
  entry_case?: EntryCase;
  assigned_user?: User;
}

export interface UserWithTenant extends User {
  tenant?: Tenant;
}

// ============================================================================
// Valid status transitions (state machine)
// ============================================================================

export const VALID_STATUS_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  intake: ['awaiting_docs'],
  awaiting_docs: ['docs_validated'],
  docs_validated: ['classification_review'],
  classification_review: ['entry_prep'],
  entry_prep: ['submitted'],
  submitted: ['govt_review'],
  govt_review: ['released', 'hold'],
  hold: ['entry_prep'],
  released: ['billing'],
  billing: ['closed'],
  closed: ['archived'],
  archived: [],
};

// Required documents by transport mode
export const REQUIRED_DOCS_BY_MODE: Record<TransportMode, DocType[]> = {
  ocean: ['commercial_invoice', 'packing_list', 'bill_of_lading', 'arrival_notice', 'poa'],
  air: ['commercial_invoice', 'packing_list', 'airway_bill', 'poa'],
  truck: ['commercial_invoice', 'packing_list', 'bill_of_lading', 'poa'],
  rail: ['commercial_invoice', 'packing_list', 'bill_of_lading', 'poa'],
};

// Status display config
export const STATUS_COLORS: Record<CaseStatus, string> = {
  intake: 'bg-yellow-100 text-yellow-800',
  awaiting_docs: 'bg-yellow-100 text-yellow-800',
  docs_validated: 'bg-blue-100 text-blue-800',
  classification_review: 'bg-blue-100 text-blue-800',
  entry_prep: 'bg-blue-100 text-blue-800',
  submitted: 'bg-purple-100 text-purple-800',
  govt_review: 'bg-purple-100 text-purple-800',
  hold: 'bg-red-100 text-red-800',
  released: 'bg-green-100 text-green-800',
  billing: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
  archived: 'bg-gray-100 text-gray-800',
};

export const PRIORITY_COLORS: Record<PriorityLevel, string> = {
  low: 'bg-gray-100 text-gray-800',
  normal: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};
