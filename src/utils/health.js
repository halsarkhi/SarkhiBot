import { getLogger } from './logger.js';
import os from 'os';

/**
 * Health check system — monitors bot health, uptime, and resource usage.
 * Used by /health and /stats commands and the dashboard.
 */

const startTime = Date.now();
const counters = {
  messagesReceived: 0,
  messagesProcessed: 0,
  commandsExecuted: 0,
  toolCalls: 0,
  jobsDispatched: 0,
  jobsCompleted: 0,
  jobsFailed: 0,
  errors: 0,
  apiCalls: 0,
};

export function incrementCounter(name, amount = 1) {
  if (name in counters) counters[name] += amount;
}

export function getCounters() {
  return { ...counters };
}

export function getUptime() {
  const uptimeMs = Date.now() - startTime;
  const seconds = Math.floor(uptimeMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  return {
    ms: uptimeMs,
    seconds,
    human: days > 0 ? `${days}d ${hours % 24}h ${minutes % 60}m` :
           hours > 0 ? `${hours}h ${minutes % 60}m ${seconds % 60}s` :
           `${minutes}m ${seconds % 60}s`,
    started_at: new Date(startTime).toISOString(),
  };
}

export function getSystemHealth() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const cpus = os.cpus();
  const loadAvg = os.loadavg();

  return {
    uptime: getUptime(),
    system: {
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      node_version: process.version,
      os_uptime_hours: Math.floor(os.uptime() / 3600),
    },
    memory: {
      total_gb: (totalMem / 1073741824).toFixed(2),
      used_gb: (usedMem / 1073741824).toFixed(2),
      free_gb: (freeMem / 1073741824).toFixed(2),
      usage_percent: ((usedMem / totalMem) * 100).toFixed(1),
      process_mb: (process.memoryUsage().heapUsed / 1048576).toFixed(1),
    },
    cpu: {
      cores: cpus.length,
      model: cpus[0]?.model || 'Unknown',
      load_1m: loadAvg[0]?.toFixed(2),
      load_5m: loadAvg[1]?.toFixed(2),
      load_15m: loadAvg[2]?.toFixed(2),
    },
    counters: getCounters(),
    status: usedMem / totalMem > 0.95 ? 'warning' : 'healthy',
  };
}

export function getHealthSummary() {
  const health = getSystemHealth();
  return [
    `🤖 *SarkhiBot Health Report*`,
    ``,
    `⏱ *Uptime:* ${health.uptime.human}`,
    `📊 *Status:* ${health.status === 'healthy' ? '🟢 Healthy' : '🟡 Warning'}`,
    ``,
    `💾 *Memory:* ${health.memory.used_gb}/${health.memory.total_gb} GB (${health.memory.usage_percent}%)`,
    `🧠 *Process:* ${health.memory.process_mb} MB`,
    `💻 *CPU:* ${health.cpu.cores} cores, load: ${health.cpu.load_1m}`,
    ``,
    `📨 *Messages:* ${health.counters.messagesReceived} received, ${health.counters.messagesProcessed} processed`,
    `🔧 *Tools:* ${health.counters.toolCalls} calls`,
    `📋 *Jobs:* ${health.counters.jobsDispatched} dispatched, ${health.counters.jobsCompleted} completed, ${health.counters.jobsFailed} failed`,
    `❌ *Errors:* ${health.counters.errors}`,
  ].join('\n');
}
