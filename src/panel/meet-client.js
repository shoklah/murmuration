// The panel's side of the four Meet operations: finds the Meet tab and sends
// each operation to src/meet/meet.js in it.

const CALL_PATH = /^\/([a-z]{3}-[a-z]{4}-[a-z]{3})$/;
const TIMEOUT_MS = 10000;
const UNREACHABLE = 'Cannot reach the Meet tab. Reload the Meet tab, then try again.';
const TOO_SLOW = 'Meet did not answer in time.';

export function meetingCodeFromUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.origin !== 'https://meet.google.com') return null;
  return CALL_PATH.exec(parsed.pathname)?.[1] ?? null;
}

export async function findMeetTab(meetingCode) {
  const tabs = meetingCode
    ? await chrome.tabs.query({ url: 'https://meet.google.com/*' })
    : await chrome.tabs.query({ active: true, currentWindow: true });
  for (const tab of tabs) {
    const code = meetingCodeFromUrl(tab.url ?? '');
    if (code && (!meetingCode || code === meetingCode)) return { tabId: tab.id, meetingCode: code };
  }
  return null;
}

export function createMeetClient(tabId) {
  function send(op, ...args) {
    let timer;
    const timeout = new Promise(resolve => {
      timer = setTimeout(() => resolve({ ok: false, op, error: TOO_SLOW }), TIMEOUT_MS);
    });
    const answer = chrome.tabs.sendMessage(tabId, { op, args })
      .then(result => result ?? { ok: false, op, error: UNREACHABLE }, () => ({ ok: false, op, error: UNREACHABLE }));
    return Promise.race([answer, timeout]).finally(() => clearTimeout(timer));
  }
  return {
    readChat: () => send('readChat'),
    readParticipants: () => send('readParticipants'),
    createRooms: names => send('createRooms', names),
    assignName: (room, name) => send('assignName', room, name),
  };
}
