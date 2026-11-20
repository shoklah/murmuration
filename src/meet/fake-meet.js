// An in-memory Meet with the four operations, for tests and the `?fake` panel.
// `unsupported` lists ops that fail, to try each fallback tier.

export function createFakeMeet({ participants = [], unsupported = [] }) {
  const messages = [];
  const people = [...participants];
  const fail = op => ({ ok: false, op, error: 'Not supported.' });

  const meet = {
    rooms: [],
    say(sender, text) { messages.push({ id: `m${messages.length + 1}`, sender, text }); },
    join(name) { people.push(name); },
    leave(name) { if (people.includes(name)) people.splice(people.indexOf(name), 1); },

    async readChat() {
      if (unsupported.includes('readChat')) return fail('readChat');
      return { ok: true, messages: messages.map(m => ({ ...m })) };
    },
    async readParticipants() {
      if (unsupported.includes('readParticipants')) return fail('readParticipants');
      return { ok: true, names: [...people] };
    },
    async createRooms(names) {
      if (unsupported.includes('createRooms')) return fail('createRooms');
      meet.rooms = names.map(name => ({ name, members: [] }));
      return { ok: true };
    },
    async assignName(room, name) {
      if (unsupported.includes('assignName')) return fail('assignName');
      const target = meet.rooms.find(r => r.name === room);
      if (!target) return { ok: false, op: 'assignName', error: `No room named ${room}.` };
      if (!people.includes(name)) return { ok: false, op: 'assignName', error: `${name} is not in the call.` };
      target.members.push(name);
      return { ok: true };
    },
  };
  return meet;
}
