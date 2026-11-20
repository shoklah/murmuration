// The side panel: starts a session, polls Meet into it, shows the live tally,
// splits it into rooms and fills Meet's breakout rooms.
// `?fake` runs on the fake Meet, demo data and an in-memory store.

import { createStore } from '../store.js';
import { el, button, $ } from '../dom.js';
import { createMeetClient, findMeetTab } from './meet-client.js';
import { DEMO } from './demo.js';
import { createFakeMeet } from '../meet/fake-meet.js';
import { syncFromMeet, fillRooms } from '../logic/flow.js';
import { lastKnownStages } from '../logic/history.js';
import { createSession, setStage, setIgnored, setLone, setMix, split, markPlaced, summarize, endSession, rosterEntry } from '../logic/session.js';
import { STAGES, stageLabel as label } from '../logic/stages.js';

const POLL_MS = 2000;
const END_ARMED_MS = 5000;
const NO_MEET_TAB = 'Open the Meet call in this window, then press Start.';
const ROSTER_PAGE = 'src/roster-page/roster-page.html';

const fake = new URLSearchParams(location.search).has('fake');
const store = fake
  ? createStore({ memory: true, seed: { roster: DEMO.roster, history: DEMO.history } })
  : createStore();
const fakeMeet = fake ? createFakeMeet({ participants: DEMO.participants }) : null;

let ctx;
let session = null;
let meet = null;
let errors = [];
let notice = null;
let pollTimer = null;
let endTimer = null;
let rendered = null;
let pollRun = null;
let filling = false;
let ownerCreatesRooms = false;
let fillResult = null;

// The Meet to talk to and its meeting code, or null when no Meet tab is found.
async function findMeet(meetingCode) {
  if (fake) return { meet: fakeMeet, meetingCode: 'abc-defg-hij' };
  const tab = await findMeetTab(meetingCode);
  return tab && { meet: createMeetClient(tab.tabId), meetingCode: tab.meetingCode };
}

// Finds the session's Meet once and keeps it until End.
async function ensureMeet(meetingCode) {
  if (!meet) meet = (await findMeet(meetingCode))?.meet ?? null;
}

async function poll() {
  pollTimer = null;
  const polled = session;
  if (!polled || filling) return;
  let done;
  pollRun = new Promise(resolve => { done = resolve; });
  try {
    await ensureMeet(polled.meetingCode);
    if (session !== polled) return;
    notice = meet ? null : NO_MEET_TAB;
    if (meet) {
      const before = { current: JSON.stringify(session), roster: JSON.stringify(ctx.roster) };
      const failures = await syncFromMeet(meet, session, ctx);
      if (session !== polled) return;
      errors = failures;
      const changed = Object.fromEntries(Object.entries({ current: session, roster: ctx.roster })
        .filter(([name, value]) => JSON.stringify(value) !== before[name]));
      if (Object.keys(changed).length) await store.save(changed);
    }
  } finally {
    pollRun = null;
    done();
  }
  render();
  if (session === polled && !filling) pollTimer = setTimeout(poll, POLL_MS);
}

// Fills Meet's breakout rooms from the plan, with polling paused meanwhile.
async function fillBreakout() {
  const filled = session;
  filling = true;
  clearTimeout(pollTimer);
  pollTimer = null;
  render();
  await pollRun;
  await ensureMeet(filled.meetingCode);
  const result = meet ? await fillRooms(meet, filled, { createRooms: !ownerCreatesRooms }) : null;
  filling = false;
  if (session !== filled) return;
  if (!result) {
    notice = NO_MEET_TAB;
  } else if (result.ok) {
    fillResult = { ok: true, lines: ["Rooms filled. Check Meet's breakout panel, then press Open rooms there."], items: [] };
  } else if (result.step === 'create') {
    ownerCreatesRooms = true;
    fillResult = { ok: false, lines: [result.error, 'Create these rooms in Meet, with these names:'], items: session.plan.map(r => r.name) };
  } else {
    fillResult = { ok: false, lines: [result.error, 'Type these names by hand:'], items: result.unfilled.map(u => `${u.name} → ${u.room}`) };
  }
  await store.save({ current: session });
  render();
  poll();
}

async function start() {
  $('start').disabled = true;
  const found = await findMeet();
  $('start').disabled = false;
  if (session) return;
  if (!found) {
    notice = NO_MEET_TAB;
    render();
    return;
  }
  meet = found.meet;
  notice = null;
  session = createSession({ startedAt: new Date().toISOString(), meetingCode: found.meetingCode });
  render();
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
  ownerCreatesRooms = false;
  fillResult = null;
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

const newBadge = isNew => (isNew ? [el('span', { className: 'badge', textContent: 'new' })] : []);

function stageSelect(key, current) {
  const select = el('select', { onchange: () => act(() => setStage(session, ctx, key, select.value)) },
    el('option', { value: '', textContent: 'stage…', disabled: true }),
    ...STAGES.map(s => el('option', { value: s.code, textContent: s.label })));
  select.value = current ?? '';
  return select;
}

// A room's size with ★ per active student and ◆ per working group in it.
function roomSize(room) {
  const entries = room.members.map(key => rosterEntry(ctx, key));
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

// A room member in the preview: marks, and before Fill, a stage select and Ignore.
function memberRow(key) {
  const s = session.students[key];
  const r = rosterEntry(ctx, key);
  const li = el('li', { className: 'member' }, el('span', { className: 'label', textContent: s.name, title: s.fromMessage ?? '' }));
  if (r) {
    li.append(button('★', () => act(() => { const now = rosterEntry(ctx, key); now.active = !now.active; }), { ariaPressed: String(r.active), title: 'Active student' }));
    const group = r.group && ctx.roster.groups[r.group]?.name;
    if (group) li.append(` ◆ ${group}`);
  }
  li.append(...newBadge(s.isNew));
  if (s.source === 'guess') li.append(el('span', { className: 'badge', textContent: '?', title: 'Guessed stage' }));
  if (!session.filled && !filling) li.append(stageSelect(key, s.stage), button('Ignore', () => act(() => setIgnored(session, key, true))));
  return li;
}

// Plan members, then students placed there after Fill.
function roomMembers(room) {
  const placed = Object.entries(session.students).filter(([, s]) => s.afterFill && s.room === room.name).map(([key]) => key);
  return [...room.members, ...placed.filter(key => !room.members.includes(key))];
}

function fill(list, items) {
  list.replaceChildren(...items);
  return items.length > 0;
}

function render() {
  // Every input of the page, so any change re-renders.
  const state = JSON.stringify({
    session, ctx, errors, notice, endArmed: !!endTimer, filling, ownerCreatesRooms, fillResult, fakeRooms: fakeMeet?.rooms,
  });
  if (state === rendered) return;
  rendered = state;
  const summary = session && summarize(session, ctx);

  $('owner-warning').hidden = ctx.roster.ownerNames.length > 0;
  $('notice').hidden = notice === null;
  $('notice').textContent = notice ?? '';
  $('errors').hidden = !fill($('errors'), errors.map(text => el('li', { textContent: text })));
  $('start').hidden = session !== null;
  $('session').hidden = session === null;
  $('answers').textContent = summary ? `${summary.answers} answer${summary.answers === 1 ? '' : 's'}` : '';
  if (fake) {
    $('fake-rooms').hidden = fakeMeet.rooms.length === 0;
    $('fake-rooms').textContent = fakeMeet.rooms.map(r => `${r.name}: ${r.members.join(', ')}`).join('\n');
  }
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

  $('split').hidden = session.plan !== null;
  $('rooms-section').hidden = session.plan === null;
  if (session.plan) {
    $('outdated').hidden = !session.outdated;
    fill($('rooms'), session.plan.map(room => el('li', { className: 'room' },
      el('span', { className: 'label', textContent: room.name }),
      el('ul', { className: 'lines' }, ...roomMembers(room).map(memberRow)))));
    $('resplit').disabled = session.filled || filling;
    $('filled-note').hidden = !session.filled;
    $('fill').hidden = session.filled;
    $('fill').disabled = session.outdated || filling;
    $('fill').textContent = ownerCreatesRooms ? 'Fill names' : 'Fill breakout rooms';
    $('fill-result').hidden = fillResult === null;
    $('fill-result').className = `fill-result${fillResult?.ok === false ? ' failed' : ''}`;
    $('fill-result').replaceChildren(...(fillResult ? [
      ...fillResult.lines.map(text => el('p', { textContent: text })),
      ...(fillResult.items.length ? [el('ul', {}, ...fillResult.items.map(text => el('li', { textContent: text })))] : []),
    ] : []));
  }

  $('not-in-room-section').hidden = !fill($('not-in-room'), summary.notInRoom.map(n => el('li', {},
    el('span', { className: 'label', textContent: n.name }),
    ` ${n.stage ? label(n.stage) : 'no stage'}${n.guess ? ' ?' : ''} → ${n.suggested ?? 'no suggestion'}`,
    stageSelect(n.key, session.students[n.key].stage),
    button('Placed', () => act(() => markPlaced(session, n.key, n.suggested)), { disabled: n.suggested === null }))));

  $('flags-section').hidden = !fill($('flags'), summary.flags.map(f => el('li', {},
    `${f.name} wrote ${f.text} after Fill. Move them in Meet if needed.`, stageSelect(f.key, null))));

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
$('split').addEventListener('click', () => act(() => split(session, ctx)));
$('resplit').addEventListener('click', () => act(() => split(session, ctx)));
$('fill').addEventListener('click', fillBreakout);
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
