// The `?fake&at=<state>` states: the demo call played up to collecting, split or filled.

import { DEMO } from './demo.js';
import { createFakeMeet } from '../meet/fake-meet.js';
import { createStore } from '../store.js';
import { syncFromMeet, fillRooms } from '../logic/flow.js';
import { createSession, split } from '../logic/session.js';
import { lastKnownStages } from '../logic/history.js';

const STATES = ['collecting', 'split', 'filled'];

/**
 * The fake Meet and the in-memory store of a `?fake` page, brought to a state.
 * Resolves to `{ meet, store }`.
 * @param {string|null} at  null, 'collecting', 'split' or 'filled'; anything else is before Start
 */
export async function fakeAt(at) {
  const meet = createFakeMeet({ participants: DEMO.participants });
  const roster = structuredClone(DEMO.roster);
  let current = null;
  const step = STATES.indexOf(at);
  if (step >= 0) {
    const ctx = { roster, lastStages: lastKnownStages(DEMO.history) };
    current = createSession({ startedAt: '2026-11-24T17:00:00Z', meetingCode: 'abc-defg-hij' });
    for (const [sender, text] of DEMO.answers) meet.say(sender, text);
    await syncFromMeet(meet, current, ctx);
    if (step >= 1) split(current, ctx);
    if (step >= 2) {
      await fillRooms(meet, current, { createRooms: true });
      meet.join('Noor');
      meet.say('Noor', 'S02 DS');
      await syncFromMeet(meet, current, ctx);
    }
  }
  return { meet, store: createStore({ memory: true, seed: { roster, history: DEMO.history, current } }) };
}
