import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, copyFileSync, statSync, rmSync, unlinkSync } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';
import { getLogger } from './logger.js';

const DATA_DIR = join(homedir(), '.sarkhibot');
const BACKUP_DIR = join(DATA_DIR, 'backups');
const MAX_BACKUPS = 10;

/**
 * Create a full backup of all SarkhiBot data.
 */
export function createBackup() {
  const logger = getLogger();
  mkdirSync(BACKUP_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFolder = join(BACKUP_DIR, `backup-${timestamp}`);
  mkdirSync(backupFolder, { recursive: true });

  const filesToBackup = [
    'conversations.json',
    'automations.json',
    'custom_skills.json',
    'reminders.json',
    'notes.json',
    'snippets.json',
    'todos.json',
  ];

  let backed = 0;
  for (const file of filesToBackup) {
    const src = join(DATA_DIR, file);
    if (existsSync(src)) {
      copyFileSync(src, join(backupFolder, file));
      backed++;
    }
  }

  // Backup characters directory
  const charsDir = join(DATA_DIR, 'characters');
  if (existsSync(charsDir)) {
    const charBackup = join(backupFolder, 'characters');
    copyDirRecursive(charsDir, charBackup);
    backed++;
  }

  // Backup analytics
  const analyticsDir = join(DATA_DIR, 'analytics');
  if (existsSync(analyticsDir)) {
    const analyticsBackup = join(backupFolder, 'analytics');
    copyDirRecursive(analyticsDir, analyticsBackup);
    backed++;
  }

  // Prune old backups
  pruneBackups();

  logger.info(`[Backup] Created backup: ${backupFolder} (${backed} items)`);
  return { path: backupFolder, items: backed, timestamp };
}

function copyDirRecursive(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    const stat = statSync(srcPath);
    if (stat.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

function pruneBackups() {
  if (!existsSync(BACKUP_DIR)) return;
  const backups = readdirSync(BACKUP_DIR)
    .filter(d => d.startsWith('backup-'))
    .sort()
    .reverse();

  while (backups.length > MAX_BACKUPS) {
    const old = backups.pop();
    const oldPath = join(BACKUP_DIR, old);
    try {
      rmSync(oldPath, { recursive: true, force: true });
    } catch {}
  }
}

export function listBackups() {
  mkdirSync(BACKUP_DIR, { recursive: true });
  return readdirSync(BACKUP_DIR)
    .filter(d => d.startsWith('backup-'))
    .sort()
    .reverse()
    .map(d => ({
      name: d,
      path: join(BACKUP_DIR, d),
      date: d.replace('backup-', '').replace(/-/g, ':').slice(0, 19),
    }));
}

export function restoreBackup(backupName) {
  const logger = getLogger();
  const backupPath = join(BACKUP_DIR, backupName);
  if (!existsSync(backupPath)) return { error: `Backup not found: ${backupName}` };

  let restored = 0;
  const files = readdirSync(backupPath);
  for (const file of files) {
    const src = join(backupPath, file);
    const stat = statSync(src);
    if (stat.isFile()) {
      copyFileSync(src, join(DATA_DIR, file));
      restored++;
    } else if (stat.isDirectory()) {
      copyDirRecursive(src, join(DATA_DIR, file));
      restored++;
    }
  }

  logger.info(`[Backup] Restored from ${backupName}: ${restored} items`);
  return { success: true, restored, backup: backupName };
}
