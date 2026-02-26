import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { genId } from './ids.js';

const DATA_DIR = join(homedir(), '.sarkhibot');
const NOTES_FILE = join(DATA_DIR, 'notes.json');

let _notes = null;

function load() {
  if (_notes) return _notes;
  mkdirSync(DATA_DIR, { recursive: true });
  if (existsSync(NOTES_FILE)) {
    try { _notes = JSON.parse(readFileSync(NOTES_FILE, 'utf-8')); } catch { _notes = []; }
  } else {
    _notes = [];
  }
  return _notes;
}

function save() {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(NOTES_FILE, JSON.stringify(_notes, null, 2));
}

export function addNote(chatId, text, tags = []) {
  const notes = load();
  const note = {
    id: genId('nt'),
    chatId,
    text,
    tags,
    pinned: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  notes.push(note);
  _notes = notes;
  save();
  return note;
}

export function listNotes(chatId, { tag, pinned, search } = {}) {
  let notes = load().filter(n => n.chatId === chatId);
  if (tag) notes = notes.filter(n => n.tags.includes(tag));
  if (pinned !== undefined) notes = notes.filter(n => n.pinned === pinned);
  if (search) {
    const lower = search.toLowerCase();
    notes = notes.filter(n => n.text.toLowerCase().includes(lower) || n.tags.some(t => t.toLowerCase().includes(lower)));
  }
  return notes;
}

export function pinNote(id) {
  const notes = load();
  const note = notes.find(n => n.id === id);
  if (!note) return null;
  note.pinned = !note.pinned;
  note.updatedAt = new Date().toISOString();
  save();
  return note;
}

export function deleteNote(id) {
  const notes = load();
  const idx = notes.findIndex(n => n.id === id);
  if (idx === -1) return false;
  notes.splice(idx, 1);
  save();
  return true;
}

export function getNoteById(id) {
  return load().find(n => n.id === id) || null;
}
