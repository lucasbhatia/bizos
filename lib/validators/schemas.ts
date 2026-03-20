import { z } from 'zod';

// ============================================================================
// Enum schemas
// ============================================================================

export const userRoleSchema = z.enum([
  'admin', 'broker_lead', 'ops_manager', 'specialist', 'finance', 'viewer',
]);

export const transportModeSchema = z.enum(['ocean', 'air', 'truck', 'rail']);

export const caseStatusSchema = z.enum([
  'intake', 'awaiting_docs', 'docs_validated', 'classification_review',
  'entry_prep', 'submitted', 'govt_review', 'hold', 'released',
  'billing', 'closed', 'archived',
]);

export const taskTypeSchema = z.enum([
  'review', 'approval', 'data_entry', 'client_request',
  'escalation', 'filing_prep', 'other',
]);

export const taskStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'cancelled']);

export const priorityLevelSchema = z.enum(['low', 'normal', 'high', 'urgent']);

export const docTypeSchema = z.enum([
  'commercial_invoice', 'packing_list', 'bill_of_lading',
  'airway_bill', 'arrival_notice', 'poa', 'certificate_of_origin',
  'isf_data', 'other',
]);

export const parseStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed']);

export const actorTypeSchema = z.enum(['user', 'agent', 'system']);

export const humanDecisionSchema = z.enum(['pending', 'accepted', 'rejected', 'modified']);

// ============================================================================
// Input schemas (for form validation and API requests)
// ============================================================================

export const createCaseSchema = z.object({
  client_account_id: z.string().uuid(),
  business_unit_id: z.string().uuid().optional(),
  assigned_user_id: z.string().uuid().optional(),
  mode_of_transport: transportModeSchema,
  priority: priorityLevelSchema.default('normal'),
  eta: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).default({}),
});

export const updateCaseStatusSchema = z.object({
  case_id: z.string().uuid(),
  new_status: caseStatusSchema,
  reason: z.string().optional(),
});

export const createTaskSchema = z.object({
  entry_case_id: z.string().uuid().optional(),
  assigned_user_id: z.string().uuid().optional(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  task_type: taskTypeSchema.default('other'),
  priority: priorityLevelSchema.default('normal'),
  due_at: z.string().datetime().optional(),
});

export const updateTaskSchema = z.object({
  task_id: z.string().uuid(),
  status: taskStatusSchema.optional(),
  assigned_user_id: z.string().uuid().optional(),
  priority: priorityLevelSchema.optional(),
});

export const uploadDocumentSchema = z.object({
  entry_case_id: z.string().uuid(),
  doc_type: docTypeSchema,
  file_name: z.string().min(1),
});

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(1, 'Full name is required'),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

// ============================================================================
// Type exports from schemas
// ============================================================================

export type CreateCaseInput = z.infer<typeof createCaseSchema>;
export type UpdateCaseStatusInput = z.infer<typeof updateCaseStatusSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
