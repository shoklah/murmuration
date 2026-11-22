import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { fakeAt } from '../src/panel/fake-states.js';
import { createPanelController } from '../src/panel/controller.js';
import { DEMO } from '../src/panel/demo.js';
import { summarize } from '../src/logic/session.js';
import { lastKnownStages } from '../src/logic/history.js';

// The saved session at a state, summarized as the panel would on open.
async function at(state) {
  const { store, meet } = await fakeAt(state);
  const { roster, history, current } = await store.load();
  return { meet, roster, history, current, summary: current && summarize(current, { roster, lastStages: lastKnownStages(history) }) };
}

test('no state, or one that does not exist: before Start, with the demo roster and history', async () => {
  for (const state of [null, 'nope']) {
    const { current, roster, history, meet } = await at(state);
    assert.equal(current, null);
    assert.equal(Object.keys(roster.students).length, 12);
    assert.equal(history.length, 3);
    assert.deepEqual((await meet.readChat()).messages, []);
  }
});

test('collecting: the session is started and the demo answers are in', async () => {
  const { current, summary } = await at('collecting');
  assert.equal(current.plan, null);
  assert.equal(summary.answers, 9);
  assert.deepEqual(summary.unclear.map(u => u.name), ['Sam']);
  assert.deepEqual(summary.noAnswer.map(n => n.name), ['<b>Bold</b>', 'Mia', 'Galaxy S21']);
});

test('split: the same, with the rooms planned', async () => {
  const { current, summary, meet } = await at('split');
  assert.deepEqual(current.plan.map(room => room.name), ['S01 Arc01 · A', 'S02 DS · A', 'S03 SE · A']);
  assert.equal(current.outdated, false);
  assert.equal(current.filled, false);
  assert.equal(summary.answers, 9);
  assert.deepEqual(meet.rooms, []);
});

test('filled: the rooms are filled in the fake Meet, and a latecomer is not in a room', async () => {
  const { current, summary, meet } = await at('filled');
  assert.equal(current.filled, true);
  assert.deepEqual(meet.rooms.map(room => [room.name, room.members.length]), [['S01 Arc01 · A', 5], ['S02 DS · A', 3], ['S03 SE · A', 1]]);
  assert.deepEqual(summary.notInRoom.at(-1), { key: 'noor', name: 'Noor', stage: 'S02DS', guess: false, suggested: 'S02 DS · A' });
});

test('the demo data is left as it was', async () => {
  await fakeAt('filled');                                            // Noor joins that call's roster only
  assert.equal(Object.keys(DEMO.roster.students).length, 12);
  assert.equal(Object.hasOwn(DEMO.roster.students, 'noor'), false);
});

// Lets every pending promise step run; timers are mocked in the test below, so nothing else moves time.
const settle = () => new Promise(resolve => setImmediate(resolve));

// Lets a poll that is still running finish on the mocked clock before the real one comes back.
test.afterEach(async () => { await settle(); mock.timers.reset(); });

test('a panel opened on a state shows it at once, and its first poll changes nothing', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  for (const [state, hasPlan, filled] of [['collecting', false, false], ['split', true, false], ['filled', true, true]]) {
    const { meet, store } = await fakeAt(state);
    let saves = 0;
    const controller = createPanelController({
      store: { ...store, save: async changes => { saves++; await store.save(changes); } },
      findMeet: async () => ({ meet, meetingCode: 'abc-defg-hij' }),
    });
    await controller.open();
    const shown = controller.getView();
    assert.equal(shown.session.hasPlan, hasPlan, state);
    assert.equal(shown.session.filled, filled, state);
    await settle();                                                  // the first poll
    assert.equal(controller.getView(), shown, state);                // the same object: nothing to redraw
    assert.equal(saves, 0, state);
  }
});
