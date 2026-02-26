import { promises as dns } from 'dns';
import { getLogger } from '../utils/logger.js';

export const definitions = [
  {
    name: 'dns_lookup',
    description: 'Perform DNS lookup for a domain name. Returns A, AAAA, MX, TXT, NS, CNAME records.',
    input_schema: {
      type: 'object',
      properties: {
        domain: { type: 'string', description: 'Domain name to look up (e.g., "google.com")' },
        record_type: { type: 'string', enum: ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA', 'ALL'], description: 'DNS record type (default: ALL)' },
      },
      required: ['domain'],
    },
  },
  {
    name: 'reverse_dns',
    description: 'Perform reverse DNS lookup for an IP address.',
    input_schema: {
      type: 'object',
      properties: {
        ip: { type: 'string', description: 'IP address to reverse look up' },
      },
      required: ['ip'],
    },
  },
  {
    name: 'whois_lookup',
    description: 'Get WHOIS information for a domain (uses shell whois command).',
    input_schema: {
      type: 'object',
      properties: {
        domain: { type: 'string', description: 'Domain name to look up' },
      },
      required: ['domain'],
    },
  },
];

async function safeLookup(fn, ...args) {
  try { return await fn(...args); } catch { return null; }
}

export const handlers = {
  dns_lookup: async (params) => {
    const logger = getLogger();
    const { domain, record_type = 'ALL' } = params;
    try {
      const result = { domain };
      if (record_type === 'ALL' || record_type === 'A') result.A = await safeLookup(dns.resolve4, domain);
      if (record_type === 'ALL' || record_type === 'AAAA') result.AAAA = await safeLookup(dns.resolve6, domain);
      if (record_type === 'ALL' || record_type === 'MX') result.MX = await safeLookup(dns.resolveMx, domain);
      if (record_type === 'ALL' || record_type === 'TXT') result.TXT = await safeLookup(dns.resolveTxt, domain);
      if (record_type === 'ALL' || record_type === 'NS') result.NS = await safeLookup(dns.resolveNs, domain);
      if (record_type === 'ALL' || record_type === 'CNAME') result.CNAME = await safeLookup(dns.resolveCname, domain);
      if (record_type === 'ALL' || record_type === 'SOA') result.SOA = await safeLookup(dns.resolveSoa, domain);
      return result;
    } catch (err) {
      logger.error(`dns_lookup failed: ${err.message}`);
      return { error: `DNS lookup failed: ${err.message}` };
    }
  },
  reverse_dns: async (params) => {
    try {
      const hostnames = await dns.reverse(params.ip);
      return { ip: params.ip, hostnames };
    } catch (err) {
      return { ip: params.ip, error: `Reverse DNS failed: ${err.message}` };
    }
  },
  whois_lookup: async (params) => {
    const { shellRun } = await import('../utils/shell.js');
    const result = await shellRun(`whois ${params.domain.replace(/[^a-zA-Z0-9.-]/g, '')}`, 15000);
    if (result.error) return { error: result.error };
    const output = result.output.slice(0, 3000);
    return { domain: params.domain, whois: output };
  },
};
