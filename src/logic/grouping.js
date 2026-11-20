// Decides the breakout rooms: splits each stage into rooms, places lone
// students and suggests a room for late arrivals.

import { STAGES, PATHS, stage, tracksOf } from './stages.js';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// The room with the fewest members, the first one on ties.
const size = r => r.members.length;

function smallest(rooms, size = r => r.length) {
  return rooms.reduce((best, r) => (best === null || size(r) < size(best) ? r : best), null);
}

// Entries by working group id, leaving out those with no group.
export function byGroup(entries) {
  const groups = new Map();
  for (const e of entries) {
    if (e.group === null) continue;
    if (!groups.has(e.group)) groups.set(e.group, []);
    groups.get(e.group).push(e);
  }
  return groups;
}

// Working groups with 2+ members here: they stay together as one unit.
export const unitsOf = entries => [...byGroup(entries).values()].filter(g => g.length >= 2);

export function groupStage(entries) {
  const n = entries.length;
  const units = unitsOf(entries);
  const inUnit = new Set(units.flat());
  const actives = entries.filter(e => e.active && !inUnit.has(e));
  const pairs = [];
  for (let i = 0; i + 1 < actives.length; i += 2) pairs.push([actives[i], actives[i + 1]]);
  const odd = actives.length % 2 ? actives.at(-1) : null;

  const anchors = units.length + pairs.length;
  const kSize = Math.ceil(n / 4);
  const k = anchors >= 1 && anchors < kSize ? Math.max(Math.ceil(n / 5), anchors) : kSize;

  const rooms = Array.from({ length: k }, () => ({ members: [], anchored: false, paired: false }));
  const place = (room, people) => room.members.push(...people.map(e => e.key));

  for (const unit of [...units].sort((a, b) => b.length - a.length)) {
    const room = smallest(rooms, size);
    place(room, unit);
    room.anchored = true;
  }
  for (const pair of pairs) {
    const room = smallest(rooms, size);
    place(room, pair);
    room.anchored = true;
    room.paired = true;
  }
  if (odd) {
    const room = smallest(rooms.filter(r => r.paired), size)
      ?? smallest(rooms.filter(r => r.anchored), size)
      ?? smallest(rooms, size);
    place(room, [odd]);
  }
  for (const e of entries) {
    if (!inUnit.has(e) && !e.active) place(smallest(rooms, size), [e]);
  }

  const result = rooms.map(r => r.members).filter(m => m.length > 0);
  let lone;
  while (result.length > 1 && (lone = result.findIndex(m => m.length === 1)) !== -1) {
    const [member] = result.splice(lone, 1)[0];
    smallest(result).push(member);
  }
  return result;
}

export function planRooms(entries) {
  const rooms = [];
  const lone = [];
  for (const { code, label } of STAGES) {
    const here = entries.filter(e => e.stage === code);
    if (here.length === 1) lone.push(here[0]);
    if (here.length < 2) continue;
    groupStage(here).forEach((members, i) =>
      rooms.push({ name: `${label} · ${LETTERS[i]}`, stage: code, members }));
  }
  // Join targets only the split rooms; own rooms are added after every lone student is placed.
  const own = [];
  for (const e of lone) {
    const target = e.lone === 'join' ? joinTarget(e.stage, e.track, rooms) : null;
    if (target) target.members.push(e.key);
    else own.push({ name: `${stage(e.stage).label} · A`, stage: e.stage, members: [e.key] });
  }
  const order = code => STAGES.findIndex(s => s.code === code);
  return [...rooms, ...own].sort((a, b) => order(a.stage) - order(b.stage));
}

export function joinTarget(stageCode, track, rooms) {
  const paths = track && PATHS[track].includes(stageCode)
    ? [PATHS[track]]
    : tracksOf(stageCode).map(t => PATHS[t]);
  for (const step of [-1, 1]) {
    for (let d = 1; ; d++) {
      const codes = paths.map(p => p[p.indexOf(stageCode) + step * d]).filter(Boolean);
      if (codes.length === 0) break;
      const room = smallest(rooms.filter(r => codes.includes(r.stage)), size);
      if (room) return room;
    }
  }
  return null;
}

export function suggestRoom(entry, rooms, groupOf) {
  if (entry.stage === null) return null;
  const here = rooms.filter(r => r.stage === entry.stage);
  const withGroup = entry.group === null ? undefined : here.find(r =>
    r.members.some(m => Object.hasOwn(groupOf, m) && groupOf[m] === entry.group));
  return withGroup ?? smallest(here, size) ?? joinTarget(entry.stage, entry.track, rooms);
}
