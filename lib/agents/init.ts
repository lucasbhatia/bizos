// Central agent registration — import this to ensure all agents are registered
import { registerEchoAgent } from './echo';
import { registerDocumentParserAgent } from './document-parser';
import { registerIntakeAgent } from './intake';

let initialized = false;

export function initializeAgents(): void {
  if (initialized) return;

  registerEchoAgent();
  registerDocumentParserAgent();
  registerIntakeAgent();
  // Future agents will be registered here

  initialized = true;
}
