import axios from 'axios';
import { getLogger } from '../utils/logger.js';

export const definitions = [
  {
    name: 'translate_text',
    description: 'Translate text between languages using MyMemory free translation API. Supports 50+ languages.',
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to translate' },
        from: { type: 'string', description: 'Source language code (e.g., "en", "ar", "fr", "es", "de", "ja", "zh"). Use "auto" for auto-detection.' },
        to: { type: 'string', description: 'Target language code (e.g., "en", "ar", "fr", "es", "de", "ja", "zh")' },
      },
      required: ['text', 'to'],
    },
  },
  {
    name: 'detect_language',
    description: 'Detect the language of a given text.',
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to detect language for' },
      },
      required: ['text'],
    },
  },
];

export const handlers = {
  translate_text: async (params) => {
    const logger = getLogger();
    const { text, from = 'auto', to } = params;
    if (!text.trim()) return { error: 'Empty text provided' };
    try {
      const langPair = `${from === 'auto' ? '' : from}|${to}`;
      const res = await axios.get('https://api.mymemory.translated.net/get', {
        params: { q: text.slice(0, 2000), langpair: langPair },
        timeout: 10000,
      });
      const data = res.data;
      if (data.responseStatus === 200 || data.responseStatus === '200') {
        return {
          original: text,
          translated: data.responseData.translatedText,
          from: from === 'auto' ? (data.responseData.detectedLanguage || 'auto') : from,
          to,
          confidence: data.responseData.match || null,
        };
      }
      return { error: data.responseDetails || 'Translation failed' };
    } catch (err) {
      logger.error(`translate_text failed: ${err.message}`);
      return { error: `Translation failed: ${err.message}` };
    }
  },
  detect_language: async (params) => {
    const logger = getLogger();
    try {
      const res = await axios.get('https://api.mymemory.translated.net/get', {
        params: { q: params.text.slice(0, 500), langpair: '|en' },
        timeout: 10000,
      });
      const detected = res.data.responseData?.detectedLanguage;
      return {
        text: params.text.slice(0, 100) + (params.text.length > 100 ? '...' : ''),
        detected_language: detected || 'unknown',
      };
    } catch (err) {
      logger.error(`detect_language failed: ${err.message}`);
      return { error: `Language detection failed: ${err.message}` };
    }
  },
};
