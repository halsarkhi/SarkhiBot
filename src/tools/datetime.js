import { getLogger } from '../utils/logger.js';

export const definitions = [
  {
    name: 'current_time',
    description: 'Get the current date and time, optionally in a specific timezone.',
    input_schema: {
      type: 'object',
      properties: {
        timezone: { type: 'string', description: 'IANA timezone (e.g., "America/New_York", "Asia/Tokyo", "Europe/London"). Default: system timezone.' },
      },
    },
  },
  {
    name: 'time_diff',
    description: 'Calculate the difference between two dates/times.',
    input_schema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'Start date/time (ISO 8601 or natural like "2024-01-15")' },
        to: { type: 'string', description: 'End date/time (ISO 8601 or "now" for current time)' },
      },
      required: ['from', 'to'],
    },
  },
  {
    name: 'timestamp_convert',
    description: 'Convert between Unix timestamps and human-readable dates.',
    input_schema: {
      type: 'object',
      properties: {
        value: { type: 'string', description: 'Unix timestamp (seconds or milliseconds) or ISO date string' },
        to: { type: 'string', enum: ['unix', 'unix_ms', 'iso', 'readable'], description: 'Target format' },
      },
      required: ['value', 'to'],
    },
  },
  {
    name: 'world_clocks',
    description: 'Show current time in multiple major cities around the world.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
];

const WORLD_CITIES = [
  { city: 'New York', tz: 'America/New_York' },
  { city: 'London', tz: 'Europe/London' },
  { city: 'Paris', tz: 'Europe/Paris' },
  { city: 'Dubai', tz: 'Asia/Dubai' },
  { city: 'Mumbai', tz: 'Asia/Kolkata' },
  { city: 'Tokyo', tz: 'Asia/Tokyo' },
  { city: 'Sydney', tz: 'Australia/Sydney' },
  { city: 'Riyadh', tz: 'Asia/Riyadh' },
  { city: 'Berlin', tz: 'Europe/Berlin' },
  { city: 'Los Angeles', tz: 'America/Los_Angeles' },
];

export const handlers = {
  current_time: async (params) => {
    const { timezone } = params;
    const now = new Date();
    try {
      const opts = { dateStyle: 'full', timeStyle: 'long' };
      if (timezone) opts.timeZone = timezone;
      return {
        iso: now.toISOString(),
        readable: now.toLocaleString('en-US', opts),
        unix: Math.floor(now.getTime() / 1000),
        unix_ms: now.getTime(),
        timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        day_of_week: now.toLocaleDateString('en-US', { weekday: 'long', ...(timezone ? { timeZone: timezone } : {}) }),
      };
    } catch (err) {
      return { error: `Invalid timezone: ${err.message}` };
    }
  },
  time_diff: async (params) => {
    const { from, to } = params;
    try {
      const d1 = new Date(from);
      const d2 = to === 'now' ? new Date() : new Date(to);
      if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return { error: 'Invalid date format' };
      const diffMs = Math.abs(d2 - d1);
      const seconds = Math.floor(diffMs / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      const weeks = Math.floor(days / 7);
      const months = Math.floor(days / 30.44);
      const years = Math.floor(days / 365.25);
      return {
        from: d1.toISOString(), to: d2.toISOString(), direction: d2 > d1 ? 'forward' : 'backward',
        difference: { years, months, weeks, days, hours, minutes, seconds, milliseconds: diffMs },
        human: years > 0 ? `${years} year(s), ${days % 365} day(s)` :
               days > 0 ? `${days} day(s), ${hours % 24} hour(s)` :
               hours > 0 ? `${hours} hour(s), ${minutes % 60} minute(s)` :
               `${minutes} minute(s), ${seconds % 60} second(s)`,
      };
    } catch (err) {
      return { error: `Date diff failed: ${err.message}` };
    }
  },
  timestamp_convert: async (params) => {
    const { value, to } = params;
    try {
      let date;
      const num = Number(value);
      if (!isNaN(num)) {
        date = num > 1e12 ? new Date(num) : new Date(num * 1000);
      } else {
        date = new Date(value);
      }
      if (isNaN(date.getTime())) return { error: 'Could not parse input value as a date or timestamp' };
      switch (to) {
        case 'unix': return { input: value, result: Math.floor(date.getTime() / 1000) };
        case 'unix_ms': return { input: value, result: date.getTime() };
        case 'iso': return { input: value, result: date.toISOString() };
        case 'readable': return { input: value, result: date.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'long' }) };
        default: return { error: `Unknown target format: ${to}` };
      }
    } catch (err) {
      return { error: `Conversion failed: ${err.message}` };
    }
  },
  world_clocks: async () => {
    const now = new Date();
    return {
      clocks: WORLD_CITIES.map(({ city, tz }) => ({
        city, timezone: tz,
        time: now.toLocaleString('en-US', { timeZone: tz, timeStyle: 'short', dateStyle: 'short' }),
      })),
    };
  },
};
