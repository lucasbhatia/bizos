import { registerAgent } from '@/lib/agents/registry';
import type { AgentInput, AgentContext, AgentOutput } from '@/lib/types/agents';

async function handleEcho(input: AgentInput, _context: AgentContext): Promise<AgentOutput> {
  return {
    success: true,
    result: {
      echo: input.data,
      trigger: input.trigger,
      timestamp: new Date().toISOString(),
    },
    confidence: 1.0,
    citations: [],
  };
}

export function registerEchoAgent(): void {
  registerAgent({
    id: 'echo',
    name: 'Echo Agent',
    description: 'Test agent that echoes its input. Used for infrastructure validation.',
    type: 'test',
    autonomyLevel: 'L0',
    tools: [],
    confidenceThreshold: 0.5,
    handler: handleEcho,
  });
}
