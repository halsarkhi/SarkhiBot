import { getLogger } from '../utils/logger.js';

export const definitions = [
  {
    name: 'text_stats',
    description: 'Analyze text and return statistics: word count, character count, sentence count, reading time, etc.',
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to analyze' },
      },
      required: ['text'],
    },
  },
  {
    name: 'text_transform',
    description: 'Transform text: uppercase, lowercase, title case, camelCase, snake_case, kebab-case, reverse, etc.',
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to transform' },
        transform: {
          type: 'string',
          enum: ['uppercase', 'lowercase', 'title_case', 'camel_case', 'snake_case', 'kebab_case', 'reverse', 'remove_duplicates', 'sort_lines', 'trim_lines', 'number_lines'],
          description: 'Transformation to apply',
        },
      },
      required: ['text', 'transform'],
    },
  },
  {
    name: 'text_diff',
    description: 'Compare two text strings and show line-by-line differences.',
    input_schema: {
      type: 'object',
      properties: {
        text_a: { type: 'string', description: 'First text' },
        text_b: { type: 'string', description: 'Second text' },
      },
      required: ['text_a', 'text_b'],
    },
  },
];

function toTitleCase(str) {
  return str.replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.substr(1).toLowerCase());
}
function toCamelCase(str) {
  return str.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '').replace(/^./, c => c.toLowerCase());
}
function toSnakeCase(str) {
  return str.replace(/[\s-]+/g, '_').replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '').replace(/__+/g, '_');
}
function toKebabCase(str) {
  return str.replace(/[\s_]+/g, '-').replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '').replace(/--+/g, '-');
}

export const handlers = {
  text_stats: async (params) => {
    const { text } = params;
    const words = text.trim().split(/\s+/).filter(Boolean);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const lines = text.split('\n');
    const avgWordLength = words.length > 0 ? (words.reduce((a, w) => a + w.length, 0) / words.length).toFixed(1) : 0;
    return {
      characters: text.length,
      characters_no_spaces: text.replace(/\s/g, '').length,
      words: words.length,
      sentences: sentences.length,
      paragraphs: paragraphs.length,
      lines: lines.length,
      avg_word_length: parseFloat(avgWordLength),
      reading_time_minutes: Math.ceil(words.length / 200),
      speaking_time_minutes: Math.ceil(words.length / 150),
      unique_words: new Set(words.map(w => w.toLowerCase())).size,
    };
  },
  text_transform: async (params) => {
    const { text, transform } = params;
    let result;
    switch (transform) {
      case 'uppercase': result = text.toUpperCase(); break;
      case 'lowercase': result = text.toLowerCase(); break;
      case 'title_case': result = toTitleCase(text); break;
      case 'camel_case': result = toCamelCase(text); break;
      case 'snake_case': result = toSnakeCase(text); break;
      case 'kebab_case': result = toKebabCase(text); break;
      case 'reverse': result = text.split('').reverse().join(''); break;
      case 'remove_duplicates': result = [...new Set(text.split('\n'))].join('\n'); break;
      case 'sort_lines': result = text.split('\n').sort().join('\n'); break;
      case 'trim_lines': result = text.split('\n').map(l => l.trim()).join('\n'); break;
      case 'number_lines': result = text.split('\n').map((l, i) => `${i + 1}: ${l}`).join('\n'); break;
      default: return { error: `Unknown transform: ${transform}` };
    }
    return { transform, result: result.slice(0, 10000) };
  },
  text_diff: async (params) => {
    const linesA = params.text_a.split('\n');
    const linesB = params.text_b.split('\n');
    const maxLen = Math.max(linesA.length, linesB.length);
    const diffs = [];
    for (let i = 0; i < maxLen && diffs.length < 100; i++) {
      if (linesA[i] !== linesB[i]) {
        diffs.push({
          line: i + 1,
          a: i < linesA.length ? linesA[i] : '(missing)',
          b: i < linesB.length ? linesB[i] : '(missing)',
        });
      }
    }
    return {
      identical: diffs.length === 0,
      lines_a: linesA.length,
      lines_b: linesB.length,
      differences: diffs.length,
      diff: diffs.slice(0, 30),
    };
  },
};
