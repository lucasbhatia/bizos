// Step 39: Skill/Plugin Framework v1
// Lightweight agents with hot-swappable handlers

import { createServiceClient } from '@/lib/supabase/server';

export interface PluginManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  requiredTools: string[];
  enabled: boolean;
  createdAt: string;
}

export interface PluginInput {
  data: Record<string, unknown>;
  trigger: string;
}

export interface PluginContext {
  tenantId: string;
  userId: string;
  caseId?: string;
}

export interface PluginOutput {
  success: boolean;
  result: Record<string, unknown>;
  error?: string;
}

type PluginHandler = (input: PluginInput, context: PluginContext) => Promise<PluginOutput>;

interface RegisteredPlugin {
  manifest: PluginManifest;
  handler: PluginHandler;
}

// In-memory plugin registry
const pluginRegistry = new Map<string, RegisteredPlugin>();

export function registerPlugin(manifest: PluginManifest, handler: PluginHandler): void {
  pluginRegistry.set(manifest.id, { manifest, handler });
}

export function getPlugin(id: string): RegisteredPlugin | undefined {
  return pluginRegistry.get(id);
}

export function listPlugins(): PluginManifest[] {
  return Array.from(pluginRegistry.values()).map((p) => p.manifest);
}

export function unregisterPlugin(id: string): boolean {
  return pluginRegistry.delete(id);
}

export async function executePlugin(
  id: string,
  input: PluginInput,
  context: PluginContext
): Promise<PluginOutput> {
  const plugin = pluginRegistry.get(id);
  if (!plugin) {
    return { success: false, result: {}, error: `Plugin "${id}" not found` };
  }

  if (!plugin.manifest.enabled) {
    return { success: false, result: {}, error: `Plugin "${id}" is disabled` };
  }

  const supabase = createServiceClient();

  // Log plugin execution start
  await supabase.from('ai_action_logs').insert({
    tenant_id: context.tenantId,
    agent_type: `plugin:${id}`,
    entry_case_id: context.caseId ?? null,
    action: `Plugin "${plugin.manifest.name}" invoked: ${input.trigger}`,
    inputs: input.data,
    outputs: {},
    confidence: null,
    citations: [],
  });

  try {
    const output = await plugin.handler(input, context);

    // Log completion
    await supabase.from('ai_action_logs').insert({
      tenant_id: context.tenantId,
      agent_type: `plugin:${id}`,
      entry_case_id: context.caseId ?? null,
      action: `Plugin "${plugin.manifest.name}" completed`,
      inputs: input.data,
      outputs: output.result,
      confidence: output.success ? 1.0 : 0,
      citations: [],
    });

    return output;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    await supabase.from('ai_action_logs').insert({
      tenant_id: context.tenantId,
      agent_type: `plugin:${id}`,
      entry_case_id: context.caseId ?? null,
      action: `Plugin "${plugin.manifest.name}" failed`,
      inputs: input.data,
      outputs: { error: errorMessage },
      confidence: 0,
      citations: [],
    });

    return { success: false, result: {}, error: errorMessage };
  }
}

// Persistence helpers — store manifests in tenant settings
export async function getPersistedPlugins(tenantId: string): Promise<PluginManifest[]> {
  const supabase = createServiceClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  const settings = (tenant?.settings ?? {}) as Record<string, unknown>;
  return (settings.plugins ?? []) as PluginManifest[];
}

export async function persistPlugin(tenantId: string, manifest: PluginManifest): Promise<void> {
  const supabase = createServiceClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  const settings = (tenant?.settings ?? {}) as Record<string, unknown>;
  const plugins = (settings.plugins ?? []) as PluginManifest[];

  const existingIndex = plugins.findIndex((p) => p.id === manifest.id);
  if (existingIndex >= 0) {
    plugins[existingIndex] = manifest;
  } else {
    plugins.push(manifest);
  }

  settings.plugins = plugins;

  await supabase
    .from('tenants')
    .update({ settings })
    .eq('id', tenantId);
}

export async function removePersistedPlugin(tenantId: string, pluginId: string): Promise<void> {
  const supabase = createServiceClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  const settings = (tenant?.settings ?? {}) as Record<string, unknown>;
  const plugins = (settings.plugins ?? []) as PluginManifest[];

  settings.plugins = plugins.filter((p) => p.id !== pluginId);

  await supabase
    .from('tenants')
    .update({ settings })
    .eq('id', tenantId);
}
