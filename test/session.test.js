import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSession, applyMessage, applyParticipants, setStage, setIgnored, setLone, setMix, split, markFilled,
  markPlaced, summarize, endSession } from '../src/logic/session.js';
import { emptyRoster, addStudent } from '../src/logic/roster.js';

function setup({ lastStages = {} } = {}) {
  const roster = emptyRoster(); roster.ownerNames = ['Hugo M'];
  const ctx = { roster, lastStages };
  const session = createSession({ startedAt: '2026-11-24T17:00:00Z', meetingCode: 'abc-defg-hij' });
  let n = 0;
  const say = (sender, text) => applyMessage(session, ctx, { id: `m${++n}`, sender, text });
  return { session, ctx, roster, say };
}

test('first message with stage information sets the stage', () => {
  const { session, say } = setup();
  say('Ana', 'S02 SE');
  const ana = session.students.ana;
  assert.deepEqual([ana.stage, ana.source, ana.fromMessage, ana.unclear, ana.isNew], ['S02SE', 'answer', 'S02 SE', null, true]);
});
test('the same message id is applied once', () => {
  const { session, ctx } = setup();
  applyMessage(session, ctx, { id: 'x', sender: 'Ana', text: 'stuck on my_ls' });
  applyMessage(session, ctx, { id: 'y', sender: 'Ana', text: 'S02 SE' });
  applyMessage(session, ctx, { id: 'x', sender: 'Ana', text: 'stuck on my_ls' });
  assert.equal(session.students.ana.unclear, null);
  assert.deepEqual(session.seen, ['x', 'y']);
});
test('owner messages are ignored whatever their case', () => {
  const { session, say } = setup();
  say('hugo  m', 'S02 SE');
  assert.deepEqual(session.students, {});
});
test('later chatter keeps the stage; a stage-only message replaces it', () => {
  const { session, say } = setup();
  say('Ana', 'S02 SE'); say('Ana', 'need help with S03 stuff');
  assert.equal(session.students.ana.stage, 'S02SE');
  say('Ana', 'S03 SE');
  assert.equal(session.students.ana.stage, 'S03SE');
});
test('unusable messages go to Unclear until a usable answer', () => {
  const { session, ctx, say } = setup();
  say('Sam', 'stuck on my_ls');
  assert.deepEqual(summarize(session, ctx).unclear, [{ key: 'sam', name: 'Sam', text: 'stuck on my_ls', stage: null, isNew: true }]);
  say('Sam', 'S01 arc 1');
  assert.deepEqual([session.students.sam.stage, summarize(session, ctx).unclear], ['S01A1', []]);
});
test('an unresolvable stage-only correction keeps the stage and shows as unclear', () => {
  const { session, say } = setup();
  say('Ana', 'S01 arc 1'); say('Ana', 'S02');
  assert.deepEqual([session.students.ana.stage, session.students.ana.unclear], ['S01A1', 'S02']);
});
test('answers fill the roster and record full-answer tracks', () => {
  const { session, roster, say } = setup();
  addStudent(roster, 'Ben');
  say('Ana', 'S03 ML'); say('Ben', 'S02 DS');
  assert.deepEqual([session.students.ana.isNew, session.students.ben.isNew], [true, false]);
  assert.equal(roster.students.ana.track, 'ML');
  assert.equal(roster.students.ben.track, null);
});
test('S01 from an SE student takes last session arc as a guess', () => {
  const { session, roster, say } = setup({ lastStages: { leo: 'S01A2' } });
  addStudent(roster, 'Leo'); roster.students.leo.track = 'SE';
  say('Leo', 'S01');
  assert.deepEqual([session.students.leo.stage, session.students.leo.source], ['S01A2', 'guess']);
});
test('ignored students are left out; owner can set a stage', () => {
  const { session, ctx, roster, say } = setup();
  say('Sam', 'hello'); setIgnored(session, 'sam', true); say('Sam', 'S02 SE');
  assert.equal(session.students.sam.stage, null);
  assert.deepEqual(summarize(session, ctx).ignored, [{ key: 'sam', name: 'Sam' }]);
  assert.deepEqual(summarize(session, ctx).unclear, []);
  setIgnored(session, 'sam', false); setStage(session, ctx, 'sam', 'PD');
  assert.deepEqual([session.students.sam.source, session.students.sam.unclear, Object.hasOwn(roster.students, 'sam')], ['owner', null, true]);
});
test('silent participants are listed with their last stage', () => {
  const { session, ctx } = setup({ lastStages: { mia: 'PW' } });
  applyParticipants(session, ctx, ['Hugo M', 'Mia']);
  assert.deepEqual(summarize(session, ctx).noAnswer, [{ key: 'mia', name: 'Mia', lastStage: 'PW', isNew: true }]);
});
test('Split freezes the plan; adjustments mark it outdated until Re-split; Mix ignores working groups', () => {
  const { session, ctx, roster, say } = setup();
  const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const g1 = 'g1', g2 = 'g2'; roster.groups = { g1: { name: 'One' }, g2: { name: 'Two' } };
  names.forEach((n, i) => { addStudent(roster, n); roster.students[n.toLowerCase()].group = i < 2 ? g1 : i < 4 ? g2 : null; say(n, 'S02 DS'); });
  split(session, ctx);
  assert.deepEqual(session.plan.map(r => r.members.length), [5, 5]);
  say('Zoe', 'S02 DS');   // a late answer: the plan stays, Zoe waits for Re-split or the after-Fill list
  assert.deepEqual([session.plan.map(r => r.members.length), session.outdated], [[5, 5], false]);
  setIgnored(session, 'j', true);
  assert.equal(session.outdated, true);
  setMix(session, true); split(session, ctx);
  assert.deepEqual([session.plan.map(r => r.members.length), session.outdated], [[4, 3, 3], false]);
});
test('a lone student is offered the nearest room; after Join the line names their room', () => {
  const { session, ctx, say } = setup();
  for (const n of ['A', 'B', 'C', 'D', 'E']) say(n, 'S02 SE');
  say('Leo', 'S03 SE');
  assert.deepEqual(summarize(session, ctx).lone, [{ key: 'leo', name: 'Leo', stage: 'S03SE', choice: null, joinRoom: 'S02 SE · B' }]);
  setLone(session, 'leo', 'join'); split(session, ctx);
  assert.equal(summarize(session, ctx).lone[0].joinRoom, 'S02 SE · B');
});
test('a working group split across stages is flagged', () => {
  const { session, ctx, roster, say } = setup();
  roster.groups = { g: { name: 'Pair' } };
  for (const n of ['Ana', 'Ben']) { addStudent(roster, n); roster.students[n.toLowerCase()].group = 'g'; }
  say('Ana', 'S02 SE'); say('Ben', 'S01 arc 2');
  assert.deepEqual(summarize(session, ctx).splitGroups,
    [{ group: 'Pair', members: [{ name: 'Ana', stage: 'S02SE' }, { name: 'Ben', stage: 'S01A2' }] }]);
});
test('after Fill: latecomers listed with a suggestion, placed students only flagged, Split refused', () => {
  const { session, ctx, say } = setup();
  for (const n of ['Ana', 'Ben', 'Cleo']) say(n, 'S02 SE');
  split(session, ctx); markFilled(session);
  assert.equal(session.students.ana.room, 'S02 SE · A');
  say('Zoe', 'S02 SE'); say('Ana', 'S03 SE');
  const s = summarize(session, ctx);
  assert.deepEqual(s.notInRoom, [{ key: 'zoe', name: 'Zoe', stage: 'S02SE', guess: false, suggested: 'S02 SE · A' }]);
  assert.deepEqual(s.flags, [{ key: 'ana', name: 'Ana', text: 'S03 SE' }]);
  assert.equal(session.students.ana.stage, 'S02SE');
  assert.throws(() => split(session, ctx), { message: 'Rooms are already filled.' });
  markPlaced(session, 'zoe', 'S02 SE · A');
  assert.deepEqual(summarize(session, ctx).notInRoom, []);
});
test('endSession records each student', () => {
  const { session, ctx, roster, say } = setup({ lastStages: { mia: 'PW' } });
  addStudent(roster, 'Leo'); roster.students.leo.track = 'SE'; roster.students.leo.active = true;
  applyParticipants(session, ctx, ['Mia']);
  for (const n of ['Ana', 'Ben']) say(n, 'S02 SE');
  say('Leo', 'S03 SE'); setLone(session, 'leo', 'join');
  split(session, ctx); markFilled(session);
  setStage(session, ctx, 'ana', 'S03SE');   // corrected after Fill: not a Join, plan not outdated
  assert.equal(session.outdated, false);
  const r = endSession(session, ctx);
  assert.equal(r.students.find(s => s.key === 'ana').alone, null);
  assert.deepEqual(r.students.find(s => s.key === 'leo'), { key: 'leo', name: 'Leo', stage: 'S03SE', source: 'answer',
    room: 'S02 SE · A', active: true, group: null, alone: 'join', afterFill: false });
  assert.deepEqual(r.students.find(s => s.key === 'mia'), { key: 'mia', name: 'Mia', stage: 'PW', source: 'guess',
    room: null, active: false, group: null, alone: null, afterFill: false });
});
test("a planned student's stage correction after Split marks the plan outdated", () => {
  const { session, ctx, say } = setup();
  for (const n of ['A', 'B', 'C', 'D']) say(n, 'S01 arc 1');
  split(session, ctx);
  say('A', 'S01 arc 1');   // same stage again: nothing to redo
  assert.equal(session.outdated, false);
  say('A', 'S02 SE');
  assert.deepEqual([session.students.a.stage, session.outdated], ['S02SE', true]);
});
test('a lone student is offered only rooms of stages with 2+ students (R3)', () => {
  const { session, ctx, say } = setup();
  say('Leo', 'S03 SE');
  say('Mia', 'S02 SE');
  assert.deepEqual(summarize(session, ctx).lone.map(l => l.joinRoom), [null, null]);
});
test('summary rooms carry plan members, students placed after Fill and ★/◆ counts', () => {
  const { session, ctx, roster, say } = setup();
  roster.groups = { g1: { name: 'One' } };
  for (const n of ['A', 'B', 'C', 'D']) { addStudent(roster, n); say(n, 'S02 DS'); }
  roster.students.a.group = 'g1'; roster.students.b.group = 'g1'; roster.students.c.active = true;
  split(session, ctx);
  markFilled(session);
  say('Zoe', 'S02 DS');
  markPlaced(session, 'zoe', 'S02 DS · A');
  const [room] = summarize(session, ctx).rooms;
  assert.deepEqual(room, { name: 'S02 DS · A', stage: 'S02DS', members: ['a', 'b', 'c', 'd'], placed: ['zoe'], active: 1, units: 1 });
  assert.deepEqual(summarize(session, ctx).stages[0].rooms, [room]);
  setMix(session, true);
  assert.equal(summarize(session, ctx).rooms[0].units, 0);
});
