import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { genId } from './ids.js';

const DATA_DIR = join(homedir(), '.sarkhibot');
const SNIPPETS_FILE = join(DATA_DIR, 'snippets.json');

let _snippets = null;

function load() {
  if (_snippets) return _snippets;
  mkdirSync(DATA_DIR, { recursive: true });
  if (existsSync(SNIPPETS_FILE)) {
    try { _snippets = JSON.parse(readFileSync(SNIPPETS_FILE, 'utf-8')); } catch { _snippets = []; }
  } else {
    _snippets = [];
  }
  return _snippets;
}

function save() {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(SNIPPETS_FILE, JSON.stringify(_snippets, null, 2));
}

export function addSnippet(chatId, name, code, language = '') {
  const snippets = load();
  const existing = snippets.findIndex(s => s.chatId === chatId && s.name === name);
  if (existing >= 0) {
    snippets[existing].code = code;
    snippets[existing].language = language;
    snippets[existing].updatedAt = new Date().toISOString();
    save();
    return snippets[existing];
  }
  const snippet = {
    id: genId('sn'),
    chatId,
    name,
    code,
    language,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  snippets.push(snippet);
  _snippets = snippets;
  save();
  return snippet;
}

export function getSnippet(chatId, name) {
  return load().find(s => s.chatId === chatId && s.name === name) || null;
}

export function listSnippets(chatId) {
  return load().filter(s => s.chatId === chatId);
}

export function deleteSnippet(chatId, name) {
  const snippets = load();
  const idx = snippets.findIndex(s => s.chatId === chatId && s.name === name);
  if (idx === -1) return false;
  snippets.splice(idx, 1);
  save();
  return true;
}

export function searchSnippets(chatId, query) {
  const lower = query.toLowerCase();
  return load().filter(s =>
    s.chatId === chatId &&
    (s.name.toLowerCase().includes(lower) || s.code.toLowerCase().includes(lower) || s.language.toLowerCase().includes(lower))
  );
}
