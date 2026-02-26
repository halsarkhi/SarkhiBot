import { getLogger } from '../utils/logger.js';

export const definitions = [
  {
    name: 'calculate',
    description: 'Evaluate a mathematical expression safely. Supports +, -, *, /, %, **, Math functions (sqrt, sin, cos, tan, log, abs, ceil, floor, round, PI, E, random).',
    input_schema: {
      type: 'object',
      properties: {
        expression: { type: 'string', description: 'Math expression to evaluate (e.g., "2 * (3 + 4)", "Math.sqrt(144)", "Math.PI * 5 ** 2")' },
      },
      required: ['expression'],
    },
  },
  {
    name: 'unit_convert',
    description: 'Convert between common units of measurement.',
    input_schema: {
      type: 'object',
      properties: {
        value: { type: 'number', description: 'The numeric value to convert' },
        from: { type: 'string', description: 'Source unit (e.g., "km", "mi", "kg", "lb", "c", "f", "l", "gal")' },
        to: { type: 'string', description: 'Target unit' },
      },
      required: ['value', 'from', 'to'],
    },
  },
  {
    name: 'base_convert',
    description: 'Convert numbers between bases (binary, octal, decimal, hex).',
    input_schema: {
      type: 'object',
      properties: {
        value: { type: 'string', description: 'The number to convert' },
        from_base: { type: 'number', description: 'Source base (2, 8, 10, 16)' },
        to_base: { type: 'number', description: 'Target base (2, 8, 10, 16)' },
      },
      required: ['value', 'from_base', 'to_base'],
    },
  },
];

const SAFE_MATH_PATTERN = /^[\d\s+\-*/%.()eE,Math.sqrtsincoantlogabceiflourndPIErandom]+$/;

const CONVERSIONS = {
  'km:mi': v => v * 0.621371, 'mi:km': v => v * 1.60934,
  'km:m': v => v * 1000, 'm:km': v => v / 1000,
  'm:ft': v => v * 3.28084, 'ft:m': v => v / 3.28084,
  'cm:in': v => v / 2.54, 'in:cm': v => v * 2.54,
  'kg:lb': v => v * 2.20462, 'lb:kg': v => v / 2.20462,
  'kg:g': v => v * 1000, 'g:kg': v => v / 1000,
  'g:oz': v => v / 28.3495, 'oz:g': v => v * 28.3495,
  'c:f': v => (v * 9 / 5) + 32, 'f:c': v => (v - 32) * 5 / 9,
  'c:k': v => v + 273.15, 'k:c': v => v - 273.15,
  'l:gal': v => v * 0.264172, 'gal:l': v => v / 0.264172,
  'l:ml': v => v * 1000, 'ml:l': v => v / 1000,
  'mb:gb': v => v / 1024, 'gb:mb': v => v * 1024,
  'gb:tb': v => v / 1024, 'tb:gb': v => v * 1024,
  'kb:mb': v => v / 1024, 'mb:kb': v => v * 1024,
  'b:kb': v => v / 1024, 'kb:b': v => v * 1024,
  'mph:kmh': v => v * 1.60934, 'kmh:mph': v => v / 1.60934,
  'min:sec': v => v * 60, 'sec:min': v => v / 60,
  'hr:min': v => v * 60, 'min:hr': v => v / 60,
  'day:hr': v => v * 24, 'hr:day': v => v / 24,
};

export const handlers = {
  calculate: async (params) => {
    const logger = getLogger();
    const { expression } = params;
    if (!expression || expression.length > 500) return { error: 'Expression too long or empty' };

    // Only allow safe characters
    const cleaned = expression.replace(/\s+/g, '');
    if (!SAFE_MATH_PATTERN.test(cleaned)) {
      return { error: 'Expression contains disallowed characters. Only numbers, operators (+,-,*,/,%,**), parentheses, and Math functions are allowed.' };
    }

    try {
      const fn = new Function(`"use strict"; return (${expression});`);
      const result = fn();
      if (typeof result !== 'number' || !isFinite(result)) {
        return { error: 'Expression did not evaluate to a finite number' };
      }
      return { expression, result };
    } catch (err) {
      logger.error(`calculate failed: ${err.message}`);
      return { error: `Evaluation failed: ${err.message}` };
    }
  },
  unit_convert: async (params) => {
    const { value, from, to } = params;
    const key = `${from.toLowerCase()}:${to.toLowerCase()}`;
    const converter = CONVERSIONS[key];
    if (!converter) return { error: `Unsupported conversion: ${from} → ${to}. Supported pairs: ${Object.keys(CONVERSIONS).join(', ')}` };
    const result = converter(value);
    return { value, from, to, result: Math.round(result * 10000) / 10000 };
  },
  base_convert: async (params) => {
    const { value, from_base, to_base } = params;
    const valid = [2, 8, 10, 16];
    if (!valid.includes(from_base) || !valid.includes(to_base)) return { error: 'Bases must be 2, 8, 10, or 16' };
    try {
      const decimal = parseInt(value, from_base);
      if (isNaN(decimal)) return { error: `Invalid number "${value}" for base ${from_base}` };
      return { value, from_base, to_base, result: decimal.toString(to_base).toUpperCase() };
    } catch (err) {
      return { error: `Conversion failed: ${err.message}` };
    }
  },
};
