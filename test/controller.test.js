import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createPanelController } from '../src/panel/controller.js';
import { createStore } from '../src/store.js';
import { createFakeMeet } from '../src/meet/fake-meet.js';
import { createSession } from '../src/logic/session.js';
import { emptyRoster } from '../src/logic/roster.js';

const NO_MEET_TAB = 'Open the Meet call in this window, then press Start.';
const ANSWERS = [['Ana', 'S02 SE'], ['Ben', 's2 se'], ['Cleo', 'S02 SE'], ['Dan', 'PW'], ['Eva', 'preseason web']];

// Lets every pending promise step run; timers are mocked, so nothing else moves time.
const settle = () => new Promise(resolve => setImmediate(resolve));

// A controller on an in-memory store and a fake Meet. `saves` lists the keys of each save,
// `lookups` the meeting code of each findMeet call, `reads` counts chat reads (one per poll).
function setup({ unsupported = [], ownerNames = ['Mentor'], current = null, answers = ANSWERS } = {}) {
  mock.timers.enable({ apis: ['setTimeout'] });
  const roster = emptyRoster();
  roster.ownerNames = ownerNames;
  const memory = createStore({ memory: true, seed: { roster, history: [], current } });
  const h = { saves: [], lookups: [], reads: 0, found: true, storeChanged: null };
  h.store = {
    load: memory.load,
    save: async changes => { h.saves.push(Object.keys(changes).sort()); await memory.save(changes); },
    onChange: cb => { h.storeChanged = cb; },
  };
  h.meet = createFakeMeet({ participants: ['Mentor', 'Ana', 'Ben', 'Cleo', 'Dan', 'Eva'], unsupported });
  const readChat = h.meet.readChat;
  h.meet.readChat = () => { h.reads++; return readChat(); };
  for (const [sender, text] of answers) h.meet.say(sender, text);
  h.controller = createPanelController({
    store: h.store,
    findMeet: async meetingCode => { h.lookups.push(meetingCode); return h.found ? { meet: h.meet, meetingCode: 'abc-defg-hij' } : null; },
  });
  h.view = () => h.controller.getView();
  h.tick = async ms => { mock.timers.tick(ms); await settle(); };
  return h;
}

// Opened, started, first poll done.
async function started(options) {
  const h = setup(options);
  await h.controller.open();
  await h.controller.start();
  await settle();
  return h;
}

// Lets a poll that is still running finish on the mocked clock before the real one comes back.
test.afterEach(async () => { await settle(); mock.timers.reset(); });

test('before open the view is loading; after open with nothing saved there is no session', async () => {
  const h = setup({ ownerNames: [] });
  assert.deepEqual(h.view(), { loading: true, starting: false, notice: null, errors: [], ownerNamesMissing: false, session: null });
  await h.controller.open();
  assert.deepEqual(h.view(), { loading: false, starting: false, notice: null, errors: [], ownerNamesMissing: true, session: null });
});

test('Start without a Meet tab shows the notice and starts nothing', async () => {
  const h = setup();
  h.found = false;
  await h.controller.open();
  await h.controller.start();
  assert.equal(h.view().notice, NO_MEET_TAB);
  assert.equal(h.view().session, null);
  assert.deepEqual(h.saves, []);
});

test('Start saves the session, polls at once, then every 2 seconds', async () => {
  const h = setup({ answers: [['Ana', 'S02 SE']] });
  await h.controller.open();
  const starting = [];
  h.controller.subscribe(() => starting.push(h.view().starting));
  await h.controller.start();
  await settle();
  assert.deepEqual(starting.slice(0, 2), [true, false]);       // Start is off while the Meet tab is looked up
  assert.deepEqual(h.lookups, [undefined]);                    // no meeting code yet: the active tab is asked
  assert.equal(h.view().session.summary.answers, 1);
  h.meet.say('Ben', 's2 se');
  await h.tick(1999);
  assert.equal(h.view().session.summary.answers, 1);
  await h.tick(1);
  assert.equal(h.view().session.summary.answers, 2);
});

test('Start pressed twice starts one session', async () => {
  const h = setup();
  await h.controller.open();
  await Promise.all([h.controller.start(), h.controller.start()]);
  await settle();
  assert.deepEqual(h.lookups, [undefined]);
  assert.deepEqual(h.saves[0], ['current']);
  assert.equal(h.saves.filter(keys => keys.length === 1 && keys[0] === 'current').length, 1);
});

test('a poll saves only what changed and tells listeners only when the view changed', async () => {
  const h = await started({ answers: [['Ana', 'S02 SE']] });
  assert.deepEqual(h.saves, [['current'], ['current', 'roster']]);   // Start, then the first poll (Ana joins the roster)
  let told = 0;
  h.controller.subscribe(() => told++);
  const view = h.view();
  await h.tick(2000);
  assert.equal(h.saves.length, 2);                                   // nothing new in Meet: nothing saved
  h.meet.say('Ana', 'thanks');                                       // only the session's list of seen messages changes
  await h.tick(2000);
  assert.deepEqual(h.saves.at(-1), ['current']);
  assert.equal(told, 0);
  assert.equal(h.view(), view);                                      // the same object: nothing to redraw
});

test('a failed Meet read is listed, and the list clears once Meet answers', async () => {
  const h = await started({ unsupported: ['readParticipants'] });
  assert.deepEqual(h.view().errors, ['Reading the participant list failed: Not supported.']);
  assert.equal(h.view().session.summary.answers, 5);                 // the chat was still read
  h.meet.readParticipants = async () => ({ ok: true, names: ['Mentor', 'Ana'] });
  await h.tick(2000);
  assert.deepEqual(h.view().errors, []);
});

test('a Meet tab that stops answering is looked up again by meeting code', async () => {
  const h = await started();
  h.meet.lost = true;
  h.found = false;
  await h.tick(2000);
  assert.deepEqual(h.lookups, [undefined, 'abc-defg-hij']);
  assert.equal(h.view().notice, NO_MEET_TAB);
  assert.equal(h.view().session.summary.answers, 5);                 // the session stays
  h.meet.lost = false;
  h.found = true;
  await h.tick(2000);
  assert.equal(h.view().notice, null);
});

test('a saved session is restored on open and polled at once', async () => {
  const h = setup({ current: createSession({ startedAt: '2026-11-24T17:00:00Z', meetingCode: 'abc-defg-hij' }) });
  await h.controller.open();
  assert.equal(h.view().session.summary.answers, 0);
  await settle();
  assert.deepEqual(h.lookups, ['abc-defg-hij']);
  assert.equal(h.view().session.summary.answers, 5);
});

test('owner actions change the session, save it with the roster, and show in the view', async () => {
  const h = await started();
  const before = h.saves.length;
  const member = key => h.view().session.members.find(m => m.key === key);
  await h.controller.setStage('eva', 'S03SE');                       // Eva is now alone at her stage, and so is Dan
  assert.deepEqual(h.saves.at(-1), ['current', 'roster']);
  assert.equal(member('eva').stage, 'S03SE');
  await h.controller.setLone('eva', 'join');
  assert.deepEqual(h.view().session.summary.lone.map(l => [l.key, l.choice]), [['dan', null], ['eva', 'join']]);
  await h.controller.setIgnored('ben', true);
  assert.deepEqual(h.view().session.summary.ignored, [{ key: 'ben', name: 'Ben' }]);
  await h.controller.setIgnored('ben', false);
  assert.deepEqual(h.view().session.summary.ignored, []);
  await h.controller.toggleActive('ana');
  assert.equal(member('ana').active, true);
  assert.equal((await h.store.load()).roster.students.ana.active, true);
  await h.controller.setMix(true);
  assert.equal(h.view().session.mixWorkingGroups, true);
  await h.controller.split();
  assert.equal(h.view().session.hasPlan, true);
  await h.controller.setStage('ana', 'PW');
  assert.equal(h.view().session.outdated, true);                     // changed since Split
  assert.equal(h.saves.length, before + 8);
});

test('Fill pauses the poll, fills the rooms, then polls again', async () => {
  const h = await started();
  await h.controller.split();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const createRooms = h.meet.createRooms;
  h.meet.createRooms = async names => { await gate; return createRooms(names); };
  const reads = h.reads;
  const done = h.controller.fill();
  await settle();
  assert.equal(h.view().session.filling, true);
  await h.tick(10000);
  assert.equal(h.reads, reads);                                      // no poll while Fill runs
  release();
  await done;
  await settle();
  assert.equal(h.reads, reads + 1);                                  // polling is back at once
  const session = h.view().session;
  assert.equal(session.filling, false);
  assert.equal(session.filled, true);
  assert.deepEqual(session.fillResult, { ok: true, lines: ["Rooms filled. Check Meet's breakout panel, then press Open rooms there."], items: [] });
  assert.deepEqual(h.meet.rooms, [
    { name: 'Preseason Web · A', members: ['Dan', 'Eva'] },
    { name: 'S02 SE · A', members: ['Ana', 'Ben', 'Cleo'] },
  ]);
  h.meet.join('Zoe');
  h.meet.say('Zoe', 'S02 SE');
  await h.tick(2000);
  assert.deepEqual(h.view().session.summary.notInRoom.map(n => n.key), ['zoe']);
  await h.controller.markPlaced('zoe', 'S02 SE · A');
  assert.deepEqual(h.view().session.summary.notInRoom, []);
});

test('Fill pressed while a poll is waiting on Meet: the poll finishes first, and one poll follows the Fill', async () => {
  const h = await started();
  await h.controller.split();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const readParticipants = h.meet.readParticipants;
  h.meet.readParticipants = async () => { await gate; return readParticipants(); };
  await h.tick(2000);                                                // this poll now waits on Meet
  const done = h.controller.fill();
  await settle();
  assert.equal(h.view().session.filling, true);
  assert.deepEqual(h.meet.rooms, []);                                // Fill waits for the poll
  release();
  await done;
  await settle();
  assert.equal(h.view().session.filled, true);
  assert.deepEqual(h.meet.rooms.map(room => room.members.length), [2, 3]);
  const reads = h.reads;
  await h.tick(2000);
  assert.equal(h.reads, reads + 1);                                  // one poll every 2 seconds, not two
});

test('Fill pressed while a poll is waiting on Meet that changes a planned stage: nothing is filled, and polling goes on', async () => {
  const h = await started();
  await h.controller.split();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const readParticipants = h.meet.readParticipants;
  h.meet.readParticipants = async () => { await gate; return readParticipants(); };
  h.meet.say('Ana', 'PW');
  await h.tick(2000);                                                // this poll now waits on Meet
  const done = h.controller.fill();
  await settle();
  release();
  await done;
  await settle();
  const session = h.view().session;
  assert.equal(session.outdated, true);
  assert.equal(session.filling, false);
  assert.equal(session.filled, false);
  assert.deepEqual(h.meet.rooms, []);                                // the old plan is not filled
  const reads = h.reads;
  await h.tick(2000);
  assert.equal(h.reads, reads + 1);                                  // one poll every 2 seconds
});

test('Fill: Meet cannot create the rooms, the owner creates them, then only names are filled', async () => {
  const h = await started({ unsupported: ['createRooms'] });
  await h.controller.split();
  await h.controller.fill();
  const session = h.view().session;
  assert.equal(session.filled, false);
  assert.equal(session.ownerCreatesRooms, true);
  assert.deepEqual(session.fillResult, {
    ok: false,
    lines: ['Not supported.', 'Create these rooms in Meet, with these names:'],
    items: ['Preseason Web · A', 'S02 SE · A'],
  });
  h.meet.rooms = session.fillResult.items.map(name => ({ name, members: [] }));   // the owner creates them in Meet
  await h.controller.fill();
  assert.equal(h.view().session.filled, true);
  assert.equal(h.view().session.fillResult.ok, true);
});

test('Fill: typing the names fails, and the names to type by hand are listed', async () => {
  const h = await started({ unsupported: ['assignName'] });
  await h.controller.split();
  await h.controller.fill();
  assert.equal(h.view().session.filled, true);
  assert.deepEqual(h.view().session.fillResult, {
    ok: false,
    lines: ['Putting Dan in Preseason Web · A failed: Not supported.', 'Type these names by hand:'],
    items: ['Dan → Preseason Web · A', 'Eva → Preseason Web · A', 'Ana → S02 SE · A', 'Ben → S02 SE · A', 'Cleo → S02 SE · A'],
  });
});

test('Fill with no Meet tab shows the notice and fills nothing', async () => {
  const h = await started();
  await h.controller.split();
  h.meet.lost = true;
  h.found = false;
  await h.controller.fill();
  assert.equal(h.view().notice, NO_MEET_TAB);
  assert.equal(h.view().session.filling, false);
  assert.equal(h.view().session.filled, false);
  assert.equal(h.view().session.fillResult, null);
});

test('End needs a second press within 5 seconds, then saves the record and stops polling', async () => {
  const h = await started();
  await h.controller.end();
  assert.equal(h.view().session.endArmed, true);
  await h.tick(5000);
  assert.equal(h.view().session.endArmed, false);                    // too late: still running
  await h.controller.end();
  await h.tick(4999);
  await h.controller.end();
  assert.equal(h.view().session, null);
  const { history, current } = await h.store.load();
  assert.equal(current, null);
  assert.equal(history.length, 1);
  const reads = h.reads;
  await h.tick(10000);
  assert.equal(h.reads, reads);
});

test('End while a poll is waiting on Meet: the ended session does not come back', async () => {
  const h = await started();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const readParticipants = h.meet.readParticipants;
  h.meet.readParticipants = async () => { await gate; return readParticipants(); };
  h.meet.say('Ana', 'PW');
  await h.tick(2000);                                                // this poll now waits on Meet
  await h.controller.end();
  await h.controller.end();
  release();
  await settle();
  assert.equal(h.view().session, null);
  assert.equal((await h.store.load()).current, null);
  assert.deepEqual(h.saves.at(-1), ['current', 'history']);
});

test('End while Fill is waiting on Meet: the ended session does not come back', async () => {
  const h = await started();
  await h.controller.split();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const createRooms = h.meet.createRooms;
  h.meet.createRooms = async names => { await gate; return createRooms(names); };
  const done = h.controller.fill();
  await settle();                                                    // Fill now waits on Meet
  await h.controller.end();
  await h.controller.end();
  release();
  await done;
  await settle();
  assert.equal(h.view().session, null);
  assert.equal((await h.store.load()).current, null);
  assert.deepEqual(h.saves.at(-1), ['current', 'history']);
  const reads = h.reads;
  await h.tick(10000);
  assert.equal(h.reads, reads);                                      // and no poll starts again
});

test('End and Split pressed while End is saving do nothing', async () => {
  const h = await started();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const load = h.store.load;
  h.store.load = async () => { await gate; return load(); };
  await h.controller.end();
  const ending = h.controller.end();                                 // now waits on the store
  await h.controller.end();
  await h.controller.split();
  release();
  await ending;
  assert.equal(h.view().session, null);
  h.store.load = load;
  await h.controller.start();
  await settle();
  assert.equal(h.view().session.endArmed, false);                    // the third press armed nothing
});

test('after End, the next Start begins clean and knows the stages of the ended session', async () => {
  const h = await started({ unsupported: ['createRooms'], answers: [['Ana', 'S02 SE'], ['Ben', 's2 se']] });
  await h.controller.setStage('cleo', 'PW');                         // set by hand: Cleo wrote nothing
  await h.controller.split();
  await h.controller.fill();
  assert.equal(h.view().session.ownerCreatesRooms, true);
  await h.controller.end();
  await h.controller.end();
  await h.controller.start();
  await settle();
  const session = h.view().session;
  assert.equal(session.hasPlan, false);
  assert.equal(session.ownerCreatesRooms, false);
  assert.equal(session.fillResult, null);
  assert.equal(session.summary.noAnswer.find(n => n.key === 'cleo').lastStage, 'PW');
});

test('a roster saved from the roster page shows without a poll', async () => {
  const h = await started({ ownerNames: [] });
  assert.equal(h.view().ownerNamesMissing, true);
  const { roster } = await h.store.load();
  roster.ownerNames = ['Mentor'];
  h.storeChanged({ roster });
  assert.equal(h.view().ownerNamesMissing, false);
});

test('a participant named __proto__ is an ordinary student', async () => {
  const h = await started();
  h.meet.join('__proto__');
  await h.tick(2000);
  assert.deepEqual(h.view().session.members.find(m => m.name === '__proto__'),
    { key: '__proto__', name: '__proto__', stage: null, guessed: false, message: null, isNew: true, onRoster: false, active: false, group: null });
  assert.equal(h.view().session.summary.noAnswer.some(n => n.key === '__proto__'), true);
});

test('End while Fill is waiting on Meet, then Start: the new session polls, and the old Fill leaves it alone', async () => {
  const h = await started();
  await h.controller.split();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const createRooms = h.meet.createRooms;
  h.meet.createRooms = async names => { await gate; return createRooms(names); };
  const done = h.controller.fill();
  await settle();                                                    // Fill now waits on Meet
  await h.controller.end();
  await h.controller.end();
  const reads = h.reads;
  await h.controller.start();
  await settle();
  assert.equal(h.view().session.filling, false);
  assert.equal(h.reads, reads + 1);                                  // the new session polls at once
  release();
  await done;
  await settle();
  const session = h.view().session;
  assert.equal(session.filling, false);
  assert.equal(session.filled, false);
  assert.equal(session.fillResult, null);
  await h.tick(2000);
  assert.equal(h.reads, reads + 2);
  await h.tick(2000);
  assert.equal(h.reads, reads + 3);                                  // one poll every 2 seconds
});

test('End and Start while a poll is waiting on Meet: Fill waits for the new session\'s poll', async () => {
  const h = await started();
  const gates = [];
  const readParticipants = h.meet.readParticipants;
  h.meet.readParticipants = async () => { await new Promise(resolve => gates.push(resolve)); return readParticipants(); };
  let created = 0;
  const createRooms = h.meet.createRooms;
  h.meet.createRooms = async names => { created++; return createRooms(names); };
  await h.tick(2000);                                                // the old session's poll waits on Meet
  await h.controller.end();
  await h.controller.end();
  await h.controller.start();
  await settle();                                                    // the new session's poll waits on Meet
  gates[0]();
  await settle();                                                    // the old poll gives up
  await h.controller.split();
  const done = h.controller.fill();
  await settle();
  assert.equal(created, 0);                                          // Fill waits for the new poll
  gates[1]();
  await done;
  assert.equal(created, 1);
  assert.equal(h.view().session.filled, true);
});
