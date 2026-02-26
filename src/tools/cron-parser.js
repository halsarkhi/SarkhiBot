import { getLogger } from '../utils/logger.js';

export const definitions = [
  {
    name: 'cron_explain',
    description: 'Explain a cron expression in human-readable format and show next run times.',
    input_schema: {
      type: 'object',
      properties: {
        expression: { type: 'string', description: 'Cron expression (e.g., "0 */2 * * *", "30 9 * * 1-5")' },
        count: { type: 'number', description: 'Number of next run times to show (default: 5, max: 20)' },
      },
      required: ['expression'],
    },
  },
  {
    name: 'cron_build',
    description: 'Build a cron expression from a human-readable schedule description.',
    input_schema: {
      type: 'object',
      properties: {
        schedule: { type: 'string', description: 'Human description (e.g., "every 2 hours", "daily at 9am", "weekdays at 5:30pm", "every Monday at noon")' },
      },
      required: ['schedule'],
    },
  },
];

const FIELD_NAMES = ['minute', 'hour', 'day_of_month', 'month', 'day_of_week'];
const FIELD_RANGES = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 7]];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function explainField(value, fieldIndex) {
  if (value === '*') return 'every ' + FIELD_NAMES[fieldIndex];
  if (value.startsWith('*/')) return `every ${value.slice(2)} ${FIELD_NAMES[fieldIndex]}(s)`;
  if (value.includes(',')) return `at ${FIELD_NAMES[fieldIndex]}(s) ${value}`;
  if (value.includes('-')) return `${FIELD_NAMES[fieldIndex]}(s) ${value}`;
  if (fieldIndex === 4) return DAY_NAMES[parseInt(value) % 7] || value;
  return `${FIELD_NAMES[fieldIndex]} ${value}`;
}

function getNextRuns(parts, count) {
  const runs = [];
  const now = new Date();
  let check = new Date(now);
  check.setSeconds(0, 0);

  for (let i = 0; i < 525600 && runs.length < count; i++) {
    check = new Date(check.getTime() + 60000);
    if (matchesCron(parts, check)) {
      runs.push(check.toISOString());
    }
  }
  return runs;
}

function expandField(field, min, max) {
  if (field === '*') return null; // matches all
  const values = new Set();
  for (const part of field.split(',')) {
    if (part.includes('/')) {
      const [range, step] = part.split('/');
      const s = parseInt(step);
      const start = range === '*' ? min : parseInt(range);
      for (let v = start; v <= max; v += s) values.add(v);
    } else if (part.includes('-')) {
      const [a, b] = part.split('-').map(Number);
      for (let v = a; v <= b; v++) values.add(v);
    } else {
      values.add(parseInt(part));
    }
  }
  return values;
}

function matchesCron(parts, date) {
  const vals = [date.getMinutes(), date.getHours(), date.getDate(), date.getMonth() + 1, date.getDay()];
  for (let i = 0; i < 5; i++) {
    const allowed = expandField(parts[i], FIELD_RANGES[i][0], FIELD_RANGES[i][1]);
    if (allowed && !allowed.has(vals[i])) {
      if (i === 4 && allowed.has(7) && vals[i] === 0) continue; // 7 = Sunday
      return false;
    }
  }
  return true;
}

export const handlers = {
  cron_explain: async (params) => {
    const { expression, count = 5 } = params;
    const parts = expression.trim().split(/\s+/);
    if (parts.length < 5 || parts.length > 6) return { error: 'Invalid cron expression. Expected 5 fields: minute hour day month weekday' };

    const fields = parts.slice(0, 5);
    const explanation = fields.map((f, i) => `${FIELD_NAMES[i]}: ${explainField(f, i)}`);
    const nextRuns = getNextRuns(fields, Math.min(count, 20));

    return { expression, explanation, next_runs: nextRuns };
  },
  cron_build: async (params) => {
    const { schedule } = params;
    const lower = schedule.toLowerCase().trim();
    let cron;

    if (/every\s+(\d+)\s*min/i.test(lower)) {
      const m = lower.match(/every\s+(\d+)\s*min/i);
      cron = `*/${m[1]} * * * *`;
    } else if (/every\s+(\d+)\s*hour/i.test(lower)) {
      const m = lower.match(/every\s+(\d+)\s*hour/i);
      cron = `0 */${m[1]} * * *`;
    } else if (/daily\s+at\s+(\d{1,2}):?(\d{2})?\s*(am|pm)?/i.test(lower)) {
      const m = lower.match(/daily\s+at\s+(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
      let h = parseInt(m[1]);
      const min = parseInt(m[2] || '0');
      if (m[3] === 'pm' && h < 12) h += 12;
      if (m[3] === 'am' && h === 12) h = 0;
      cron = `${min} ${h} * * *`;
    } else if (/weekdays?\s+at\s+(\d{1,2}):?(\d{2})?\s*(am|pm)?/i.test(lower)) {
      const m = lower.match(/weekdays?\s+at\s+(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
      let h = parseInt(m[1]);
      const min = parseInt(m[2] || '0');
      if (m[3] === 'pm' && h < 12) h += 12;
      cron = `${min} ${h} * * 1-5`;
    } else if (/every\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(lower)) {
      const dayMap = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
      const m = lower.match(/every\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s*(?:at\s+(\d{1,2}):?(\d{2})?\s*(am|pm)?)?/i);
      const day = dayMap[m[1].toLowerCase()];
      let h = parseInt(m[2] || '9');
      const min = parseInt(m[3] || '0');
      if (m[4] === 'pm' && h < 12) h += 12;
      cron = `${min} ${h} * * ${day}`;
    } else if (lower.includes('hourly')) {
      cron = '0 * * * *';
    } else if (lower.includes('midnight')) {
      cron = '0 0 * * *';
    } else if (lower.includes('noon')) {
      cron = '0 12 * * *';
    } else {
      return { error: `Could not parse schedule: "${schedule}". Try: "every 5 minutes", "daily at 9am", "weekdays at 5:30pm", "every Monday at noon"` };
    }

    return { schedule, cron, explanation: `Generated: ${cron}` };
  },
};
