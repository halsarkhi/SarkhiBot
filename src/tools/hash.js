import { createHash, randomBytes, randomUUID } from 'crypto';
import { getLogger } from '../utils/logger.js';

export const definitions = [
  {
    name: 'hash_text',
    description: 'Generate a hash of text using various algorithms (md5, sha1, sha256, sha512).',
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to hash' },
        algorithm: { type: 'string', enum: ['md5', 'sha1', 'sha256', 'sha512'], description: 'Hash algorithm (default: sha256)' },
      },
      required: ['text'],
    },
  },
  {
    name: 'encode_decode',
    description: 'Encode or decode text using base64, URL encoding, or hex.',
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to encode/decode' },
        method: { type: 'string', enum: ['base64_encode', 'base64_decode', 'url_encode', 'url_decode', 'hex_encode', 'hex_decode'], description: 'Encoding method' },
      },
      required: ['text', 'method'],
    },
  },
  {
    name: 'generate_random',
    description: 'Generate random values: UUID, hex string, password, or random number.',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['uuid', 'hex', 'password', 'number'], description: 'Type of random value' },
        length: { type: 'number', description: 'Length for hex/password (default: 32)' },
        min: { type: 'number', description: 'Min value for number generation (default: 0)' },
        max: { type: 'number', description: 'Max value for number generation (default: 100)' },
      },
      required: ['type'],
    },
  },
];

export const handlers = {
  hash_text: async (params) => {
    const { text, algorithm = 'sha256' } = params;
    try {
      const hash = createHash(algorithm).update(text).digest('hex');
      return { algorithm, hash, input_length: text.length };
    } catch (err) {
      return { error: `Hashing failed: ${err.message}` };
    }
  },
  encode_decode: async (params) => {
    const { text, method } = params;
    try {
      let result;
      switch (method) {
        case 'base64_encode': result = Buffer.from(text).toString('base64'); break;
        case 'base64_decode': result = Buffer.from(text, 'base64').toString('utf-8'); break;
        case 'url_encode': result = encodeURIComponent(text); break;
        case 'url_decode': result = decodeURIComponent(text); break;
        case 'hex_encode': result = Buffer.from(text).toString('hex'); break;
        case 'hex_decode': result = Buffer.from(text, 'hex').toString('utf-8'); break;
        default: return { error: `Unknown method: ${method}` };
      }
      return { method, result };
    } catch (err) {
      return { error: `Encoding/decoding failed: ${err.message}` };
    }
  },
  generate_random: async (params) => {
    const { type, length = 32, min = 0, max = 100 } = params;
    switch (type) {
      case 'uuid': return { type, value: randomUUID() };
      case 'hex': return { type, value: randomBytes(Math.min(length, 256)).toString('hex').slice(0, length) };
      case 'password': {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+';
        const len = Math.min(Math.max(length, 8), 128);
        const bytes = randomBytes(len);
        let pw = '';
        for (let i = 0; i < len; i++) pw += chars[bytes[i] % chars.length];
        return { type, value: pw, length: len };
      }
      case 'number': {
        const range = max - min;
        const value = min + (randomBytes(4).readUInt32BE() / 0xFFFFFFFF) * range;
        return { type, value: Math.round(value * 100) / 100, min, max };
      }
      default: return { error: `Unknown type: ${type}` };
    }
  },
};
