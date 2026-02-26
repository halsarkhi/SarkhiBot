import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { getLogger } from './logger.js';
import { genId } from './ids.js';

const DATA_DIR = join(homedir(), '.sarkhibot');
const REMINDERS_FILE = join(DATA_DIR, 'reminders.json');

let _reminders = null;
let _timers = new Map();
let _bot = null;

function load() {
  if (_reminders) return _reminders;
  mkdirSync(DATA_DIR, { recursive: true });
  if (existsSync(REMINDERS_FILE)) {
    try { _reminders = JSON.parse(readFileSync(REMINDERS_FILE, 'utf-8')); } catch { _reminders = []; }
  } else {
    _reminders = [];
  }
  return _reminders;
}

function save() {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(REMINDERS_FILE, JSON.stringify(_reminders, null, 2));
}

export function initReminders(bot) {
  _bot = bot;
  const reminders = load();
  const now = Date.now();
  for (const r of reminders) {
    if (!r.fired && r.triggerAt > now) {
      scheduleReminder(r);
    } else if (!r.fired && r.triggerAt <= now) {
      r.fired = true;
      // Fire missed reminders immediately
      if (_bot) {
        _bot.sendMessage(r.chatId, `⏰ *Reminder* (missed while offline):\n${r.text}`, { parse_mode: 'Markdown' }).catch(() => {});
      }
    }
  }
  save();
}

function scheduleReminder(reminder) {
  const delay = reminder.triggerAt - Date.now();
  if (delay <= 0) return;
  const timer = setTimeout(() => {
    reminder.fired = true;
    save();
    if (_bot) {
      _bot.sendMessage(reminder.chatId, `⏰ *Reminder:*\n${reminder.text}`, { parse_mode: 'Markdown' }).catch(() => {});
    }
    _timers.delete(reminder.id);
  }, delay);
  _timers.set(reminder.id, timer);
}

export function addReminder(chatId, text, delayMinutes) {
  const reminders = load();
  const reminder = {
    id: genId('rem'),
    chatId,
    text,
    createdAt: Date.now(),
    triggerAt: Date.now() + delayMinutes * 60000,
    fired: false,
  };
  reminders.push(reminder);
  _reminders = reminders;
  save();
  scheduleReminder(reminder);
  return reminder;
}

export function listReminders(chatId) {
  return load().filter(r => r.chatId === chatId && !r.fired);
}

export function cancelReminder(id) {
  const reminders = load();
  const idx = reminders.findIndex(r => r.id === id);
  if (idx === -1) return false;
  reminders[idx].fired = true;
  save();
  const timer = _timers.get(id);
  if (timer) { clearTimeout(timer); _timers.delete(id); }
  return true;
}

export function cleanupReminders() {
  const cutoff = Date.now() - 7 * 86400000;
  _reminders = load().filter(r => !r.fired || r.triggerAt > cutoff);
  save();
}

export function parseReminderTime(text) {
  const patterns = [
    { regex: /in\s+(\d+)\s*min/i, unit: 1 },
    { regex: /in\s+(\d+)\s*hour/i, unit: 60 },
    { regex: /in\s+(\d+)\s*hr/i, unit: 60 },
    { regex: /in\s+(\d+)\s*day/i, unit: 1440 },
    { regex: /in\s+(\d+)\s*week/i, unit: 10080 },
    { regex: /in\s+(\d+)\s*sec/i, unit: 1 / 60 },
  ];
  for (const { regex, unit } of patterns) {
    const match = text.match(regex);
    if (match) return parseInt(match[1]) * unit;
  }
  return null;
}
