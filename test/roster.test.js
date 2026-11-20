import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyRoster, nameKey, isOwner, addStudent, createGroup, deleteGroup } from '../src/logic/roster.js';

test('nameKey ignores case and spacing', () => {
  assert.equal(nameKey('  Leo   Martin '), 'leo martin');
  assert.equal(nameKey('LEO MARTIN'), nameKey('leo martin'));
});
test('owner names match whatever their case or spacing', () => {
  const r = emptyRoster(); r.ownerNames = ['Hugo M'];
  assert.equal(isOwner(r, ' hugo  m'), true);
  assert.equal(isOwner(r, 'Hugo Mar'), false);
});
test('addStudent keeps an existing student', () => {
  const r = emptyRoster();
  assert.equal(addStudent(r, 'Ana B'), 'ana b');
  r.students['ana b'].active = true;
  addStudent(r, 'ANA B');
  assert.deepEqual(r.students['ana b'], { name: 'Ana B', track: null, active: true, group: null });
});
test('names that match Object built-ins are ordinary students', () => {
  const r = emptyRoster();
  assert.equal(addStudent(r, 'Constructor'), 'constructor');
  assert.deepEqual(r.students.constructor, { name: 'Constructor', track: null, active: false, group: null });
});
test('deleting a working group frees its members', () => {
  const r = emptyRoster(); addStudent(r, 'Ana');
  const id = createGroup(r, 'Night owls');
  r.students.ana.group = id;
  deleteGroup(r, id);
  assert.equal(r.groups[id], undefined);
  assert.equal(r.students.ana.group, null);
});
