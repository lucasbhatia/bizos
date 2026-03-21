// Central agent registration — import this to ensure all agents are registered
import { registerEchoAgent } from './echo';
import { registerDocumentParserAgent } from './document-parser';
import { registerIntakeAgent } from './intake';
import { registerClassificationAgent } from './classification';
import { registerOpsCoordinatorAgent } from './ops-coordinator';
import { registerFinanceAgent } from './finance';
import { registerClientCommsAgent } from './client-comms';
import { registerExecutiveBriefAgent } from './executive-brief';
import { registerOnboardingAgent } from './onboarding';

let initialized = false;

export function initializeAgents(): void {
  if (initialized) return;

  registerEchoAgent();
  registerDocumentParserAgent();
  registerIntakeAgent();
  registerClassificationAgent();
  registerOpsCoordinatorAgent();
  registerFinanceAgent();
  registerClientCommsAgent();
  registerExecutiveBriefAgent();
  registerOnboardingAgent();

  initialized = true;
}
