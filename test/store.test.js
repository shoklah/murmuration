import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../src/store.js';
import { emptyRoster } from '../src/logic/roster.js';

test('memory store loads defaults, keeps saves, never shares the seed', async () => {
  const seed = { roster: emptyRoster(), history: [] };
  const store = createStore({ memory: true, seed });
  assert.deepEqual(await store.load(), { roster: emptyRoster(), history: [], current: null });
  await store.save({ current: { startedAt: 'x' } });
  (await store.load()).roster.ownerNames.push('Mentor');
  assert.deepEqual((await store.load()).current, { startedAt: 'x' });
  assert.deepEqual(seed.roster.ownerNames, []);
});
