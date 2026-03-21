// Step 38: Self-Improving Validation Rules
// Auto-generated validation rules from error patterns in ai_action_logs

import { createServiceClient } from '@/lib/supabase/server';

export interface ValidationRule {
  id: string;
  field: string;
  condition: 'required' | 'min_length' | 'max_length' | 'pattern' | 'range' | 'custom';
  value: string;
  message: string;
  severity: 'error' | 'warning';
  source: string;
  createdAt: string;
}

export interface ErrorPattern {
  field: string;
  errorType: string;
  frequency: number;
  examples: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: { field: string; message: string; severity: string }[];
  warnings: { field: string; message: string; severity: string }[];
}

function generateId(): string {
  return crypto.randomUUID();
}

export async function analyzeErrors(tenantId: string): Promise<ErrorPattern[]> {
  const supabase = createServiceClient();

  // Fetch rejected or modified actions
  const { data: logs } = await supabase
    .from('ai_action_logs')
    .select('agent_type, action, inputs, outputs, human_decision, human_decision_reason')
    .eq('tenant_id', tenantId)
    .in('human_decision', ['rejected', 'modified'])
    .order('created_at', { ascending: false })
    .limit(500);

  const records = logs ?? [];
  const patternMap = new Map<string, ErrorPattern>();

  for (const log of records) {
    const reason = (log.human_decision_reason as string) ?? 'unknown';
    const outputs = log.outputs as Record<string, unknown>;

    // Extract field-level errors from outputs
    const errorFields = Object.keys(outputs).filter(
      (key) => key.includes('error') || key.includes('invalid') || key.includes('missing')
    );

    if (errorFields.length > 0) {
      for (const field of errorFields) {
        const key = `${log.agent_type}:${field}`;
        const existing = patternMap.get(key);
        if (existing) {
          existing.frequency++;
          if (existing.examples.length < 5) {
            existing.examples.push(reason);
          }
        } else {
          patternMap.set(key, {
            field,
            errorType: log.agent_type as string,
            frequency: 1,
            examples: [reason],
          });
        }
      }
    } else {
      // General pattern based on the action
      const key = `${log.agent_type}:general`;
      const existing = patternMap.get(key);
      if (existing) {
        existing.frequency++;
        if (existing.examples.length < 5) {
          existing.examples.push(reason);
        }
      } else {
        patternMap.set(key, {
          field: 'general',
          errorType: log.agent_type as string,
          frequency: 1,
          examples: [reason],
        });
      }
    }
  }

  // Sort by frequency descending
  return Array.from(patternMap.values()).sort((a, b) => b.frequency - a.frequency);
}

export function generateRules(patterns: ErrorPattern[]): ValidationRule[] {
  const rules: ValidationRule[] = [];

  for (const pattern of patterns) {
    // Only generate rules for patterns with sufficient frequency
    if (pattern.frequency < 3) continue;

    const severity: 'error' | 'warning' = pattern.frequency >= 10 ? 'error' : 'warning';

    rules.push({
      id: generateId(),
      field: pattern.field,
      condition: 'custom',
      value: pattern.errorType,
      message: `Frequent ${pattern.errorType} issue on field "${pattern.field}" (${pattern.frequency} occurrences). Review before proceeding.`,
      severity,
      source: `auto-generated from ${pattern.frequency} rejected/modified actions`,
      createdAt: new Date().toISOString(),
    });
  }

  return rules;
}

export function applyRules(
  data: Record<string, unknown>,
  rules: ValidationRule[]
): ValidationResult {
  const errors: { field: string; message: string; severity: string }[] = [];
  const warnings: { field: string; message: string; severity: string }[] = [];

  for (const rule of rules) {
    let violated = false;

    switch (rule.condition) {
      case 'required':
        if (!data[rule.field] || (typeof data[rule.field] === 'string' && (data[rule.field] as string).trim() === '')) {
          violated = true;
        }
        break;

      case 'min_length':
        if (typeof data[rule.field] === 'string' && (data[rule.field] as string).length < parseInt(rule.value, 10)) {
          violated = true;
        }
        break;

      case 'max_length':
        if (typeof data[rule.field] === 'string' && (data[rule.field] as string).length > parseInt(rule.value, 10)) {
          violated = true;
        }
        break;

      case 'pattern':
        if (typeof data[rule.field] === 'string') {
          const regex = new RegExp(rule.value);
          if (!regex.test(data[rule.field] as string)) {
            violated = true;
          }
        }
        break;

      case 'range': {
        const [minStr, maxStr] = rule.value.split(',');
        const numVal = Number(data[rule.field]);
        if (!isNaN(numVal)) {
          const min = parseFloat(minStr);
          const max = parseFloat(maxStr);
          if (numVal < min || numVal > max) {
            violated = true;
          }
        }
        break;
      }

      case 'custom':
        // Custom rules act as warnings/flags — always triggered when the field exists
        if (data[rule.field] !== undefined) {
          violated = true;
        }
        break;
    }

    if (violated) {
      const entry = { field: rule.field, message: rule.message, severity: rule.severity };
      if (rule.severity === 'error') {
        errors.push(entry);
      } else {
        warnings.push(entry);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export async function getStoredRules(tenantId: string): Promise<ValidationRule[]> {
  const supabase = createServiceClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  const settings = (tenant?.settings ?? {}) as Record<string, unknown>;
  return (settings.validation_rules ?? []) as ValidationRule[];
}

export async function saveRules(tenantId: string, rules: ValidationRule[]): Promise<void> {
  const supabase = createServiceClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  const settings = (tenant?.settings ?? {}) as Record<string, unknown>;
  settings.validation_rules = rules;

  await supabase
    .from('tenants')
    .update({ settings })
    .eq('id', tenantId);
}
