// Everything that reads or drives Meet's page: the four Meet operations.
// A classic content script with no imports; `ops` stands alone so it can be
// pasted into a page to try it.

const NOT_BUILT = 'Meet support is not built yet.';

async function readChat() {
  return { ok: false, op: 'readChat', error: NOT_BUILT };
}

async function readParticipants() {
  return { ok: false, op: 'readParticipants', error: NOT_BUILT };
}

async function createRooms(names) {
  return { ok: false, op: 'createRooms', error: NOT_BUILT };
}

async function assignName(room, name) {
  return { ok: false, op: 'assignName', error: NOT_BUILT };
}

const ops = { readChat, readParticipants, createRooms, assignName };

if (globalThis.chrome?.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    const op = msg?.op;
    Promise.resolve()
      .then(() => {
        if (!Object.hasOwn(ops, op)) throw new Error(`unknown operation ${op}`);
        return ops[op](...(msg.args ?? []));
      })
      .catch(error => ({ ok: false, op, error: `${op} failed in the Meet tab (${error.message}). Reload the Meet tab, then try again.` }))
      .then(sendResponse);
    return true;
  });
}
