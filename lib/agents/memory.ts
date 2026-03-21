// Step 37: Institutional Memory System
// Pattern/precedent storage and retrieval for agent learning

import { createServiceClient } from '@/lib/supabase/server';

export type PatternCategory =
  | 'classification_precedent'
  | 'client_preference'
  | 'compliance_note'
  | 'procedure';

export interface Pattern {
  id: string;
  tenant_id: string;
  category: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  source_case_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface StorePatternInput {
  tenantId: string;
  category: PatternCategory;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
  sourceCaseId?: string;
  createdBy?: string;
}

export async function storePattern(input: StorePatternInput): Promise<Pattern> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('patterns')
    .insert({
      tenant_id: input.tenantId,
      category: input.category,
      title: input.title,
      content: input.content,
      metadata: input.metadata ?? {},
      source_case_id: input.sourceCaseId ?? null,
      created_by: input.createdBy ?? null,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to store pattern: ${error.message}`);
  }

  return data as Pattern;
}

export async function searchPatterns(
  tenantId: string,
  query: string,
  category?: PatternCategory
): Promise<Pattern[]> {
  const supabase = createServiceClient();

  // Use Postgres full-text search
  let queryBuilder = supabase
    .from('patterns')
    .select('*')
    .eq('tenant_id', tenantId)
    .textSearch('title', query, { type: 'websearch', config: 'english' })
    .order('created_at', { ascending: false })
    .limit(20);

  if (category) {
    queryBuilder = queryBuilder.eq('category', category);
  }

  const { data, error } = await queryBuilder;

  if (error) {
    // Fallback to ilike search if full-text fails
    let fallbackQuery = supabase
      .from('patterns')
      .select('*')
      .eq('tenant_id', tenantId)
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (category) {
      fallbackQuery = fallbackQuery.eq('category', category);
    }

    const { data: fallbackData } = await fallbackQuery;
    return (fallbackData ?? []) as Pattern[];
  }

  return (data ?? []) as Pattern[];
}

export async function getRelevantPatterns(
  tenantId: string,
  context: {
    category?: PatternCategory;
    clientAccountId?: string;
    commodityCode?: string;
    keywords?: string[];
  }
): Promise<Pattern[]> {
  const supabase = createServiceClient();

  // Build query based on context
  let queryBuilder = supabase
    .from('patterns')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (context.category) {
    queryBuilder = queryBuilder.eq('category', context.category);
  }

  const { data } = await queryBuilder;
  let results = (data ?? []) as Pattern[];

  // Filter by metadata matches if provided
  if (context.clientAccountId) {
    const clientMatches = results.filter(
      (p) =>
        (p.metadata as Record<string, unknown>).client_account_id === context.clientAccountId
    );
    if (clientMatches.length > 0) {
      results = clientMatches;
    }
  }

  if (context.commodityCode) {
    const commodityMatches = results.filter(
      (p) =>
        (p.metadata as Record<string, unknown>).commodity_code === context.commodityCode
    );
    if (commodityMatches.length > 0) {
      results = commodityMatches;
    }
  }

  return results;
}

export async function listPatterns(
  tenantId: string,
  category?: PatternCategory
): Promise<Pattern[]> {
  const supabase = createServiceClient();

  let queryBuilder = supabase
    .from('patterns')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (category) {
    queryBuilder = queryBuilder.eq('category', category);
  }

  const { data } = await queryBuilder;
  return (data ?? []) as Pattern[];
}

export async function deletePattern(
  tenantId: string,
  patternId: string
): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from('patterns')
    .delete()
    .eq('id', patternId)
    .eq('tenant_id', tenantId);

  if (error) {
    throw new Error(`Failed to delete pattern: ${error.message}`);
  }
}
