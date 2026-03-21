// Agent infrastructure types for BizOS AI layer

export type AutonomyLevel = 'L0' | 'L1' | 'L2' | 'L3';

export type ActionCategory = 'read' | 'write' | 'regulatory';

export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  type: string;
  autonomyLevel: AutonomyLevel;
  tools: string[];
  confidenceThreshold: number;
  handler: (input: AgentInput, context: AgentContext) => Promise<AgentOutput>;
}

export interface AgentInput {
  data: Record<string, unknown>;
  trigger: string;
}

export interface AgentContext {
  tenantId: string;
  userId: string;
  caseId?: string;
  triggerEvent: string;
}

export interface AgentOutput {
  success: boolean;
  result: Record<string, unknown>;
  confidence: number;
  citations: AgentCitation[];
  error?: string;
  tokensUsed?: TokenUsage;
}

export interface AgentCitation {
  source: string;
  text: string;
  confidence: number;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export interface ApprovalRequest {
  id: string;
  agentId: string;
  action: string;
  actionCategory: ActionCategory;
  confidence: number;
  proposedOutput: Record<string, unknown>;
  context: AgentContext;
  status: 'pending' | 'approved' | 'rejected';
  assignedRole: string;
  createdAt: string;
}

export interface AgentLogEntry {
  agentType: string;
  tenantId: string;
  entryCaseId: string | null;
  action: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  confidence: number | null;
  citations: AgentCitation[];
  phase: 'started' | 'completed' | 'failed';
}

export interface LLMOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt: string;
  userPrompt: string;
}

export interface LLMResponse {
  content: string;
  usage: TokenUsage;
  stopReason: string | null;
}
