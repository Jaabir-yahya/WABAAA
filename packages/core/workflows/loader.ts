/**
 * KCOS Workflow Loader
 *
 * Loads workflow definitions from JSON or YAML strings.
 */

import { parse as parseYaml } from 'yaml';
import type { WorkflowDefinition, WorkflowLoadResult } from './types';

// ═════════════════════════════════════════════════════════════════════════════==
// LOADING
// ═════════════════════════════════════════════════════════════════════════════==

export function loadWorkflowDefinitionFromString(
  content: string,
  format?: 'json' | 'yaml'
): WorkflowLoadResult {
  const trimmed = content.trim();
  const inferredFormat = format ?? inferFormat(trimmed);

  let parsed: unknown;
  if (inferredFormat === 'json') {
    parsed = JSON.parse(trimmed);
  } else {
    parsed = parseYaml(trimmed);
  }

  const definition = validateWorkflowDefinition(parsed);
  return { definition, source: inferredFormat };
}

export function loadWorkflowDefinitionFromObject(
  obj: unknown
): WorkflowDefinition {
  return validateWorkflowDefinition(obj);
}

// ═════════════════════════════════════════════════════════════════════════════==
// VALIDATION
// ═════════════════════════════════════════════════════════════════════════════==

export function validateWorkflowDefinition(obj: unknown): WorkflowDefinition {
  if (!obj || typeof obj !== 'object') {
    throw new Error('Workflow definition must be an object');
  }

  const def = obj as Record<string, unknown>;

  if (!def.id || typeof def.id !== 'string') {
    throw new Error('Workflow definition requires a string "id"');
  }

  if (!def.name || typeof def.name !== 'string') {
    throw new Error('Workflow definition requires a string "name"');
  }

  if (!def.trigger || typeof def.trigger !== 'object') {
    throw new Error('Workflow definition requires a "trigger" object');
  }

  if (!def.steps || !Array.isArray(def.steps)) {
    throw new Error('Workflow definition requires a "steps" array');
  }

  // Minimal shape validation for steps
  for (const step of def.steps) {
    if (!step || typeof step !== 'object') {
      throw new Error('Each workflow step must be an object');
    }
    const s = step as Record<string, unknown>;
    if (!s.id || typeof s.id !== 'string') {
      throw new Error('Each workflow step requires a string "id"');
    }
    if (!s.action || typeof s.action !== 'string') {
      throw new Error(`Step "${s.id}" requires a string "action"`);
    }
    if (s.input && typeof s.input !== 'object') {
      throw new Error(`Step "${s.id}" input must be an object`);
    }
  }

  return def as WorkflowDefinition;
}

// ═════════════════════════════════════════════════════════════════════════════==
// UTILITIES
// ═════════════════════════════════════════════════════════════════════════════==

function inferFormat(content: string): 'json' | 'yaml' {
  if (content.startsWith('{') || content.startsWith('[')) {
    return 'json';
  }
  return 'yaml';
}
