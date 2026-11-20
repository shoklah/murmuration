import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lastKnownStages, timeline, historyToCsv, exportBackup, parseBackup } from '../src/logic/history.js';
import { emptyRoster } from '../src/logic/roster.js';

const S = (key, name, stage, source, o = {}) =>
  ({ key, name, stage, source, room: null, active: false, group: null, alone: null, afterFill: false, ...o });
const history = [
  { startedAt: '2026-11-17T17:00:00Z', meetingCode: 'abc-defg-hij', students: [S('mia', 'Mia', 'PW', 'answer'), S('leo', 'Leo', 'S01A2', 'owner')] },
  { startedAt: '2026-11-19T17:00:00Z', meetingCode: 'abc-defg-hij', students: [S('mia', 'Mia', 'S01A1', 'guess'),
    S('leo', 'Leo, "the 2nd"', 'S02SE', 'answer', { room: 'S02 SE · A', active: true, group: 'Owls', alone: 'join', afterFill: true })] },
];
test('last known stage skips guesses', () => assert.deepEqual(lastKnownStages(history), { mia: 'PW', leo: 'S02SE' }));
test('timeline is oldest first', () => assert.deepEqual(timeline(history, 'mia').map(t => t.stage), ['PW', 'S01A1']));
test('CSV quotes names with commas and quotes', () => {
  const lines = historyToCsv(history).split('\n');
  assert.equal(lines[0], 'date,meeting,name,stage,source,room,active,working group,alone,after fill');
  assert.equal(lines[4], '2026-11-19T17:00:00Z,abc-defg-hij,"Leo, ""the 2nd""",S02 SE,answer,S02 SE · A,yes,Owls,join,yes');
});
test('backup round trip', () => {
  const roster = emptyRoster();
  assert.deepEqual(parseBackup(exportBackup({ roster, history }, '2026-11-20T10:00:00Z')), { roster, history });
});
test('a wrong file is refused with a readable error', () => {
  for (const text of ['not json', '{}', JSON.stringify({ app: 'meet-mentoring-groups', version: 1, roster: {}, history: [] })])
    assert.throws(() => parseBackup(text), { message: 'This file is not a Murmuration backup.' });
});
test('CSV keeps names that look like formulas as text', () => {
  const lines = historyToCsv([{ startedAt: 'd', meetingCode: 'm', students: [S('x', '=HYPERLINK("x")', null, null), S('y', '-2+3', null, null)] }]).split('\n');
  assert.equal(lines[1].split(',')[2], `"'=HYPERLINK(""x"")"`);
  assert.equal(lines[2].split(',')[2], "'-2+3");
});
