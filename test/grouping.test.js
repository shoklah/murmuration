import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupStage, planRooms, joinTarget, suggestRoom } from '../src/logic/grouping.js';

// n students at one stage: working groups take the first keys, then `active` actives, then passives
function at(n, { active = 0, groups = [] } = {}) {
  const e = Array.from({ length: n }, (_, i) => ({ key: `s${i}`, active: false, group: null }));
  let i = 0;
  groups.forEach((size, g) => { for (let j = 0; j < size; j++) e[i++].group = `g${g}`; });
  for (let a = 0; a < active; a++) e[i++].active = true;
  return e;
}
const sizes = rooms => rooms.map(r => r.length).sort((a, b) => b - a);
const activesPerRoom = (e, rooms) =>
  rooms.map(r => r.filter(k => e.find(x => x.key === k).active).length).sort((a, b) => b - a);

const table = [ // spec's table, then the edges this plan decides
  [3, {}, [3]], [4, {}, [4]], [5, {}, [3, 2]], [6, {}, [3, 3]], [7, {}, [4, 3]],
  [9, {}, [3, 3, 3]], [10, {}, [4, 3, 3]], [11, {}, [4, 4, 3]],
  [5, { active: 2 }, [5]], [8, { active: 2 }, [4, 4]], [8, { active: 4 }, [4, 4]],
  [10, { groups: [2, 2] }, [5, 5]], [7, { groups: [2], active: 2 }, [4, 3]],
  [2, {}, [2]], [5, { active: 1 }, [3, 2]], [9, { active: 3 }, [5, 4]],
  [6, { groups: [5] }, [6]], [8, { groups: [8] }, [8]],
];
for (const [n, opts, expected] of table) {
  test(`groupStage ${n} ${JSON.stringify(opts)}`, () => assert.deepEqual(sizes(groupStage(at(n, opts))), expected));
}

test('active students go in pairs, one anchor per room', () => {
  let e = at(8, { active: 2 }); assert.deepEqual(activesPerRoom(e, groupStage(e)), [2, 0]);
  e = at(8, { active: 4 }); assert.deepEqual(activesPerRoom(e, groupStage(e)), [2, 2]);
  e = at(9, { active: 3 }); assert.deepEqual(activesPerRoom(e, groupStage(e)), [3, 0]);
  e = at(10, { groups: [2, 2] });
  for (const r of groupStage(e)) assert.equal(new Set(r.map(k => e.find(x => x.key === k).group).filter(Boolean)).size, 1);
  e = at(7, { groups: [2], active: 2 });
  for (const r of groupStage(e)) {
    const m = r.map(k => e.find(x => x.key === k));
    assert.equal(m.filter(x => x.group).length === 2 || m.filter(x => x.active).length === 2, true);
  }
});

const E = (key, stage, o = {}) => ({ key, stage, track: null, active: false, group: null, lone: null, ...o });
test('planRooms names rooms by stage and letter, in stage order', () => {
  const rooms = planRooms([E('a', 'S02DS'), E('b', 'PW'), E('c', 'S02DS'), E('d', 'PW'),
    E('e', 'S02DS'), E('f', 'S02DS'), E('g', 'S02DS')]);
  assert.deepEqual(rooms.map(r => [r.name, r.stage, r.members.length]),
    [['Preseason Web · A', 'PW', 2], ['S02 DS · A', 'S02DS', 3], ['S02 DS · B', 'S02DS', 2]]);
});
test('a lone student keeps their own room unless they choose Join', () => {
  const base = [E('a', 'S02SE'), E('b', 'S02SE'), E('c', 'S02SE'), E('d', 'S02SE'), E('e', 'S02SE')];
  assert.deepEqual(planRooms([...base, E('leo', 'S03SE', { track: 'SE' })]).at(-1),
    { name: 'S03 SE · A', stage: 'S03SE', members: ['leo'] });
  const joined = planRooms([...base, E('leo', 'S03SE', { track: 'SE', lone: 'join' })]);
  assert.deepEqual(joined.map(r => [r.name, r.members.length]), [['S02 SE · A', 3], ['S02 SE · B', 3]]);
  assert.ok(joined[1].members.includes('leo'));
});
test('joinTarget: nearest lower stage on the path, else higher, else none', () => {
  const R = (name, stage, n) => ({ name, stage, members: Array(n).fill('x') });
  const rooms = [R('Preseason Web · A', 'PW', 3), R('Preseason Data · A', 'PD', 2), R('S02 SE · A', 'S02SE', 4)];
  assert.equal(joinTarget('S03SE', 'SE', rooms).name, 'S02 SE · A');
  assert.equal(joinTarget('S01A1', null, rooms).name, 'Preseason Data · A');   // unknown track: PW and PD both 1 lower, smaller wins
  assert.equal(joinTarget('PW', 'SE', [R('S01 Arc01 · A', 'S01A1', 3)]).name, 'S01 Arc01 · A');
  assert.equal(joinTarget('PW', 'SE', []), null);
});
test('suggestRoom: working-group room, else smallest room of the stage, else Join rule', () => {
  const rooms = [{ name: 'S02 DS · A', stage: 'S02DS', members: ['ana', 'x1', 'x2', 'x3'] },
                 { name: 'S02 DS · B', stage: 'S02DS', members: ['y1', 'y2'] }];
  const groupOf = { ana: 'g1' };
  assert.equal(suggestRoom({ key: 'zoe', stage: 'S02DS', track: 'DS', group: 'g1' }, rooms, groupOf).name, 'S02 DS · A');
  assert.equal(suggestRoom({ key: 'zoe', stage: 'S02DS', track: 'DS', group: null }, rooms, groupOf).name, 'S02 DS · B');
  assert.equal(suggestRoom({ key: 'zoe', stage: 'S03DS', track: 'DS', group: null }, rooms, groupOf).name, 'S02 DS · B');
  assert.equal(suggestRoom({ key: 'zoe', stage: null, track: 'DS', group: null }, rooms, groupOf), null);
});
