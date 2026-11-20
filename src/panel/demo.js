// Demo data for the `?fake` panel: a call, its chat answers, a roster and past sessions.

import { emptyRoster, addStudent, createGroup, nameKey } from '../logic/roster.js';

const roster = emptyRoster();
roster.ownerNames = ['Mentor'];
const pair = createGroup(roster, 'Finn & Gia');

// [name, track, active, working group]; "Galaxy S21" is left off the roster,
// and "<b>Bold</b>" stays silent so it shows by name under No answer.
for (const [name, track, active, group] of [
  ['Ana', 'SE', true, null], ['Ben', 'DS', true, null], ['Cleo', 'SE', false, null],
  ['Dan', null, false, null], ['Eva', 'DS', false, null],
  ['Finn', 'DS', false, pair], ['Gia', 'DS', false, pair], ['Hugo', 'DS', false, null],
  ['<b>Bold</b>', 'DS', false, null], ['Leo', 'SE', false, null],
  ['Sam', 'SE', false, null], ['Mia', 'SE', false, null],
]) {
  Object.assign(roster.students[addStudent(roster, name)], { track, active, group });
}

const record = (startedAt, students) => ({
  startedAt, meetingCode: 'abc-defg-hij',
  students: students.map(([name, stage]) => ({
    key: nameKey(name), name, stage, source: 'answer', room: null,
    active: false, group: null, alone: null, afterFill: false,
  })),
});

const history = [
  record('2026-11-03T17:00:00Z', [['Ana', 'PW'], ['Leo', 'S02SE'], ['Mia', 'PW'], ['Finn', 'S02DS']]),
  record('2026-11-10T17:00:00Z', [['Ana', 'S01A1'], ['Sam', 'S01A2'], ['Mia', 'PW'], ['Gia', 'S02DS']]),
  record('2026-11-17T17:00:00Z', [['Ben', 'S01A1'], ['Leo', 'S03SE'], ['Hugo', 'S02DS']]),
];

export const DEMO = {
  participants: [
    'Mentor', 'Ana', 'Ben', 'Cleo', 'Dan', 'Eva', 'Finn', 'Gia', 'Hugo',
    '<b>Bold</b>', 'Leo', 'Sam', 'Mia', 'Galaxy S21',
  ],
  answers: [
    ['Mentor', 'Write your stage in the chat please'],
    ['Ana', 'S01 arc 1'], ['Ben', 's1a1'], ['Cleo', 'S01 Arc01'], ['Dan', 'S1 A1'], ['Eva', 'S01'],
    ['Finn', 'S02 DS'], ['Gia', 's2'], ['Hugo', 'season 2 ds'],
    ['Leo', 'S03 SE'],
    ['Sam', `stuck on "my_ls", ${'segfault'.repeat(37)}help`],
  ],
  roster,
  history,
};
