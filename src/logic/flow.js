// Drives the four Meet operations: polling the chat and participants into the
// session, and filling Meet's breakout rooms from the session's plan.

import { applyMessage, applyParticipants, markFilled } from './session.js';

// Both reads are awaited before anything is applied, so the session and roster
// change in one synchronous step.
export async function syncFromMeet(meet, session, ctx) {
  const chat = await meet.readChat();
  const people = await meet.readParticipants();
  const failures = [];
  if (chat.ok) for (const message of chat.messages) applyMessage(session, ctx, message);
  else failures.push(`Reading the chat failed: ${chat.error}`);
  if (people.ok) applyParticipants(session, ctx, people.names);
  else failures.push(`Reading the participant list failed: ${people.error}`);
  return failures;
}

const MAX_FAILS_IN_A_ROW = 3;

export async function fillRooms(meet, session, { createRooms }) {
  if (createRooms) {
    const created = await meet.createRooms(session.plan.map(r => r.name));
    if (!created.ok) return { ok: false, step: 'create', error: created.error };
  }
  markFilled(session);
  const pending = session.plan.flatMap(r => r.members.map(key => ({ name: session.students[key].name, room: r.name })));
  const unfilled = [];
  let error = null;
  let inARow = 0;
  for (const [i, { name, room }] of pending.entries()) {
    const result = await meet.assignName(room, name);
    if (result.ok) {
      inARow = 0;
      continue;
    }
    error ??= `Putting ${name} in ${room} failed: ${result.error}`;
    unfilled.push({ name, room });
    if (++inARow === MAX_FAILS_IN_A_ROW) {
      unfilled.push(...pending.slice(i + 1));
      break;
    }
  }
  return error === null ? { ok: true } : { ok: false, step: 'assign', error, unfilled };
}
