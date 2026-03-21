import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/supabase/auth-api';
import {
  listPlugins,
  getPersistedPlugins,
  persistPlugin,
  removePersistedPlugin,
} from '@/lib/agents/plugins';
import type { PluginManifest } from '@/lib/agents/plugins';
import { z } from 'zod';

export async function GET() {
  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Combine in-memory registry with persisted plugins
  const inMemory = listPlugins();
  const persisted = await getPersistedPlugins(auth.tenantId);

  // Merge: persisted plugins that are not in-memory are shown as available but not loaded
  const inMemoryIds = new Set(inMemory.map((p) => p.id));
  const allPlugins: (PluginManifest & { loaded: boolean })[] = [
    ...inMemory.map((p) => ({ ...p, loaded: true })),
    ...persisted
      .filter((p) => !inMemoryIds.has(p.id))
      .map((p) => ({ ...p, loaded: false })),
  ];

  return NextResponse.json({ plugins: allPlugins });
}

const registerSchema = z.object({
  action: z.literal('register'),
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  version: z.string().min(1),
  requiredTools: z.array(z.string()).default([]),
});

const toggleSchema = z.object({
  action: z.literal('toggle'),
  id: z.string().min(1),
  enabled: z.boolean(),
});

const removeSchema = z.object({
  action: z.literal('remove'),
  id: z.string().min(1),
});

const postSchema = z.union([registerSchema, toggleSchema, removeSchema]);

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (auth.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data = parsed.data;

  if (data.action === 'register') {
    const manifest: PluginManifest = {
      id: data.id,
      name: data.name,
      description: data.description,
      version: data.version,
      requiredTools: data.requiredTools,
      enabled: true,
      createdAt: new Date().toISOString(),
    };

    await persistPlugin(auth.tenantId, manifest);
    return NextResponse.json({ success: true, plugin: manifest });
  }

  if (data.action === 'toggle') {
    const persisted = await getPersistedPlugins(auth.tenantId);
    const plugin = persisted.find((p) => p.id === data.id);
    if (!plugin) {
      return NextResponse.json({ error: 'Plugin not found' }, { status: 404 });
    }

    plugin.enabled = data.enabled;
    await persistPlugin(auth.tenantId, plugin);
    return NextResponse.json({ success: true });
  }

  if (data.action === 'remove') {
    await removePersistedPlugin(auth.tenantId, data.id);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
