import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAGES, PATHS, stage, tracksOf, trackLabel } from '../src/logic/stages.js';

test('stages follow the spec table, tracks come from the paths', () => {
  assert.deepEqual(STAGES.map(s => [s.code, s.label, s.season, tracksOf(s.code)]), [
    ['PW', 'Preseason Web', 0, ['SE']],
    ['PD', 'Preseason Data', 0, ['DS', 'ML']],
    ['S01A1', 'S01 Arc01', 1, ['SE', 'DS', 'ML']],
    ['S01A2', 'S01 Arc02', 1, ['SE']],
    ['S02SE', 'S02 SE', 2, ['SE']],
    ['S02DS', 'S02 DS', 2, ['DS', 'ML']],
    ['S03SE', 'S03 SE', 3, ['SE']],
    ['S03DS', 'S03 DS', 3, ['DS']],
    ['S03ML', 'S03 ML', 3, ['ML']],
  ]);
});

test('track paths follow the spec', () => {
  assert.deepEqual(PATHS, {
    SE: ['PW', 'S01A1', 'S01A2', 'S02SE', 'S03SE'],
    DS: ['PD', 'S01A1', 'S02DS', 'S03DS'],
    ML: ['PD', 'S01A1', 'S02DS', 'S03ML'],
  });
});

test('labels', () => {
  assert.equal(stage('S02DS').label, 'S02 DS');
  assert.equal(stage('nope'), undefined);
  assert.equal(trackLabel('ML'), 'AI/ML');
  assert.equal(trackLabel('SE'), 'SE');
});
