// The live session: students' answers this call, the frozen room plan and Fill state.
// Every function changes `session` and `ctx.roster` in place.

import { parseAnswer, resolveStage } from './answers.js';
import { planRooms, joinTarget, suggestRoom } from './grouping.js';
import { nameKey, isOwner, addStudent } from './roster.js';
import { STAGES } from './stages.js';

export function createSession({ startedAt, meetingCode }) {
  return { startedAt, meetingCode, seen: [], students: {}, mixWorkingGroups: false, plan: null, outdated: false, filled: false };
}

const lastStage = (ctx, key) => (Object.hasOwn(ctx.lastStages, key) ? ctx.lastStages[key] : null);
const rosterEntry = (ctx, key) => (Object.hasOwn(ctx.roster.students, key) ? ctx.roster.students[key] : null);

// The session student for this display name, created on first sight.
function studentFor(session, ctx, name) {
  const key = nameKey(name);
  if (!Object.hasOwn(session.students, key)) {
    Object.defineProperty(session.students, key, {
      value: {
        name, isNew: !Object.hasOwn(ctx.roster.students, key), stage: null, source: null, fromMessage: null,
        unclear: null, flag: null, ignored: false, lone: null, alone: null, room: null, afterFill: false,
      },
      enumerable: true, writable: true, configurable: true,
    });
  }
  return [key, session.students[key]];
}

export function applyMessage(session, ctx, { id, sender, text }) {
  if (session.seen.includes(id)) return;
  session.seen.push(id);
  if (isOwner(ctx.roster, sender)) return;
  const [key, student] = studentFor(session, ctx, sender);
  if (student.ignored) return;
  const parsed = parseAnswer(text);
  if (session.filled && student.room) {
    if (parsed?.stageOnly) student.flag = text;
    return;
  }
  if (student.stage !== null && !parsed?.stageOnly) return;
  const resolved = parsed && resolveStage(parsed, { track: rosterEntry(ctx, key)?.track ?? null, lastStage: lastStage(ctx, key) });
  if (!resolved) {
    student.unclear = text;
    return;
  }
  Object.assign(student, { stage: resolved.stage, source: resolved.guess ? 'guess' : 'answer', fromMessage: text, unclear: null });
  addStudent(ctx.roster, student.name);
  if (resolved.track) ctx.roster.students[key].track = resolved.track;
}

export function applyParticipants(session, ctx, names) {
  for (const name of names) {
    if (!isOwner(ctx.roster, name)) studentFor(session, ctx, name);
  }
}

function markOutdated(session) {
  if (session.plan && !session.filled) session.outdated = true;
}

export function setStage(session, ctx, key, stageCode) {
  const student = session.students[key];
  Object.assign(student, { stage: stageCode, source: 'owner', unclear: null, flag: null });
  addStudent(ctx.roster, student.name);
  markOutdated(session);
}

export function setIgnored(session, key, ignored) {
  session.students[key].ignored = ignored;
  markOutdated(session);
}

export function setLone(session, key, choice) {
  session.students[key].lone = choice;
  markOutdated(session);
}

export function setMix(session, on) {
  session.mixWorkingGroups = on;
  markOutdated(session);
}

// Non-ignored students, as [key, student] pairs.
const present = session => Object.entries(session.students).filter(([, s]) => !s.ignored);

function planEntries(session, ctx) {
  return present(session).filter(([, s]) => s.stage !== null).map(([key, s]) => {
    const r = rosterEntry(ctx, key);
    return {
      key, stage: s.stage, track: r?.track ?? null, active: r?.active ?? false,
      group: session.mixWorkingGroups ? null : r?.group ?? null, lone: s.lone,
    };
  });
}

export function split(session, ctx) {
  if (session.filled) throw new Error('Rooms are already filled.');
  session.plan = planRooms(planEntries(session, ctx));
  session.outdated = false;
  for (const student of Object.values(session.students)) student.alone = null;
  for (const room of session.plan) {
    for (const key of room.members) {
      const student = session.students[key];
      student.alone = student.stage !== room.stage ? 'join' : room.members.length === 1 ? 'alone' : null;
    }
  }
}

export function markFilled(session) {
  session.filled = true;
  for (const room of session.plan) {
    for (const key of room.members) session.students[key].room = room.name;
  }
}

export function markPlaced(session, key, roomName) {
  Object.assign(session.students[key], { room: roomName, afterFill: true });
}

export function summarize(session, ctx) {
  const entries = planEntries(session, ctx);
  const rooms = session.plan ?? planRooms(entries);
  const students = present(session);
  const count = code => entries.filter(e => e.stage === code).length;
  const splitRooms = rooms.filter(r => count(r.stage) >= 2);

  const lone = entries.filter(e => count(e.stage) === 1).map(e => {
    const s = session.students[e.key];
    let joinRoom;
    if (s.lone === 'join') {
      const room = rooms.find(r => r.members.includes(e.key));
      joinRoom = room && room.stage !== e.stage ? room.name : null;
    } else {
      joinRoom = joinTarget(e.stage, e.track, splitRooms)?.name ?? null;
    }
    return { key: e.key, name: s.name, stage: e.stage, choice: s.lone, joinRoom };
  });

  const byGroup = new Map();
  for (const e of entries) {
    if (e.group === null) continue;
    if (!byGroup.has(e.group)) byGroup.set(e.group, []);
    byGroup.get(e.group).push(e);
  }
  const splitGroups = [...byGroup].filter(([, members]) => new Set(members.map(e => e.stage)).size >= 2)
    .map(([id, members]) => ({
      group: ctx.roster.groups[id]?.name ?? null,
      members: members.map(e => ({ name: session.students[e.key].name, stage: e.stage })),
    }));

  const groupOf = Object.fromEntries(Object.entries(ctx.roster.students).map(([key, r]) => [key, r.group]));
  const notInRoom = !session.filled ? [] : students.filter(([, s]) => !s.room).map(([key, s]) => {
    const last = s.stage === null ? lastStage(ctx, key) : null;
    const stageCode = s.stage ?? last;
    const r = rosterEntry(ctx, key);
    const entry = { stage: stageCode, track: r?.track ?? null, group: session.mixWorkingGroups ? null : r?.group ?? null };
    return {
      key, name: s.name, stage: stageCode, guess: last !== null || s.source === 'guess',
      suggested: suggestRoom(entry, rooms, groupOf)?.name ?? null,
    };
  });

  return {
    answers: entries.length,
    stages: STAGES.filter(({ code }) => count(code) >= 1)
      .map(({ code, label }) => ({ stage: code, label, count: count(code), rooms: rooms.filter(r => r.stage === code) })),
    lone,
    unclear: students.filter(([, s]) => s.unclear !== null)
      .map(([key, s]) => ({ key, name: s.name, text: s.unclear, stage: s.stage, isNew: s.isNew })),
    noAnswer: session.filled ? [] : students.filter(([, s]) => s.stage === null && s.unclear === null)
      .map(([key, s]) => ({ key, name: s.name, lastStage: lastStage(ctx, key), isNew: s.isNew })),
    ignored: Object.entries(session.students).filter(([, s]) => s.ignored).map(([key, s]) => ({ key, name: s.name })),
    splitGroups,
    notInRoom,
    flags: students.filter(([, s]) => s.flag !== null).map(([key, s]) => ({ key, name: s.name, text: s.flag })),
  };
}

export function endSession(session, ctx) {
  const students = present(session).map(([key, s]) => {
    const last = s.stage === null ? lastStage(ctx, key) : null;
    const r = rosterEntry(ctx, key);
    return {
      key, name: s.name, stage: s.stage ?? last, source: s.stage !== null ? s.source : last !== null ? 'guess' : null,
      room: s.room, active: r?.active ?? false, group: r?.group ? ctx.roster.groups[r.group]?.name ?? null : null,
      alone: s.alone, afterFill: s.afterFill,
    };
  });
  return { startedAt: session.startedAt, meetingCode: session.meetingCode, students };
}
