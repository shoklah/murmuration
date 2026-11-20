import { test } from 'node:test';
import assert from 'node:assert/strict';
import { meetingCodeFromUrl } from '../src/panel/meet-client.js';

test('meeting code from a Meet call URL only', () => {
  assert.equal(meetingCodeFromUrl('https://meet.google.com/abc-defg-hij?authuser=1'), 'abc-defg-hij');
  assert.equal(meetingCodeFromUrl('https://meet.google.com/'), null);
  assert.equal(meetingCodeFromUrl('https://meet.google.com/landing'), null);
  assert.equal(meetingCodeFromUrl('https://example.com/abc-defg-hij'), null);
});
