# Meet mentoring groups

Chrome extension (Manifest V3) for the owner only: reads students' stage answers
from Google Meet's chat, groups them by stage and fills Meet's breakout panel.

- Spec: `docs/superpowers/specs/2026-11-18-meet-mentoring-groups-design.md`
- Plan: `docs/superpowers/plans/2026-11-20-meet-mentoring-groups-v1.md`

## Commands

- Tests: `npm test` (Node's built-in runner, `node --test`; Node 22).
- Try the panel without Meet: `python3 -m http.server 8765` from the repo root,
  then open `http://localhost:8765/src/panel/panel.html?fake` (also the
  `panel` entry in `.claude/launch.json`).
- Load in Chrome: `chrome://extensions` → Developer mode → Load unpacked → this
  folder.

## Code conventions

- Plain JavaScript ES modules, no build step, no dependencies (no npm packages, dev ones included).
- Only `src/meet/meet.js` reads or drives Meet's page; it is a classic content script with no imports.
- `src/logic/` modules use no `chrome.*` API and no DOM; each has `test/<module>.test.js`.
- The stage list and track paths live only in `src/logic/stages.js`; other code passes stage codes (`S02DS`) and takes labels from there.
- Students are keyed by `nameKey(displayName)` from `src/logic/roster.js`; never compare raw display names.
- Roster, history and the current session are plain JSON objects, changed in place by logic functions and saved whole through `src/store.js` under `chrome.storage.local` keys `roster`, `history`, `current`.
- Pages may set a roster student's `track`, `active` or `group`, a group's `name` and `ownerNames` directly; adding students or groups goes through `src/logic/roster.js`.
- DOM helpers shared by the extension pages (`el`, `button`, `$`) live in `src/dom.js`.
- Meet operations resolve to `{ ok: true, ... }` or `{ ok: false, op, error }` and never throw; `error` is a sentence the owner can act on.
- Each Meet op in `src/meet/meet.js` stops within `OP_MS`, below `TIMEOUT_MS` in `src/panel/meet-client.js`; change them together.
- Chat text and display names are untrusted: put them in the page with `textContent` or DOM nodes, never `innerHTML`.
- Look up name keys with `Object.hasOwn`, never `in`: keys come from untrusted display names.
- Write name-keyed entries with `setOwn(obj, key, value)` from `src/logic/roster.js` (an enumerable, writable, configurable `Object.defineProperty`), never `obj[key] =`, so a name like `__proto__` stays an ordinary key.
- No inline `<script>` or `on…=` attributes in extension pages (MV3 content security policy), and no `confirm()` or `alert()` in the side panel.
- `?fake` on a page means the fake Meet, demo data and an in-memory store, never `chrome.storage`.
