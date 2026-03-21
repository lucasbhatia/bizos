import type { AgentDefinition } from '@/lib/types/agents';

const agentRegistry = new Map<string, AgentDefinition>();

export function registerAgent(agent: AgentDefinition): void {
  if (agentRegistry.has(agent.id)) {
    console.warn(`Agent "${agent.id}" is already registered. Overwriting.`);
  }
  agentRegistry.set(agent.id, agent);
}

export function getAgent(agentId: string): AgentDefinition | undefined {
  return agentRegistry.get(agentId);
}

export function listAgents(): AgentDefinition[] {
  return Array.from(agentRegistry.values());
}

export function hasAgent(agentId: string): boolean {
  return agentRegistry.has(agentId);
}
