import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { genId } from './ids.js';

const DATA_DIR = join(homedir(), '.sarkhibot');
const TODO_FILE = join(DATA_DIR, 'todos.json');

let _todos = null;

function load() {
  if (_todos) return _todos;
  mkdirSync(DATA_DIR, { recursive: true });
  if (existsSync(TODO_FILE)) {
    try { _todos = JSON.parse(readFileSync(TODO_FILE, 'utf-8')); } catch { _todos = []; }
  } else {
    _todos = [];
  }
  return _todos;
}

function save() {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(TODO_FILE, JSON.stringify(_todos, null, 2));
}

export function addTodo(chatId, text, priority = 'normal') {
  const todos = load();
  const todo = {
    id: genId('td'),
    chatId,
    text,
    priority,
    done: false,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
  todos.push(todo);
  _todos = todos;
  save();
  return todo;
}

export function listTodos(chatId, { showDone = false } = {}) {
  let todos = load().filter(t => t.chatId === chatId);
  if (!showDone) todos = todos.filter(t => !t.done);
  return todos.sort((a, b) => {
    const order = { high: 0, normal: 1, low: 2 };
    return (order[a.priority] ?? 1) - (order[b.priority] ?? 1);
  });
}

export function completeTodo(id) {
  const todos = load();
  const todo = todos.find(t => t.id === id);
  if (!todo) return null;
  todo.done = !todo.done;
  todo.completedAt = todo.done ? new Date().toISOString() : null;
  save();
  return todo;
}

export function deleteTodo(id) {
  const todos = load();
  const idx = todos.findIndex(t => t.id === id);
  if (idx === -1) return false;
  todos.splice(idx, 1);
  save();
  return true;
}

export function clearDone(chatId) {
  _todos = load().filter(t => !(t.chatId === chatId && t.done));
  save();
  return true;
}

export function formatTodoList(chatId) {
  const todos = listTodos(chatId);
  if (todos.length === 0) return '📝 No active tasks. Use `/todo add <task>` to create one.';
  const priorityEmoji = { high: '🔴', normal: '🟡', low: '🟢' };
  const lines = todos.map((t, i) => {
    const emoji = priorityEmoji[t.priority] || '🟡';
    const check = t.done ? '✅' : '⬜';
    return `${check} ${emoji} ${t.text} _(${t.id.slice(0, 6)})_`;
  });
  return `📝 *Todo List* (${todos.length} active)\n\n${lines.join('\n')}`;
}
