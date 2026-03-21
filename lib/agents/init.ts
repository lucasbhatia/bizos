// Central agent registration — import this to ensure all agents are registered
import { registerEchoAgent } from './echo';
import { registerDocumentParserAgent } from './document-parser';

let initialized = false;

export function initializeAgents(): void {
  if (initialized) return;

  registerEchoAgent();
  registerDocumentParserAgent();
  // Future agents will be registered here

  initialized = true;
}
