import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { getLogger } from './logger.js';

const ANALYTICS_DIR = join(homedir(), '.sarkhibot', 'analytics');
const STATS_FILE = join(ANALYTICS_DIR, 'stats.json');

const DEFAULT_STATS = {
  totalMessages: 0,
  totalCommands: 0,
  totalJobs: 0,
  totalToolCalls: 0,
  commandUsage: {},
  toolUsage: {},
  workerUsage: {},
  dailyMessages: {},
  userActivity: {},
  peakHour: {},
  firstSeen: null,
  lastActive: null,
};

let _stats = null;

function load() {
  if (_stats) return _stats;
  mkdirSync(ANALYTICS_DIR, { recursive: true });
  if (existsSync(STATS_FILE)) {
    try {
      _stats = { ...DEFAULT_STATS, ...JSON.parse(readFileSync(STATS_FILE, 'utf-8')) };
    } catch {
      _stats = { ...DEFAULT_STATS };
    }
  } else {
    _stats = { ...DEFAULT_STATS };
  }
  if (!_stats.firstSeen) _stats.firstSeen = new Date().toISOString();
  return _stats;
}

function save() {
  try {
    mkdirSync(ANALYTICS_DIR, { recursive: true });
    writeFileSync(STATS_FILE, JSON.stringify(_stats, null, 2));
  } catch (err) {
    getLogger().error(`[Analytics] Failed to save: ${err.message}`);
  }
}

export function trackMessage(userId) {
  const stats = load();
  stats.totalMessages++;
  stats.lastActive = new Date().toISOString();
  const today = new Date().toISOString().slice(0, 10);
  stats.dailyMessages[today] = (stats.dailyMessages[today] || 0) + 1;
  const hour = new Date().getHours();
  stats.peakHour[hour] = (stats.peakHour[hour] || 0) + 1;
  if (userId) stats.userActivity[userId] = (stats.userActivity[userId] || 0) + 1;
  save();
}

export function trackCommand(command) {
  const stats = load();
  stats.totalCommands++;
  stats.commandUsage[command] = (stats.commandUsage[command] || 0) + 1;
  save();
}

export function trackToolCall(toolName) {
  const stats = load();
  stats.totalToolCalls++;
  stats.toolUsage[toolName] = (stats.toolUsage[toolName] || 0) + 1;
  save();
}

export function trackJob(workerType) {
  const stats = load();
  stats.totalJobs++;
  stats.workerUsage[workerType] = (stats.workerUsage[workerType] || 0) + 1;
  save();
}

export function getStats() {
  return load();
}

export function getStatsSummary() {
  const stats = load();
  const topCommands = Object.entries(stats.commandUsage).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topTools = Object.entries(stats.toolUsage).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topWorkers = Object.entries(stats.workerUsage).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const peakHour = Object.entries(stats.peakHour).sort((a, b) => b[1] - a[1])[0];

  return [
    `📊 *SarkhiBot Usage Statistics*`,
    ``,
    `📨 *Total messages:* ${stats.totalMessages}`,
    `⚡ *Total commands:* ${stats.totalCommands}`,
    `🔧 *Total tool calls:* ${stats.totalToolCalls}`,
    `📋 *Total jobs:* ${stats.totalJobs}`,
    `📅 *First seen:* ${stats.firstSeen ? stats.firstSeen.slice(0, 10) : 'N/A'}`,
    `🕐 *Last active:* ${stats.lastActive || 'N/A'}`,
    ``,
    `🏆 *Top Commands:*`,
    ...topCommands.map(([cmd, n]) => `  /${cmd}: ${n}x`),
    ``,
    `🔧 *Top Tools:*`,
    ...topTools.map(([tool, n]) => `  ${tool}: ${n}x`),
    ``,
    `👷 *Top Workers:*`,
    ...topWorkers.map(([w, n]) => `  ${w}: ${n}x`),
    peakHour ? `\n⏰ *Peak hour:* ${peakHour[0]}:00 (${peakHour[1]} messages)` : '',
  ].filter(Boolean).join('\n');
}

export function resetStats() {
  _stats = { ...DEFAULT_STATS, firstSeen: new Date().toISOString() };
  save();
}
