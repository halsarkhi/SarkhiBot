import axios from 'axios';
import { getLogger } from '../utils/logger.js';

export const definitions = [
  {
    name: 'http_request',
    description: 'Make an HTTP request with full control over method, headers, body, and query params. More powerful than curl_url.',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Request URL' },
        method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'], description: 'HTTP method (default: GET)' },
        headers: { type: 'object', description: 'Request headers as key-value pairs' },
        body: { type: 'string', description: 'Request body (string or JSON string)' },
        query: { type: 'object', description: 'Query parameters as key-value pairs' },
        timeout: { type: 'number', description: 'Timeout in seconds (default: 30)' },
        follow_redirects: { type: 'boolean', description: 'Follow redirects (default: true)' },
      },
      required: ['url'],
    },
  },
  {
    name: 'api_health_check',
    description: 'Check if an API endpoint is reachable and measure response time.',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to check' },
        expected_status: { type: 'number', description: 'Expected HTTP status code (default: 200)' },
      },
      required: ['url'],
    },
  },
];

export const handlers = {
  http_request: async (params) => {
    const logger = getLogger();
    const { url, method = 'GET', headers = {}, body, query, timeout = 30, follow_redirects = true } = params;
    try {
      const config = {
        method: method.toLowerCase(),
        url,
        headers,
        timeout: timeout * 1000,
        maxRedirects: follow_redirects ? 5 : 0,
        validateStatus: () => true,
      };
      if (query) config.params = query;
      if (body) {
        try { config.data = JSON.parse(body); } catch { config.data = body; }
      }
      const start = Date.now();
      const res = await axios(config);
      const elapsed = Date.now() - start;
      let responseBody = res.data;
      if (typeof responseBody === 'object') responseBody = JSON.stringify(responseBody, null, 2);
      if (typeof responseBody === 'string' && responseBody.length > 10000) responseBody = responseBody.slice(0, 10000) + '... (truncated)';
      return {
        status: res.status,
        status_text: res.statusText,
        headers: Object.fromEntries(Object.entries(res.headers).slice(0, 20)),
        body: responseBody,
        elapsed_ms: elapsed,
      };
    } catch (err) {
      logger.error(`http_request failed: ${err.message}`);
      return { error: `Request failed: ${err.message}` };
    }
  },
  api_health_check: async (params) => {
    const { url, expected_status = 200 } = params;
    const start = Date.now();
    try {
      const res = await axios.get(url, { timeout: 10000, validateStatus: () => true });
      const elapsed = Date.now() - start;
      return {
        url,
        healthy: res.status === expected_status,
        status: res.status,
        response_time_ms: elapsed,
        performance: elapsed < 200 ? 'excellent' : elapsed < 1000 ? 'good' : elapsed < 3000 ? 'slow' : 'very slow',
      };
    } catch (err) {
      return { url, healthy: false, error: err.message, response_time_ms: Date.now() - start };
    }
  },
};
