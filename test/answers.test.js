import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAnswer, resolveStage } from '../src/logic/answers.js';

const P = (o) => ({ preseason: null, season: null, arc: null, track: null, stageOnly: true, ...o });
const parseCases = [
  ['S02', P({ season: 2 })],
  ['S02 DS', P({ season: 2, track: 'DS' })],
  ['PW', P({ preseason: 'web' })],
  ['season 1 arc 2', P({ season: 1, arc: 2 })],
  ['s01a2', P({ season: 1, arc: 2 })],
  ['S03ML', P({ season: 3, track: 'ML' })],
  ["I'm in S02 DS now", P({ season: 2, track: 'DS' })],
  ['Pre-season data', P({ preseason: 'data' })],
  ['3', P({ season: 3 })],
  ['S2, AI/ML', P({ season: 2, track: 'ML' })],
  ["I'm on S02 but stuck on task 2", P({ season: 2, stageOnly: false })],
  ['need help with task 3', null],
  ['se you later', null],
  ['hi everyone', null],
  ['stuck on my_ls', null],
  ['', null],
];
for (const [text, expected] of parseCases) {
  test(`parseAnswer ${JSON.stringify(text)}`, () => assert.deepEqual(parseAnswer(text), expected));
}

const R = (stage, guess = false, track = null) => ({ stage, guess, track });
const resolveCases = [ // [text, known track, last stage, expected]
  ['S02', 'DS', null, R('S02DS')],
  ['S02', 'ML', null, R('S02DS')],
  ['S02', 'SE', null, R('S02SE', false, 'SE')],
  ['S02', null, null, null],
  ['preseason', 'SE', null, R('PW', false, 'SE')],
  ['preseason', 'ML', null, R('PD')],
  ['preseason', null, null, null],
  ['pre web', null, null, R('PW', false, 'SE')],
  ['PW', 'DS', null, null],
  ['PD', null, null, R('PD')],
  ['S03 ML', null, null, R('S03ML', false, 'ML')],
  ['S03 AI', 'SE', null, R('S03ML', false, 'ML')],
  ['S02 SE', 'DS', null, R('S02SE', false, 'SE')],
  ['S02 AI', null, null, R('S02DS')],
  ['S01', 'DS', null, R('S01A1')],
  ['S01', 'SE', 'S01A2', R('S01A2', true, 'SE')],
  ['S01', 'SE', 'PW', R('S01A1', true)],
  ['S01', null, null, null],
  ['S01 arc 2', 'DS', null, null],
  ['S01 arc 2', null, null, R('S01A2', false, 'SE')],
  ['S1 A1', null, null, R('S01A1')],
  ['finished preseason, now S01', 'DS', null, R('S01A1')],
];
for (const [text, track, lastStage, expected] of resolveCases) {
  test(`resolveStage ${JSON.stringify(text)} track=${track} last=${lastStage}`, () =>
    assert.deepEqual(resolveStage(parseAnswer(text), { track, lastStage }), expected));
}
