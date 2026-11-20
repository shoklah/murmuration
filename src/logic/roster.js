// The roster: known students, working groups and the owner's own names.
// Students are keyed by nameKey(displayName); display names are untrusted.

export function emptyRoster() {
  return { students: {}, groups: {}, ownerNames: [] };
}

export function nameKey(name) {
  return name.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function isOwner(roster, name) {
  const key = nameKey(name);
  return roster.ownerNames.some(owner => nameKey(owner) === key);
}

// Sets a name-keyed entry; defineProperty, so a name like "__proto__" becomes an ordinary key.
export function setOwn(obj, key, value) {
  Object.defineProperty(obj, key, { value, enumerable: true, writable: true, configurable: true });
}

export function addStudent(roster, name) {
  const key = nameKey(name);
  if (!Object.hasOwn(roster.students, key)) setOwn(roster.students, key, { name, track: null, active: false, group: null });
  return key;
}

export function createGroup(roster, name) {
  const id = crypto.randomUUID();
  roster.groups[id] = { name };
  return id;
}

export function deleteGroup(roster, id) {
  delete roster.groups[id];
  for (const student of Object.values(roster.students)) {
    if (student.group === id) student.group = null;
  }
}
