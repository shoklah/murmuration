// Everything that reads or drives Meet's page: the four Meet operations.
// A classic content script with no imports; `ops` stands alone so it can be
// pasted into a page to try it.

// Chat: every message element carries Meet's own id in `data-message-id`. A
// run of messages from one person sits under a header holding the time
// (`jsname=biJjHb`) and, for anyone but the signed-in account, the sender's
// name. Meet renders some messages twice (a pinned copy) under the same id, so
// ids are deduplicated. Meet only builds the chat list (`CHAT_LIST`) once its
// chat panel has been opened, then keeps it with the panel closed, so it is
// opened (and closed again) once when the list isn't there yet.
const CHAT_LIST = '[data-panel-id="2"] [jsname="xySENc"]';

async function readChat() {
  if (!document.querySelector(CHAT_LIST)) {
    const button = document.querySelector('[aria-label^="Chat with everyone"]');
    if (!button) return { ok: false, op: 'readChat', error: 'The Meet chat was not found. Make sure the call has started, then try again.' };
    button.click();
    const listed = await waitFor(() => document.querySelector(CHAT_LIST));
    button.click();
    if (!listed) return { ok: false, op: 'readChat', error: "Meet's chat did not appear. Open Meet's chat panel once, then try again." };
  }
  const messages = [];
  const seen = new Set();
  for (const el of document.querySelectorAll('[data-message-id]')) {
    const id = el.getAttribute('data-message-id');
    const textEl = el.querySelector('[jsname="dTKtvb"]');
    if (seen.has(id) || !textEl) continue;
    seen.add(id);
    const sender = chatSender(el);
    if (sender) messages.push({ id, sender, text: textEl.textContent });
  }
  return { ok: true, messages };
}

// The sender's name in the header above a message, or '' for the signed-in
// account's own messages, whose header holds only the time.
function chatSender(messageEl) {
  for (let n = messageEl.parentElement; n && n !== document.body; n = n.parentElement) {
    const time = n.querySelector('[jsname="biJjHb"]');
    if (time && !messageEl.contains(time)) {
      return time.parentElement.textContent.replace(time.textContent, '').trim();
    }
  }
  return '';
}

// Participants: the People panel holds `[role=list][aria-label=Participants]`,
// one `[role=listitem]` per person whose aria-label is the plain display name.
// The list stays in the page after the panel closes, so it is opened once
// (and closed again) only when the list isn't there yet.
const PARTICIPANTS = '[role="list"][aria-label="Participants"] [role="listitem"]';

async function readParticipants() {
  if (!document.querySelector(PARTICIPANTS)) {
    const button = peopleButton();
    if (!button) return { ok: false, op: 'readParticipants', error: "Meet's People button was not found. Open the People panel once, then try again." };
    button.click();
    const listed = await waitFor(() => document.querySelector(PARTICIPANTS));
    button.click();
    if (!listed) return { ok: false, op: 'readParticipants', error: "Meet's participant list did not appear. Open the People panel once, then try again." };
  }
  const names = [...document.querySelectorAll(PARTICIPANTS)].map(e => e.getAttribute('aria-label')).filter(Boolean);
  return { ok: true, names: [...new Set(names)] };
}

// The People button is labelled by a separate element reading "People".
function peopleButton() {
  return [...document.querySelectorAll('[role="button"][aria-labelledby]')]
    .find(b => document.getElementById(b.getAttribute('aria-labelledby'))?.textContent.trim() === 'People');
}

// Polls `find` until it returns something truthy, or null after `ms`.
async function waitFor(find, ms = 4000) {
  for (const end = Date.now() + ms; Date.now() < end; await new Promise(r => setTimeout(r, 200))) {
    const found = find();
    if (found) return found;
  }
  return null;
}

// Breakout rooms: the host's breakout panel has an editor ("Set up breakout
// rooms", or "Edit rooms" once rooms exist) with a "Room count" number input,
// one "Room name …" input and one "Participants" input per room, and
// "Open rooms", which is never pressed here. Meet makes at least the count
// input's `min` rooms (2); an extra room is named "Spare 1" and stays empty.
// A room's name reaches its room box (`roomBox`) a moment after its input.
const ROOM_COUNT = 'input[aria-label="Room count"]';
const visible = selector => [...document.querySelectorAll(selector)].filter(e => e.offsetParent);
const roomNameInputs = () => visible('input[aria-label^="Room name"]');

async function createRooms(names) {
  const editor = await openRoomEditor();
  if (!editor.ok) return { ok: false, op: 'createRooms', error: editor.error };
  const countInput = document.querySelector(ROOM_COUNT);
  const count = Math.max(names.length, Number(countInput.min) || 1);
  setValue(countInput, String(count));
  if (!await waitFor(() => roomNameInputs().length === count)) {
    return { ok: false, op: 'createRooms', error: `Meet did not make ${names.length} rooms. Create them by hand.` };
  }
  roomNameInputs().forEach((input, i) => setValue(input, names[i] ?? `Spare ${i + 1 - names.length}`));
  if (!await waitFor(() => names.every(name => roomBox(name)))) {
    return { ok: false, op: 'createRooms', error: 'Meet did not take the room names. Create the rooms by hand.' };
  }
  return { ok: true };
}

// Opens the breakout panel's editor if it isn't open yet.
async function openRoomEditor() {
  if (document.querySelector(ROOM_COUNT)?.offsetParent) return { ok: true };
  const editButton = () => visible('[aria-label="Set up breakout rooms"], [aria-label="Edit rooms"]')[0];
  if (!editButton()) {
    // The breakout tool sits in the "Meeting tools" panel, built when it first opens.
    const findTool = () => visible('[aria-label^="Breakout rooms Break into"]')[0];
    if (!findTool()) document.querySelector('[aria-label="Meeting tools"]')?.click();
    const tool = await waitFor(findTool, 5000);
    if (!tool) return { ok: false, error: "Meet's breakout rooms were not found. Turn on breakout rooms in the host controls, then try again." };
    tool.click();
  }
  const button = await waitFor(editButton, 5000);
  if (!button) return { ok: false, error: "Meet's breakout panel did not open. Open it by hand, then try again." };
  button.click();
  return await waitFor(() => document.querySelector(ROOM_COUNT)?.offsetParent)
    ? { ok: true }
    : { ok: false, error: "Meet's breakout room editor did not open. Open it by hand, then try again." };
}

// Sets an input the way typing would, so Meet's own model takes the value.
// Meet commits on focus-out; `blur()` fires nothing while the side panel has
// the focus, so the events are sent directly.
function setValue(input, value) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
  input.dispatchEvent(new FocusEvent('blur'));
}

// In the editor each room is `[jsname=lhPi8b]` with `data-display-name` set to
// its name, holding one chip `[jsname=XPtOyb][data-display-name=<person>]`
// per member. Typing into the room's "Participants" input lists matches in a
// `[role=listbox][aria-label=Participants]`; clicking one moves that person.
const sameName = (a, b) => a.trim().replace(/\s+/g, ' ').toLowerCase() === b.trim().replace(/\s+/g, ' ').toLowerCase();
const roomBox = room => visible('[jsname="lhPi8b"]').find(r => r.getAttribute('data-display-name') === room);
const inRoom = (box, name) => [...box.querySelectorAll('[jsname="XPtOyb"]')].some(c => sameName(c.getAttribute('data-display-name') ?? '', name));

async function assignName(room, name) {
  const fail = error => ({ ok: false, op: 'assignName', error });
  const editor = await openRoomEditor();
  if (!editor.ok) return fail(editor.error);
  const box = await waitFor(() => roomBox(room), 2000);
  if (!box) return fail(`No room named ${room} in Meet's breakout panel.`);
  if (inRoom(box, name)) return { ok: true };
  const input = box.querySelector('input[aria-label="Participants"]');
  if (!input) return fail(`Meet's room ${room} has no field for names. Put ${name} in it by hand.`);
  input.focus();
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, name);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  const option = await waitFor(() => visible('[role="listbox"][aria-label="Participants"] [role="option"]')
    .find(o => sameName(o.innerText, name)));
  if (!option) {
    setValue(input, '');
    return fail(`${name} is not in the call.`);
  }
  option.click();
  return await waitFor(() => inRoom(roomBox(room) ?? box, name))
    ? { ok: true }
    : fail(`Meet did not put ${name} in ${room}. Put them in it by hand.`);
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
