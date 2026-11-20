// The roster page: students, working groups, the owner's Meet names, backup and CSV.
// `?fake` uses the demo roster and history in an in-memory store.

import { createStore } from '../store.js';
import { el, button, $ } from '../dom.js';
import { DEMO } from '../panel/demo.js';
import { createGroup, deleteGroup } from '../logic/roster.js';
import { timeline, historyToCsv, exportBackup, parseBackup } from '../logic/history.js';
import { TRACKS, trackLabel } from '../logic/stages.js';

const REPLACE_QUESTION = 'Replace the roster and history with this file?';

const fake = new URLSearchParams(location.search).has('fake');
const store = fake
  ? createStore({ memory: true, seed: { roster: DEMO.roster, history: DEMO.history } })
  : createStore();

let roster;
let history;

// Runs a change on the roster, saves it, then re-renders.
async function act(change) {
  change();
  await store.save({ roster });
  render();
}

function select(options, current, onchange) {
  const node = el('select', {}, ...options.map(([value, text]) => el('option', { value, textContent: text })));
  node.value = current ?? '';
  node.onchange = () => onchange(node.value || null);
  return node;
}

const groupOptions = () => [['', 'none'], ...Object.entries(roster.groups).map(([id, g]) => [id, g.name])];

function studentRow(key, student) {
  return el('tr', {},
    el('td', { textContent: student.name }),
    el('td', {}, select([['', '–'], ...TRACKS.map(t => [t, trackLabel(t)])], student.track,
      track => act(() => { student.track = track; }))),
    el('td', {}, button('★', () => act(() => { student.active = !student.active; }),
      { ariaPressed: String(student.active), title: 'Active' })),
    el('td', {}, select(groupOptions(), student.group, group => act(() => { student.group = group; }))),
    el('td', { className: 'timeline' }, ...timeline(history, key).map(entry => el('span', {
      textContent: entry.stage ?? '–',
      title: entry.startedAt.slice(0, 10),
      className: entry.source === 'guess' ? 'guess' : '',
    }))));
}

function groupLine(id, group) {
  const name = el('input', { value: group.name });
  name.onchange = () => act(() => { group.name = name.value; });
  const members = Object.values(roster.students).filter(s => s.group === id).map(s => s.name);
  return el('li', {}, name, el('span', { className: 'members', textContent: members.join(', ') }),
    button('Delete', () => {
      if (confirm(`Delete the working group ${group.name}?`)) act(() => deleteGroup(roster, id));
    }));
}

function render() {
  const students = Object.entries(roster.students).sort(([, a], [, b]) => a.name.localeCompare(b.name));
  $('students').replaceChildren(...students.map(([key, s]) => studentRow(key, s)));
  $('groups').replaceChildren(...Object.entries(roster.groups).map(([id, g]) => groupLine(id, g)));
  $('owner-names').value = roster.ownerNames.join('\n');
}

const today = () => new Date().toISOString().slice(0, 10);

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  el('a', { href: url, download: name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function importBackup(file) {
  let data;
  try {
    data = parseBackup(await file.text());
  } catch (error) {
    $('import-error').textContent = error.message;
    $('import-error').hidden = false;
    return;
  }
  $('import-error').hidden = true;
  if (!confirm(REPLACE_QUESTION)) return;
  ({ roster, history } = data);
  await store.save({ roster, history });
  render();
}

$('new-group').addEventListener('submit', event => {
  event.preventDefault();
  const name = $('new-group-name').value.trim();
  if (!name) return;
  $('new-group-name').value = '';
  act(() => createGroup(roster, name));
});

$('owner-names').addEventListener('change', () => act(() => {
  roster.ownerNames = $('owner-names').value.split('\n').map(line => line.trim()).filter(Boolean);
}));

$('export-backup').addEventListener('click', () =>
  download(`mentoring-backup-${today()}.json`, exportBackup({ roster, history }, new Date().toISOString()), 'application/json'));
$('export-csv').addEventListener('click', () =>
  download(`mentoring-history-${today()}.csv`, historyToCsv(history), 'text/csv'));

$('import').addEventListener('change', async () => {
  const file = $('import').files[0];
  $('import').value = '';
  if (file) await importBackup(file);
});

async function open() {
  ({ roster, history } = await store.load());
  store.onChange(changes => {
    if (!changes.roster && !changes.history) return;
    if (changes.roster) roster = changes.roster;
    if (changes.history) history = changes.history;
    render();
  });
  render();
}

open();
