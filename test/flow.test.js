import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeMeet } from '../src/meet/fake-meet.js';
import { syncFromMeet, fillRooms } from '../src/logic/flow.js';
import { createSession, split, summarize, endSession } from '../src/logic/session.js';
import { emptyRoster } from '../src/logic/roster.js';

function call(opts = {}) {
  const meet = createFakeMeet({ participants: ['Mentor', 'Ana', 'Ben', 'Cleo', 'Dan', 'Eva', 'Mia'], ...opts });
  const roster = emptyRoster(); roster.ownerNames = ['Mentor'];
  const ctx = { roster, lastStages: { mia: 'PW' } };
  const session = createSession({ startedAt: '2026-11-24T17:00:00Z', meetingCode: 'abc-defg-hij' });
  meet.say('Mentor', 'Write your stage please');
  for (const [n, t] of [['Ana', 'S02 SE'], ['Ben', 's2 se'], ['Cleo', 'S02 SE'], ['Dan', 'PW'], ['Eva', 'preseason web']]) meet.say(n, t);
  return { meet, ctx, session };
}

test('a whole session with the fake Meet', async () => {
  const { meet, ctx, session } = call();
  assert.deepEqual(await syncFromMeet(meet, session, ctx), []);
  assert.deepEqual(await syncFromMeet(meet, session, ctx), []);           // full list again: nothing applied twice
  assert.equal(session.seen.length, 6);
  split(session, ctx);
  assert.deepEqual(await fillRooms(meet, session, { createRooms: true }), { ok: true });
  assert.deepEqual(meet.rooms, [
    { name: 'Preseason Web · A', members: ['Dan', 'Eva'] },
    { name: 'S02 SE · A', members: ['Ana', 'Ben', 'Cleo'] },
  ]);
  meet.join('Zoe'); meet.say('Zoe', 'S02 SE');
  await syncFromMeet(meet, session, ctx);
  assert.deepEqual(summarize(session, ctx).notInRoom.map(r => [r.name, r.stage, r.guess, r.suggested]), [
    ['Mia', 'PW', true, 'Preseason Web · A'],
    ['Zoe', 'S02SE', false, 'S02 SE · A'],
  ]);
  assert.equal(endSession(session, ctx).students.length, 7);
});

test('participant list unreadable: chat still read, failure reported', async () => {
  const { meet, ctx, session } = call({ unsupported: ['readParticipants'] });
  assert.deepEqual(await syncFromMeet(meet, session, ctx), ['Reading the participant list failed: Not supported.']);
  assert.equal(session.students.ana.stage, 'S02SE');
});

test('tier 2: creating rooms fails, owner creates them, then names are filled', async () => {
  const { meet, ctx, session } = call({ unsupported: ['createRooms'] });
  await syncFromMeet(meet, session, ctx); split(session, ctx);
  assert.deepEqual(await fillRooms(meet, session, { createRooms: true }),
    { ok: false, step: 'create', error: 'Not supported.' });
  assert.equal(session.filled, false);
  meet.rooms = session.plan.map(r => ({ name: r.name, members: [] }));   // the owner creates them in Meet
  assert.deepEqual(await fillRooms(meet, session, { createRooms: false }), { ok: true });
  assert.deepEqual(meet.rooms[0], { name: 'Preseason Web · A', members: ['Dan', 'Eva'] });
});

test('tier 3: typing names fails and the plan stands', async () => {
  const { meet, ctx, session } = call({ unsupported: ['assignName'] });
  await syncFromMeet(meet, session, ctx); split(session, ctx);
  assert.deepEqual(await fillRooms(meet, session, { createRooms: true }),
    { ok: false, step: 'assign', error: 'Putting Dan in Preseason Web · A failed: Not supported.', unfilled: [
      { name: 'Dan', room: 'Preseason Web · A' }, { name: 'Eva', room: 'Preseason Web · A' },
      { name: 'Ana', room: 'S02 SE · A' }, { name: 'Ben', room: 'S02 SE · A' }, { name: 'Cleo', room: 'S02 SE · A' }] });
  assert.equal(session.filled, true);
  assert.equal(session.students.dan.room, 'Preseason Web · A');
});

test('a student who left is skipped; the rest are filled', async () => {
  const { meet, ctx, session } = call();
  await syncFromMeet(meet, session, ctx); split(session, ctx);
  meet.leave('Ben');
  assert.deepEqual(await fillRooms(meet, session, { createRooms: true }), { ok: false, step: 'assign',
    error: 'Putting Ben in S02 SE · A failed: Ben is not in the call.', unfilled: [{ name: 'Ben', room: 'S02 SE · A' }] });
  assert.deepEqual(meet.rooms[1], { name: 'S02 SE · A', members: ['Ana', 'Cleo'] });
});
