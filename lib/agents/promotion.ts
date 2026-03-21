// Step 35: Agent Autonomy Promotion Pipeline
// Analyzes ai_action_logs to score agent performance and recommend promotions/demotions

import { createServiceClient } from '@/lib/supabase/server';
import { listAgents } from './registry';
import type { AutonomyLevel } from '@/lib/types/agents';

export interface AgentScore {
  agentId: string;
  agentName: string;
  currentLevel: AutonomyLevel;
  totalInvocations: number;
  acceptedCount: number;
  rejectedCount: number;
  modifiedCount: number;
  acceptRate: number;
  avgConfidence: number;
  score: number;
  recommendation: 'maintain' | 'promote' | 'demote';
  eligible: boolean;
  reasons: string[];
}

const AUTONOMY_ORDER: AutonomyLevel[] = ['L0', 'L1', 'L2', 'L3'];

function nextLevel(level: AutonomyLevel): AutonomyLevel | null {
  const idx = AUTONOMY_ORDER.indexOf(level);
  if (idx < 0 || idx >= AUTONOMY_ORDER.length - 1) return null;
  return AUTONOMY_ORDER[idx + 1];
}

function prevLevel(level: AutonomyLevel): AutonomyLevel | null {
  const idx = AUTONOMY_ORDER.indexOf(level);
  if (idx <= 0) return null;
  return AUTONOMY_ORDER[idx - 1];
}

export async function calculateAgentScore(
  agentId: string,
  tenantId: string
): Promise<AgentScore | null> {
  const agents = listAgents();
  const agent = agents.find((a) => a.id === agentId);
  if (!agent) return null;

  const supabase = createServiceClient();

  // Fetch completed logs for this agent in the last 90 days
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data: logs } = await supabase
    .from('ai_action_logs')
    .select('id, confidence, human_decision')
    .eq('tenant_id', tenantId)
    .eq('agent_type', agentId)
    .gte('created_at', ninetyDaysAgo.toISOString())
    .not('confidence', 'is', null);

  const records = logs ?? [];
  const totalInvocations = records.length;

  let acceptedCount = 0;
  let rejectedCount = 0;
  let modifiedCount = 0;
  let totalConfidence = 0;
  let confidenceCount = 0;

  for (const log of records) {
    if (log.human_decision === 'accepted') acceptedCount++;
    else if (log.human_decision === 'rejected') rejectedCount++;
    else if (log.human_decision === 'modified') modifiedCount++;

    if (log.confidence !== null) {
      totalConfidence += log.confidence as number;
      confidenceCount++;
    }
  }

  const decided = acceptedCount + rejectedCount + modifiedCount;
  const acceptRate = decided > 0 ? acceptedCount / decided : 0;
  const avgConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;

  // Composite score: weighted combination
  const score = acceptRate * 0.5 + avgConfidence * 0.3 + Math.min(totalInvocations / 100, 1) * 0.2;

  const reasons: string[] = [];
  let recommendation: 'maintain' | 'promote' | 'demote' = 'maintain';
  let eligible = false;

  // Promotion criteria: >90% accept rate + >50 invocations + >0.8 avg confidence
  if (acceptRate > 0.9 && totalInvocations > 50 && avgConfidence > 0.8) {
    if (nextLevel(agent.autonomyLevel)) {
      recommendation = 'promote';
      eligible = true;
      reasons.push(`Accept rate ${(acceptRate * 100).toFixed(0)}% exceeds 90% threshold`);
      reasons.push(`${totalInvocations} invocations exceeds 50 minimum`);
      reasons.push(`Avg confidence ${avgConfidence.toFixed(2)} exceeds 0.80 threshold`);
    } else {
      reasons.push('Already at maximum autonomy level (L3)');
    }
  } else {
    if (acceptRate <= 0.9) {
      reasons.push(`Accept rate ${(acceptRate * 100).toFixed(0)}% below 90% threshold`);
    }
    if (totalInvocations <= 50) {
      reasons.push(`${totalInvocations} invocations below 50 minimum`);
    }
    if (avgConfidence <= 0.8) {
      reasons.push(`Avg confidence ${avgConfidence.toFixed(2)} below 0.80 threshold`);
    }
  }

  // Demotion criteria: <60% accept rate with > 20 invocations
  if (acceptRate < 0.6 && totalInvocations > 20) {
    if (prevLevel(agent.autonomyLevel)) {
      recommendation = 'demote';
      reasons.push(`Accept rate ${(acceptRate * 100).toFixed(0)}% triggers demotion (below 60%)`);
    }
  }

  return {
    agentId: agent.id,
    agentName: agent.name,
    currentLevel: agent.autonomyLevel,
    totalInvocations,
    acceptedCount,
    rejectedCount,
    modifiedCount,
    acceptRate,
    avgConfidence,
    score,
    recommendation,
    eligible,
    reasons,
  };
}

export async function calculateAllAgentScores(tenantId: string): Promise<AgentScore[]> {
  const agents = listAgents();
  const scores: AgentScore[] = [];

  for (const agent of agents) {
    const agentScore = await calculateAgentScore(agent.id, tenantId);
    if (agentScore) {
      scores.push(agentScore);
    }
  }

  return scores;
}

export function getNextLevel(current: AutonomyLevel): AutonomyLevel | null {
  return nextLevel(current);
}

export function getPrevLevel(current: AutonomyLevel): AutonomyLevel | null {
  return prevLevel(current);
}
