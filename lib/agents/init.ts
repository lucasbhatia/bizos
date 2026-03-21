// Central agent registration — import this to ensure all agents are registered
import { registerEchoAgent } from './echo';

let initialized = false;

export function initializeAgents(): void {
  if (initialized) return;

  registerEchoAgent();
  // Future agents will be registered here

  initialized = true;
}
