import { getLogger } from '../utils/logger.js';

export const definitions = [
  {
    name: 'json_format',
    description: 'Format, validate, and pretty-print JSON. Can also minify JSON.',
    input_schema: {
      type: 'object',
      properties: {
        json: { type: 'string', description: 'JSON string to format' },
        minify: { type: 'boolean', description: 'If true, minify instead of pretty-print (default: false)' },
      },
      required: ['json'],
    },
  },
  {
    name: 'json_query',
    description: 'Extract data from JSON using a dot-notation path (e.g., "data.users[0].name").',
    input_schema: {
      type: 'object',
      properties: {
        json: { type: 'string', description: 'JSON string to query' },
        path: { type: 'string', description: 'Dot-notation path (e.g., "data.items[0].name", "users.length")' },
      },
      required: ['json', 'path'],
    },
  },
  {
    name: 'json_diff',
    description: 'Compare two JSON objects and show differences.',
    input_schema: {
      type: 'object',
      properties: {
        json_a: { type: 'string', description: 'First JSON string' },
        json_b: { type: 'string', description: 'Second JSON string' },
      },
      required: ['json_a', 'json_b'],
    },
  },
];

function queryPath(obj, path) {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let current = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

function findDiffs(a, b, path = '') {
  const diffs = [];
  const allKeys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const key of allKeys) {
    const fullPath = path ? `${path}.${key}` : key;
    if (!(key in (a || {}))) {
      diffs.push({ path: fullPath, type: 'added', value: b[key] });
    } else if (!(key in (b || {}))) {
      diffs.push({ path: fullPath, type: 'removed', value: a[key] });
    } else if (typeof a[key] === 'object' && typeof b[key] === 'object' && a[key] !== null && b[key] !== null) {
      diffs.push(...findDiffs(a[key], b[key], fullPath));
    } else if (a[key] !== b[key]) {
      diffs.push({ path: fullPath, type: 'changed', from: a[key], to: b[key] });
    }
  }
  return diffs;
}

export const handlers = {
  json_format: async (params) => {
    const { json, minify = false } = params;
    try {
      const parsed = JSON.parse(json);
      const formatted = minify ? JSON.stringify(parsed) : JSON.stringify(parsed, null, 2);
      return { valid: true, formatted, size: formatted.length, keys: typeof parsed === 'object' ? Object.keys(parsed || {}).length : null };
    } catch (err) {
      return { valid: false, error: `Invalid JSON: ${err.message}` };
    }
  },
  json_query: async (params) => {
    const { json, path } = params;
    try {
      const parsed = JSON.parse(json);
      const result = queryPath(parsed, path);
      return { path, result, type: typeof result };
    } catch (err) {
      return { error: `Query failed: ${err.message}` };
    }
  },
  json_diff: async (params) => {
    try {
      const a = JSON.parse(params.json_a);
      const b = JSON.parse(params.json_b);
      const diffs = findDiffs(a, b);
      return { total_changes: diffs.length, identical: diffs.length === 0, differences: diffs.slice(0, 50) };
    } catch (err) {
      return { error: `Diff failed: ${err.message}` };
    }
  },
};
