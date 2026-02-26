import { getLogger } from '../utils/logger.js';

export const definitions = [
  {
    name: 'regex_test',
    description: 'Test a regular expression against text. Returns matches, groups, and match positions.',
    input_schema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Regular expression pattern (without delimiters)' },
        flags: { type: 'string', description: 'Regex flags (e.g., "gi" for global+case-insensitive). Default: "g"' },
        text: { type: 'string', description: 'Text to test against' },
      },
      required: ['pattern', 'text'],
    },
  },
  {
    name: 'regex_replace',
    description: 'Replace text using a regular expression pattern.',
    input_schema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Regular expression pattern' },
        flags: { type: 'string', description: 'Regex flags (default: "g")' },
        text: { type: 'string', description: 'Input text' },
        replacement: { type: 'string', description: 'Replacement string (supports $1, $2 for groups)' },
      },
      required: ['pattern', 'text', 'replacement'],
    },
  },
  {
    name: 'regex_extract',
    description: 'Extract all matches of a pattern from text, including named groups.',
    input_schema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Regular expression pattern with capture groups' },
        flags: { type: 'string', description: 'Regex flags (default: "g")' },
        text: { type: 'string', description: 'Text to extract from' },
      },
      required: ['pattern', 'text'],
    },
  },
];

export const handlers = {
  regex_test: async (params) => {
    const { pattern, flags = 'g', text } = params;
    try {
      const regex = new RegExp(pattern, flags);
      const matches = [];
      let match;
      if (flags.includes('g')) {
        while ((match = regex.exec(text)) !== null && matches.length < 100) {
          matches.push({ match: match[0], index: match.index, groups: match.slice(1) });
        }
      } else {
        match = regex.exec(text);
        if (match) matches.push({ match: match[0], index: match.index, groups: match.slice(1) });
      }
      return { pattern, flags, total_matches: matches.length, matches: matches.slice(0, 20) };
    } catch (err) {
      return { error: `Invalid regex: ${err.message}` };
    }
  },
  regex_replace: async (params) => {
    const { pattern, flags = 'g', text, replacement } = params;
    try {
      const regex = new RegExp(pattern, flags);
      const result = text.replace(regex, replacement);
      const changed = result !== text;
      return { changed, result: result.slice(0, 10000) };
    } catch (err) {
      return { error: `Regex replace failed: ${err.message}` };
    }
  },
  regex_extract: async (params) => {
    const { pattern, flags = 'g', text } = params;
    try {
      const regex = new RegExp(pattern, flags);
      const extracted = [];
      let match;
      while ((match = regex.exec(text)) !== null && extracted.length < 100) {
        extracted.push({ full: match[0], groups: match.slice(1), named: match.groups || null, index: match.index });
        if (!flags.includes('g')) break;
      }
      return { total: extracted.length, extracted: extracted.slice(0, 30) };
    } catch (err) {
      return { error: `Extraction failed: ${err.message}` };
    }
  },
};
