// The side panel: starts a session, polls Meet into it and shows the live tally.
// `?fake` runs on the fake Meet, demo data and an in-memory store.

import { createStore } from '../store.js';
import { createMeetClient, findMeetTab } from './meet-client.js';
import { DEMO } from './demo.js';
import { createFakeMeet } from '../meet/fake-meet.js';
import { syncFromMeet } from '../logic/flow.js';
import { lastKnownStages } from '../logic/history.js';
import { createSession, setStage, setIgnored, setLone, setMix, summarize, endSession } from '../logic/session.js';
import { STAGES, stage } from '../logic/stages.js';

const POLL_MS = 2000;
const END_ARMED_MS = 5000;
const NO_MEET_TAB = 'Open the Meet call in this window, then press Start.';
const ROSTER_PAGE = 'src/roster-page/roster-page.html';

const fake = new URLSearchParams(location.search).has('fake');
const store = fake
  ? createStore({ memory: true, seed: { roster: DEMO.roster, history: DEMO.history } })
  : createStore();
const fakeMeet = fake ? createFakeMeet({ participants: DEMO.participants }) : null;

const $ = id => document.getElementById(id);

let ctx;
let session = null;
let meet = null;
let errors = [];
let notice = null;
let pollTimer = null;
let endTimer = null;
let rendered = null;

// The Meet to talk to and its meeting code, or null when no Meet tab is found.
async function findMeet(meetingCode) {
  if (fake) return { meet: fakeMeet, meetingCode: 'abc-defg-hij' };
  const tab = await findMeetTab(meetingCode);
  return tab && { meet: createMeetClient(tab.tabId), meetingCode: tab.meetingCode };
}

async function poll() {
  pollTimer = null;
  const polled = session;
  if (!meet) meet = (await findMeet(polled.meetingCode))?.meet ?? null;
  if (session !== polled) return;
  notice = meet ? null : NO_MEET_TAB;
  if (meet) {
    const before = JSON.stringify(ctx.roster);
    const failures = await syncFromMeet(meet, session, ctx);
    if (session !== polled) return;
    errors = failures;
    await store.save(JSON.stringify(ctx.roster) === before ? { current: session } : { current: session, roster: ctx.roster });
  }
  render();
  if (session === polled) pollTimer = setTimeout(poll, POLL_MS);
}

async function start() {
  const found = await findMeet();
  if (!found) {
    notice = NO_MEET_TAB;
    render();
    return;
  }
  meet = found.meet;
  notice = null;
  session = createSession({ startedAt: new Date().toISOString(), meetingCode: found.meetingCode });
  await store.save({ current: session });
  poll();
}

async function end() {
  if (!endTimer) {
    endTimer = setTimeout(() => { endTimer = null; render(); }, END_ARMED_MS);
    render();
    return;
  }
  clearTimeout(endTimer);
  endTimer = null;
  clearTimeout(pollTimer);
  const record = endSession(session, ctx);
  session = null;
  meet = null;
  errors = [];
  notice = null;
  const { history } = await store.load();
  history.push(record);
  ctx.lastStages = lastKnownStages(history);
  await store.save({ history, current: null });
  render();
}

// Runs an owner action on the session, saves, then re-renders.
async function act(change) {
  change();
  await store.save({ current: session, roster: ctx.roster });
  render();
}

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

const button = (text, onclick, props = {}) => el('button', { type: 'button', textContent: text, onclick, ...props });
const newBadge = isNew => (isNew ? [el('span', { className: 'badge', textContent: 'new' })] : []);
const label = code => stage(code)?.label ?? code;
const rosterEntry = key => (Object.hasOwn(ctx.roster.students, key) ? ctx.roster.students[key] : null);

function stageSelect(key, current) {
  const select = el('select', { onchange: () => act(() => setStage(session, ctx, key, select.value)) },
    el('option', { value: '', textContent: 'stage…', disabled: true }),
    ...STAGES.map(s => el('option', { value: s.code, textContent: s.label })));
  select.value = current ?? '';
  return select;
}

// A room's size with ★ per active student and ◆ per working group in it.
function roomSize(room) {
  const entries = room.members.map(rosterEntry);
  const groups = session.mixWorkingGroups ? [] : entries.map(r => r?.group).filter(Boolean);
  const units = new Set(groups.filter(g => groups.indexOf(g) !== groups.lastIndexOf(g)));
  const marks = '★'.repeat(entries.filter(r => r?.active).length) + '◆'.repeat(units.size);
  return marks ? `${room.members.length} ${marks}` : String(room.members.length);
}

function stageLine(line, lone) {
  const li = el('li', {}, el('span', { className: 'label', textContent: line.label }),
    el('span', { className: 'count', textContent: String(line.count) }));
  if (!lone) {
    const rooms = line.rooms;
    li.append(`→ ${rooms.length} room${rooms.length === 1 ? '' : 's'} (${rooms.map(roomSize).join(', ')})`);
    return li;
  }
  const joining = lone.choice === 'join' && lone.joinRoom;
  li.append(`→ ${lone.name} ${joining ? `joins ${lone.joinRoom}` : 'is alone'}`,
    button('Keep alone', () => act(() => setLone(session, lone.key, 'alone')), { ariaPressed: String(lone.choice === 'alone') }));
  if (lone.joinRoom) {
    li.append(button(`Join ${lone.joinRoom}`, () => act(() => setLone(session, lone.key, 'join')), { ariaPressed: String(lone.choice === 'join') }));
  }
  return li;
}

function fill(list, items) {
  list.replaceChildren(...items);
  return items.length > 0;
}

function render() {
  const summary = session && summarize(session, ctx);
  const state = JSON.stringify({ summary, mix: session?.mixWorkingGroups, errors, notice, ended: !endTimer, owners: ctx.roster.ownerNames.length });
  if (state === rendered) return;
  rendered = state;

  $('owner-warning').hidden = ctx.roster.ownerNames.length > 0;
  $('notice').hidden = notice === null;
  $('notice').textContent = notice ?? '';
  $('errors').hidden = !fill($('errors'), errors.map(text => el('li', { textContent: text })));
  $('start').hidden = session !== null;
  $('session').hidden = session === null;
  $('answers').textContent = summary ? `${summary.answers} answer${summary.answers === 1 ? '' : 's'}` : '';
  if (!summary) return;

  fill($('stages'), summary.stages.map(line => stageLine(line, summary.lone.find(l => l.stage === line.stage))));
  fill($('split-groups'), summary.splitGroups.map(g => el('li', {},
    `Working group ${g.group ?? ''} is split: ${g.members.map(m => `${m.name} (${label(m.stage)})`).join(', ')}`)));

  $('unclear-section').hidden = !fill($('unclear'), summary.unclear.map(u => el('li', {},
    el('span', { className: 'label', textContent: u.name }), ...newBadge(u.isNew), ' ',
    el('span', { className: 'message', textContent: u.text }),
    stageSelect(u.key, u.stage), button('Ignore', () => act(() => setIgnored(session, u.key, true))))));

  $('no-answer-count').textContent = `(${summary.noAnswer.length})`;
  $('no-answer-section').hidden = !fill($('no-answer'), summary.noAnswer.map(n => el('li', {},
    el('span', { className: 'label', textContent: n.name }), ...newBadge(n.isNew),
    n.lastStage ? ` last: ${label(n.lastStage)}` : '',
    stageSelect(n.key, null), button('Ignore', () => act(() => setIgnored(session, n.key, true))))));

  $('ignored-section').hidden = !fill($('ignored'), summary.ignored.map(i => el('li', {},
    el('span', { className: 'label', textContent: i.name }),
    button('Restore', () => act(() => setIgnored(session, i.key, false))))));

  $('mix').checked = session.mixWorkingGroups;
  $('end').textContent = endTimer ? 'Press again to end' : 'End';
}

async function open() {
  const { roster, history, current } = await store.load();
  ctx = { roster, lastStages: lastKnownStages(history) };
  session = current;
  store.onChange(changes => {
    if (changes.roster) ctx.roster = changes.roster;
    if (changes.history) ctx.lastStages = lastKnownStages(changes.history);
    render();
  });
  render();
  if (session) poll();
}

$('start').addEventListener('click', start);
$('end').addEventListener('click', end);
$('mix').addEventListener('change', () => act(() => setMix(session, $('mix').checked)));

$('roster-link').href = fake ? `../roster-page/roster-page.html?fake` : '#';
if (!fake) {
  $('roster-link').addEventListener('click', event => {
    event.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL(ROSTER_PAGE) });
  });
}

if (fake) {
  $('fake').hidden = false;
  $('fake-say').addEventListener('submit', event => {
    event.preventDefault();
    const line = $('fake-line').value;
    const colon = line.indexOf(':');
    if (colon === -1) return;
    fakeMeet.say(line.slice(0, colon).trim(), line.slice(colon + 1).trim());
    $('fake-line').value = '';
  });
  $('fake-play').addEventListener('click', () => {
    for (const [sender, text] of DEMO.answers) fakeMeet.say(sender, text);
  });
  $('fake-join').addEventListener('submit', event => {
    event.preventDefault();
    if ($('fake-name').value.trim()) fakeMeet.join($('fake-name').value.trim());
    $('fake-name').value = '';
  });
}

open();
