# Meet mentoring groups v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Chrome extension, for the owner only, that reads students' stage answers from a Meet call's chat, groups them into breakout rooms by the owner's rules, fills Meet's breakout panel, and keeps a roster and session history.

**Architecture:** Pure logic modules in `src/logic/` (stages, answer reading, grouping, roster, history, session state, Meet flow) tested with `node --test`. Two extension pages, the side panel and the roster page, keep the session in `chrome.storage.local`. They talk to Meet through four operations. In phase 1 those come from a fake Meet. In phase 2 they come from the one Meet-specific content script, written against the live page with the owner present.

**Tech Stack:** Chrome Manifest V3 (side panel, content script, `chrome.storage.local`), plain JavaScript ES modules, Node 22 built-in test runner. No dependencies, no build step.

**Spec:** `docs/superpowers/specs/2026-11-18-meet-mentoring-groups-design.md`. This plan covers the version 1 (chat-based) part only. The section "Next version: Qwasar snapshot" is out of scope, with no hooks for it.

## Global Constraints

- "A Chrome extension, Manifest V3, plain JavaScript (ES modules), no build step, no dependencies."
- "Loaded unpacked from a folder; updated by the owner. Not on the Web Store."
- "The live interface is Chrome's side panel, not injected into Meet's page; the roster is an extension page in a full tab."
- "Everything that depends on Meet's page lives in one file. It exposes four operations: read chat, read participants, create and rename rooms, assign a name. Nothing else."
- "When an operation fails, it reports which one, and the panel says so and falls back to showing the room list."
- "Stages, answer reading, grouping and history logic are plain modules with no Chrome or Meet code, tested automatically with Node's built-in test runner."
- "Permissions: storage, side panel, and access to `meet.google.com` only. No network calls; data never leaves the owner's Chrome."
- "The extension never opens rooms itself." "It never adds, removes or moves people after Fill."
- "The stage list lives in one place in the code so it can be changed if the curriculum does."
- Room names: "`<stage label> · <letter>`: `S02 DS · A`, `S01 Arc01 · B`, `Preseason Web · A`."
- The project's `CLAUDE.md` `## Code conventions` apply to every task.

## Review Focus

1. **The same chat message seen on several polls, or shown twice by Meet.** It must count once and never flip a stage back. Pinned in Task 5 (same id applied once) and Task 6 (the full chat list re-read on every poll). Task 10 makes the Meet file return stable ids.
2. **Everyday chat with numbers or track words**, such as "need help with task 3", "se you later" or "I'm on S02 but stuck on task 2". It must not set or change a stage wrongly. Pinned in Task 2's parse table and Task 5's "later chatter" test.
3. **One person's name with different case or spacing** across chat, the participant list and the roster, the owner's own names included. It is one student, and the owner is never a student. Pinned in Task 4 (`nameKey`, `isOwner`) and Task 5 (owner messages ignored whatever their case).
4. **Chat text or names containing HTML (`<b>`, `<img src=x>`), quotes or very long lines.** Students are coding students, so expect this. Shown literally, with the layout intact. Pinned by Task 7's check with a fake student named `<b>Bold</b>` and Task 8's preview check.
5. **Side panel closed and reopened, or Chrome restarted, mid-session.** The session resumes with its answers, plan and Fill state. Task 7's store test covers saving and loading. The reopen itself needs Chrome's real store, so Task 10's trial checks it twice: after Start and after Fill.

---

## File structure

```
manifest.json                 MV3 manifest (Task 7)
package.json                  {"type": "module", "scripts": {"test": "node --test"}} (Task 1)
.claude/launch.json           static server for trying pages in the browser pane (Task 7)
src/background.js             opens the side panel on the toolbar button (Task 7)
src/store.js                  chrome.storage.local or in-memory store (Task 7)
src/logic/stages.js           the single stage list, labels, track paths (Task 1)
src/logic/answers.js          parse a chat message, resolve it to a stage (Task 2)
src/logic/grouping.js         rooms for one stage, the whole plan, Join and suggestions (Task 3)
src/logic/roster.js           name keys, owner names, roster students, working groups (Task 4)
src/logic/history.js          last known stages, timeline, CSV, backup (Task 4)
src/logic/session.js          the live session: messages, stages, Split, Fill state, summary, record (Task 5)
src/logic/flow.js             polling Meet and filling rooms through the four operations (Task 6)
src/meet/fake-meet.js         fake Meet with the four operations (Task 6)
src/meet/meet.js              THE Meet-specific file: content script (stub Task 7, real Task 10)
src/panel/panel.html|css|js   side panel (Tasks 7, 8)
src/panel/meet-client.js      messaging from the panel to meet.js in the Meet tab (Task 7)
src/panel/demo.js             demo call and data for ?fake (Task 7)
src/roster-page/roster-page.html|css|js   roster page (Task 9)
docs/meet-checks.md           results of the four Meet checks and how meet.js finds things (Task 10)
test/<module>.test.js         one per logic module, plus store and meet-client
```

**Checks in the browser pane** (Tasks 7–9) use the Claude app's built-in browser on a static server started from the task's own working folder: Task 7 and Task 8 on port 8765 (`python3 -m http.server 8765`, or the `panel` entry of `.claude/launch.json` outside a wave), Task 9 on port 8766, so the two Wave B tasks never serve each other's folder. An implementer without browser tools reports the check as not run, and the session running implementation runs it before the task review.

## Shared data shapes

These shapes are defined once here, and tasks refer to them by name. Keys are `nameKey(displayName)`.

```js
// Stage code: 'PW' | 'PD' | 'S01A1' | 'S01A2' | 'S02SE' | 'S02DS' | 'S03SE' | 'S03DS' | 'S03ML'
// Track: 'SE' | 'DS' | 'ML'   (label 'AI/ML' for ML)

Roster = {
  students: { [key]: { name: string, track: Track|null, active: boolean, group: string|null } }, // group = working-group id; one group per student
  groups: { [id]: { name: string } },
  ownerNames: string[],                     // the owner's Meet display names
}

Session = {                                 // saved as `current` after every change
  startedAt: string, meetingCode: string,   // ISO time; 'abc-defg-hij'
  seen: string[],                           // chat message ids already applied
  students: { [key]: SessionStudent },      // insertion order = first seen
  mixWorkingGroups: boolean,
  plan: Room[] | null,                      // frozen by split(); null before
  outdated: boolean,                        // an adjustment after split() not yet re-split; Fill waits for Re-split
  filled: boolean,                          // true once Fill started typing names
}
SessionStudent = {
  name: string, isNew: boolean,             // isNew: not on the roster when first seen this session
  stage: string|null, source: 'answer'|'guess'|'owner'|null, fromMessage: string|null,
  unclear: string|null,                     // latest message that gave no usable stage
  flag: string|null,                        // stage-only message received after being placed by Fill
  ignored: boolean, lone: 'alone'|'join'|null,   // lone: the owner's Keep alone / Join click
  alone: 'alone'|'join'|null,               // outcome set by split(): own room of 1, or joined another stage's room
  room: string|null,                        // room from the plan at Fill
  afterFill: boolean,                       // placed by the owner after Fill (Placed button)
}
Room = { name: string, stage: string, members: string[] }      // member keys
Ctx = { roster: Roster, lastStages: { [key]: string } }         // lastStages = lastKnownStages(history)

SessionRecord = { startedAt, meetingCode, students: RecordStudent[] }   // history = SessionRecord[]
RecordStudent = { key, name, stage: string|null, source: 'answer'|'guess'|'owner'|null,
  room: string|null, active: boolean, group: string|null /* group name */,
  alone: 'alone'|'join'|null, afterFill: boolean }

Meet = {                                    // the four operations; fake and real share it
  readChat(): Promise<{ ok: true, messages: { id: string, sender: string, text: string }[] } | Failure>,
      // every message since the call started, oldest first, each id once, ids stable across calls and
      // independent of list position; messages the signed-in (owner's) account sent are left out
  readParticipants(): Promise<{ ok: true, names: string[] } | Failure>,   // display names in the call, owner included
  createRooms(names: string[]): Promise<{ ok: true } | Failure>,         // Meet's breakout panel then holds exactly these rooms, in order
  assignName(room: string, name: string): Promise<{ ok: true } | Failure>,// puts that participant in that room; rooms not opened
}
Failure = { ok: false, op: 'readChat'|'readParticipants'|'createRooms'|'assignName', error: string }
```

---

# Phase 1: everything without Meet

### Task 1: Stages and test setup

**Files:**
- Create: `package.json`, `src/logic/stages.js`
- Test: `test/stages.test.js`

**Interfaces:**
- Produces:
  - `TRACKS: ['SE', 'DS', 'ML']`
  - `STAGES: { code, label, season }[]` in the spec's table order. `season` is 0 for PW/PD and 1, 2 or 3 otherwise.
  - `PATHS: { SE: string[], DS: string[], ML: string[] }`: the only record of which track has which stage.
  - `stage(code: string) → { code, label, season } | undefined`
  - `tracksOf(code: string) → Track[]`: the tracks whose path holds the stage, in `TRACKS` order.
  - `trackLabel(track: Track) → string`

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run it and check that it fails.** `npm test`. Expected: FAIL, cannot find `src/logic/stages.js`. First create `package.json` with exactly `{"name": "meet-mentoring-groups", "private": true, "type": "module", "scripts": {"test": "node --test"}}`.
- [ ] **Step 3: Implement `src/logic/stages.js`** with the exports above, data copied from the spec's Stages section.
- [ ] **Step 4: Run it and check that it passes.** `npm test`. Expected: PASS, 3 tests.
- [ ] **Step 5: Commit.** `git add package.json src/logic/stages.js test/stages.test.js && git commit -m "feat: stage list and track paths"`

---

### Task 2: Reading answers

**Wave:** A

**Files:**
- Create: `src/logic/answers.js`
- Test: `test/answers.test.js`

**Interfaces:**
- Consumes: `STAGES`, `PATHS`, `stage()`, `tracksOf()` (Task 1)
- Produces:
  - `parseAnswer(text: string) → Parsed | null`, where `Parsed = { preseason: 'web'|'data'|'any'|null, season: 1|2|3|null, arc: 1|2|null, track: Track|null, stageOnly: boolean }`. It returns `null` when the message holds no stage information, meaning no preseason word and no season.
  - `resolveStage(parsed: Parsed, { track: Track|null, lastStage: string|null }) → { stage: string, guess: boolean, track: Track|null } | null`. The `track` it returns is the one to record on the roster. `null` means Unclear.

**Parsing rules:**
- Lowercase the text and delete apostrophes. Replace every other character that isn't a letter or digit with a space, then split on spaces.
- Stage tokens:
  - `pw`: preseason web. `pd`: preseason data.
  - `pre`, `preseason`, or `pre` followed by `season`: preseason. With `web` anywhere it is web; with `data` it is data; otherwise `any`.
  - A token matching `^s0?([1-3])(?:a(?:rc)?0?([12]))?(se|ds|ml|ai)?$` gives the season, plus the arc and track when present.
  - `season` followed by `0?[1-3]`: season.
  - `arc` followed by `0?[12]`, or a token matching `^a(?:rc)?0?([12])$`: arc.
  - `se`: SE, `ds`: DS, `ml` or `ai`: ML.
  - A bare `0?[1-3]`: season, but **only when the message is stage-only** and no other season was found.
- When a field appears twice, the first one wins.
- Filler words: `i im am in on at now`.
- `stageOnly`: every token is a stage token, `season`, `arc`, `web`, `data` or a filler word.

**Resolution rules:**
- The effective track `T` is `parsed.track ?? track`.
- When a message has both a season and a preseason word, the season wins.
- Preseason: web → PW, data → PD. `any` → PW for SE and PD for DS/ML; Unclear when `T` is unknown.
- Season 1:
  - Arc 1 → S01A1, arc 2 → S01A2.
  - No arc, DS or ML → S01A1.
  - No arc, SE → `lastStage` if it is S01A1 or S01A2, else S01A1. Both are `guess: true`.
  - No arc, unknown `T` → Unclear.
- Season 2 or 3: the stage with that season on `PATHS[T]`. Unclear when `T` is unknown.
- When `T` is known and the stage isn't on `PATHS[T]` → Unclear.
- The returned `track` is the stage's only track when it has exactly one, else `null`. A full answer like "S03 ML" records ML; "S02 DS" records nothing, because DS and AI/ML share that stage.

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run it and check that it fails.** `npm test`. Expected: FAIL, cannot find `src/logic/answers.js`.
- [ ] **Step 3: Implement `parseAnswer` and `resolveStage`** in `src/logic/answers.js` by the rules above. Take seasons and paths from `stages.js`; don't list stage codes again.
- [ ] **Step 4: Run it and check that it passes.** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit.** `git add src/logic/answers.js test/answers.test.js && git commit -m "feat: read stage answers from chat messages"`

---

### Task 3: Grouping

**Wave:** A

**Files:**
- Create: `src/logic/grouping.js`
- Test: `test/grouping.test.js`

**Interfaces:**
- Consumes: `STAGES`, `PATHS`, `stage()`, `tracksOf()` (Task 1)
- Produces:
  - `groupStage(entries: { key, active: boolean, group: string|null }[]) → string[][]`: the rooms for one stage, as lists of keys. A `group` shared by 2 or more entries is a working-group unit. A group with one entry here counts as no group.
  - `planRooms(entries: { key, stage, track, active, group, lone }[]) → Room[]`: every room, ordered as in `STAGES`, then by letter.
  - `joinTarget(stageCode: string, track: Track|null, rooms: Room[]) → Room | null`
  - `suggestRoom(entry: { key, stage, track, group }, rooms: Room[], groupOf: { [key]: string|null }) → Room | null`

**Algorithm for `groupStage`** (the spec's rules, with the gaps it leaves decided):
1. Room count follows the spec exactly. Units are working groups present with 2 or more members. `A` is the active students outside units. `anchors = units + floor(A/2)`, `k_size = ceil(n/4)`. If `1 ≤ anchors < k_size`, then `k = max(ceil(n/5), anchors)`; otherwise `k = k_size`.
2. Start `k` empty rooms. Place units first, largest first, then the active pairs. Each anchor goes to the currently smallest room, the lowest index on ties.
3. An odd active student left over goes to the smallest room whose anchor is an active pair. Failing that, it goes to the smallest room with any anchor; failing that, to the smallest room.
4. Everyone else, in input order, goes one at a time to the currently smallest room.
5. Drop empty rooms. A room of 1 joins the smallest other room, so a big working group can leave no room of 1. With a single room, the 1 stays.

**`planRooms`:**
- A stage with 2 or more entries is split with `groupStage`.
- Then each stage with exactly 1 entry, in `STAGES` order:
  - When `lone` is `'join'` and `joinTarget` finds a room, the student goes into that room.
  - Otherwise they get their own room (`lone` `null` counts as Keep alone).
- Rooms of a stage are named `` `${label} · ${letter}` ``, with letters A, B, C… in order.

**`joinTarget`:**
- Paths: the track's path if it contains the stage, else every path that contains it.
- For distance d = 1, 2…, take the stages d steps lower on those paths that have rooms in `rooms`. Pick the smallest room among them, the first in `rooms` order on ties. If no lower stage has rooms, do the same going higher. `null` when nothing is found.

**`suggestRoom`:**
1. The room of the same stage that holds a member whose `groupOf` equals `entry.group`, when the group is not null.
2. Else the smallest room of `entry.stage`.
3. Else `joinTarget(entry.stage, entry.track, rooms)`.

`null` when the stage is null.

- [ ] **Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupStage, planRooms, joinTarget, suggestRoom } from '../src/logic/grouping.js';

// n students at one stage: working groups take the first keys, then `active` actives, then passives
function at(n, { active = 0, groups = [] } = {}) {
  const e = Array.from({ length: n }, (_, i) => ({ key: `s${i}`, active: false, group: null }));
  let i = 0;
  groups.forEach((size, g) => { for (let j = 0; j < size; j++) e[i++].group = `g${g}`; });
  for (let a = 0; a < active; a++) e[i++].active = true;
  return e;
}
const sizes = rooms => rooms.map(r => r.length).sort((a, b) => b - a);
const activesPerRoom = (e, rooms) =>
  rooms.map(r => r.filter(k => e.find(x => x.key === k).active).length).sort((a, b) => b - a);

const table = [ // spec's table, then the edges this plan decides
  [3, {}, [3]], [4, {}, [4]], [5, {}, [3, 2]], [6, {}, [3, 3]], [7, {}, [4, 3]],
  [9, {}, [3, 3, 3]], [10, {}, [4, 3, 3]], [11, {}, [4, 4, 3]],
  [5, { active: 2 }, [5]], [8, { active: 2 }, [4, 4]], [8, { active: 4 }, [4, 4]],
  [10, { groups: [2, 2] }, [5, 5]], [7, { groups: [2], active: 2 }, [4, 3]],
  [2, {}, [2]], [5, { active: 1 }, [3, 2]], [9, { active: 3 }, [5, 4]],
  [6, { groups: [5] }, [6]], [8, { groups: [8] }, [8]],
];
for (const [n, opts, expected] of table) {
  test(`groupStage ${n} ${JSON.stringify(opts)}`, () => assert.deepEqual(sizes(groupStage(at(n, opts))), expected));
}

test('active students go in pairs, one anchor per room', () => {
  let e = at(8, { active: 2 }); assert.deepEqual(activesPerRoom(e, groupStage(e)), [2, 0]);
  e = at(8, { active: 4 }); assert.deepEqual(activesPerRoom(e, groupStage(e)), [2, 2]);
  e = at(9, { active: 3 }); assert.deepEqual(activesPerRoom(e, groupStage(e)), [3, 0]);
  e = at(10, { groups: [2, 2] });
  for (const r of groupStage(e)) assert.equal(new Set(r.map(k => e.find(x => x.key === k).group).filter(Boolean)).size, 1);
  e = at(7, { groups: [2], active: 2 });
  for (const r of groupStage(e)) {
    const m = r.map(k => e.find(x => x.key === k));
    assert.equal(m.filter(x => x.group).length === 2 || m.filter(x => x.active).length === 2, true);
  }
});

const E = (key, stage, o = {}) => ({ key, stage, track: null, active: false, group: null, lone: null, ...o });
test('planRooms names rooms by stage and letter, in stage order', () => {
  const rooms = planRooms([E('a', 'S02DS'), E('b', 'PW'), E('c', 'S02DS'), E('d', 'PW'),
    E('e', 'S02DS'), E('f', 'S02DS'), E('g', 'S02DS')]);
  assert.deepEqual(rooms.map(r => [r.name, r.stage, r.members.length]),
    [['Preseason Web · A', 'PW', 2], ['S02 DS · A', 'S02DS', 3], ['S02 DS · B', 'S02DS', 2]]);
});
test('a lone student keeps their own room unless they choose Join', () => {
  const base = [E('a', 'S02SE'), E('b', 'S02SE'), E('c', 'S02SE'), E('d', 'S02SE'), E('e', 'S02SE')];
  assert.deepEqual(planRooms([...base, E('leo', 'S03SE', { track: 'SE' })]).at(-1),
    { name: 'S03 SE · A', stage: 'S03SE', members: ['leo'] });
  const joined = planRooms([...base, E('leo', 'S03SE', { track: 'SE', lone: 'join' })]);
  assert.deepEqual(joined.map(r => [r.name, r.members.length]), [['S02 SE · A', 3], ['S02 SE · B', 3]]);
  assert.ok(joined[1].members.includes('leo'));
});
test('joinTarget: nearest lower stage on the path, else higher, else none', () => {
  const R = (name, stage, n) => ({ name, stage, members: Array(n).fill('x') });
  const rooms = [R('Preseason Web · A', 'PW', 3), R('Preseason Data · A', 'PD', 2), R('S02 SE · A', 'S02SE', 4)];
  assert.equal(joinTarget('S03SE', 'SE', rooms).name, 'S02 SE · A');
  assert.equal(joinTarget('S01A1', null, rooms).name, 'Preseason Data · A');   // unknown track: PW and PD both 1 lower, smaller wins
  assert.equal(joinTarget('PW', 'SE', [R('S01 Arc01 · A', 'S01A1', 3)]).name, 'S01 Arc01 · A');
  assert.equal(joinTarget('PW', 'SE', []), null);
});
test('suggestRoom: working-group room, else smallest room of the stage, else Join rule', () => {
  const rooms = [{ name: 'S02 DS · A', stage: 'S02DS', members: ['ana', 'x1', 'x2', 'x3'] },
                 { name: 'S02 DS · B', stage: 'S02DS', members: ['y1', 'y2'] }];
  const groupOf = { ana: 'g1' };
  assert.equal(suggestRoom({ key: 'zoe', stage: 'S02DS', track: 'DS', group: 'g1' }, rooms, groupOf).name, 'S02 DS · A');
  assert.equal(suggestRoom({ key: 'zoe', stage: 'S02DS', track: 'DS', group: null }, rooms, groupOf).name, 'S02 DS · B');
  assert.equal(suggestRoom({ key: 'zoe', stage: 'S03DS', track: 'DS', group: null }, rooms, groupOf).name, 'S02 DS · B');
  assert.equal(suggestRoom({ key: 'zoe', stage: null, track: 'DS', group: null }, rooms, groupOf), null);
});
```

- [ ] **Step 2: Run it and check that it fails.** `npm test`. Expected: FAIL, cannot find `src/logic/grouping.js`.
- [ ] **Step 3: Implement the four functions** in `src/logic/grouping.js` by the algorithm above.
- [ ] **Step 4: Run it and check that it passes.** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit.** `git add src/logic/grouping.js test/grouping.test.js && git commit -m "feat: grouping rules and room plan"`

---

### Task 4: Roster and history data

**Wave:** A

**Files:**
- Create: `src/logic/roster.js`, `src/logic/history.js`
- Test: `test/roster.test.js`, `test/history.test.js`

**Interfaces:**
- Consumes: `stage()` (Task 1), for labels in the CSV
- Produces, in `roster.js`:
  - `emptyRoster() → Roster`
  - `nameKey(name: string) → string`: NFC, trimmed, inner whitespace collapsed to one space, lowercase.
  - `isOwner(roster, name) → boolean`
  - `addStudent(roster, name) → key`: adds `{ name, track: null, active: false, group: null }` if the key is missing (`Object.hasOwn`) and keeps an existing entry untouched.
  - `createGroup(roster, name) → id`, using `crypto.randomUUID()`.
  - `deleteGroup(roster, id)`: also clears `group` on its members.
- Produces, in `history.js`:
  - `lastKnownStages(history: SessionRecord[]) → { [key]: string }`: the latest stage per key whose source is `'answer'` or `'owner'`, never a guess.
  - `timeline(history, key) → { startedAt, stage, source }[]`, oldest first.
  - `historyToCsv(history) → string`
  - `exportBackup({ roster, history }, exportedAt: string) → string`
  - `parseBackup(text: string) → { roster, history }`

**Formats:**
- CSV header, exactly: `date,meeting,name,stage,source,room,active,working group,alone,after fill`.
- One row per student per session, in history order. `date` is `startedAt`, `stage` is the stage label, and `active` and `after fill` are `yes` or `no`. Empty for null.
- A field containing `,`, `"` or a newline is wrapped in `"`, with `"` doubled. Lines end with `\n`.
- Backup: `JSON.stringify({ app: 'meet-mentoring-groups', version: 1, exportedAt, roster, history }, null, 2)`.
- `parseBackup` throws `new Error('This file is not a mentoring-groups backup.')` in each of these cases:
  - the JSON doesn't parse;
  - `app` or `version` don't match;
  - `roster.students` or `roster.groups` is not an object;
  - `roster.ownerNames` or `history` is not an array.

- [ ] **Step 1: Write the failing tests**

```js
// test/roster.test.js
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
```

```js
// test/history.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lastKnownStages, timeline, historyToCsv, exportBackup, parseBackup } from '../src/logic/history.js';
import { emptyRoster } from '../src/logic/roster.js';

const S = (key, name, stage, source, o = {}) =>
  ({ key, name, stage, source, room: null, active: false, group: null, alone: null, afterFill: false, ...o });
const history = [
  { startedAt: '2026-11-17T17:00:00Z', meetingCode: 'abc-defg-hij', students: [S('mia', 'Mia', 'PW', 'answer'), S('leo', 'Leo', 'S01A2', 'owner')] },
  { startedAt: '2026-11-19T17:00:00Z', meetingCode: 'abc-defg-hij', students: [S('mia', 'Mia', 'S01A1', 'guess'),
    S('leo', 'Leo, "the 2nd"', 'S02SE', 'answer', { room: 'S02 SE · A', active: true, group: 'Owls', alone: 'join', afterFill: true })] },
];
test('last known stage skips guesses', () => assert.deepEqual(lastKnownStages(history), { mia: 'PW', leo: 'S02SE' }));
test('timeline is oldest first', () => assert.deepEqual(timeline(history, 'mia').map(t => t.stage), ['PW', 'S01A1']));
test('CSV quotes names with commas and quotes', () => {
  const lines = historyToCsv(history).split('\n');
  assert.equal(lines[0], 'date,meeting,name,stage,source,room,active,working group,alone,after fill');
  assert.equal(lines[4], '2026-11-19T17:00:00Z,abc-defg-hij,"Leo, ""the 2nd""",S02 SE,answer,S02 SE · A,yes,Owls,join,yes');
});
test('backup round trip', () => {
  const roster = emptyRoster();
  assert.deepEqual(parseBackup(exportBackup({ roster, history }, '2026-11-20T10:00:00Z')), { roster, history });
});
test('a wrong file is refused with a readable error', () => {
  for (const text of ['not json', '{}', JSON.stringify({ app: 'meet-mentoring-groups', version: 1, roster: {}, history: [] })])
    assert.throws(() => parseBackup(text), { message: 'This file is not a mentoring-groups backup.' });
});
```

- [ ] **Step 2: Run them and check that they fail.** `npm test`. Expected: FAIL, the modules are missing.
- [ ] **Step 3: Implement `src/logic/roster.js` and `src/logic/history.js`** with the exports above.
- [ ] **Step 4: Run them and check that they pass.** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit.** `git add src/logic/roster.js src/logic/history.js test/roster.test.js test/history.test.js && git commit -m "feat: roster, history, CSV and backup"`

---

### Task 5: Session state

**Files:**
- Create: `src/logic/session.js`
- Test: `test/session.test.js`

**Interfaces:**
- Consumes:
  - `parseAnswer`, `resolveStage` (Task 2)
  - `planRooms`, `joinTarget`, `suggestRoom` (Task 3)
  - `nameKey`, `isOwner`, `addStudent` (Task 4)
  - `STAGES`, `stage()` (Task 1)
- Produces. All of these change `session` and `ctx.roster` in place.
  - `createSession({ startedAt, meetingCode }) → Session`
  - `applyMessage(session, ctx, { id, sender, text })`
  - `applyParticipants(session, ctx, names: string[])`
  - `setStage(session, ctx, key, stageCode)`: source `'owner'`. It clears `unclear` and `flag` and adds the student to the roster.
  - `setIgnored(session, key, ignored: boolean)`
  - `setLone(session, key, choice: 'alone'|'join')`
  - `setMix(session, on: boolean)`: sets `mixWorkingGroups`.
  - The four setters above also set `session.outdated = true` when a plan exists and rooms aren't filled.
  - `split(session, ctx)`: sets `session.plan` and clears `outdated`. It sets each student's `alone`: `'join'` for a plan member whose stage differs from their room's, `'alone'` for the only member of a room, else `null`. It throws `Error('Rooms are already filled.')` when `session.filled` is true.
  - `markFilled(session)`: `filled = true` and `room` set for every plan member.
  - `markPlaced(session, key, roomName)`: `room = roomName`, `afterFill = true`.
  - `summarize(session, ctx) → Summary`
  - `endSession(session, ctx) → SessionRecord`

```js
Summary = {
  answers: number,                                           // non-ignored students with a stage
  stages: { stage, label, count, rooms: Room[] }[],          // stages with ≥1 student, STAGES order; rooms of that stage from the plan
  lone: { key, name, stage, choice, joinRoom: string|null }[],// stages with exactly 1 student
  unclear: { key, name, text, stage, isNew }[],              // non-ignored students with `unclear` set
  noAnswer: { key, name, lastStage, isNew }[],               // before Fill: non-ignored, no stage, no unclear text
  ignored: { key, name }[],
  splitGroups: { group: string, members: { name, stage }[] }[], // working groups whose members here have 2+ stages; [] when mixing
  notInRoom: { key, name, stage, guess, suggested: string|null }[], // after Fill: non-ignored students without a room
  flags: { key, name, text }[],
}
```

**Rules:**
- `applyMessage`:
  - Skip the message if its id is in `seen`; otherwise add the id to `seen`.
  - Skip owner senders.
  - Create the student on first sight with `isNew = !Object.hasOwn(roster.students, key)`.
  - Skip ignored students.
  - Placed after Fill (`filled && room`): a stage-only message sets `flag`, nothing more.
  - Has a stage: only a stage-only message counts. Resolvable → new stage. Not resolvable → `unclear = text`, and the stage is kept.
  - No stage: any message with stage information that resolves sets the stage. Otherwise `unclear = text`.
  - Setting a stage:
    - Source is `'guess'` when `resolveStage` says so, else `'answer'`.
    - `fromMessage = text`, `unclear = null`.
    - `addStudent` to the roster, and set `roster.students[key].track` when a track came back.
  - Resolve with the roster track and `ctx.lastStages[key]`.
- `applyParticipants`: creates a student, with no stage, for each non-owner name not yet seen.
- Plan input: non-ignored students with a stage. Each entry is `{ key, stage, track, active, group, lone }`, taken from the roster. `group` is `null` when `session.mixWorkingGroups` is set.
- `summarize`:
  - Rooms come from `session.plan`, or from a fresh `planRooms` when there is no plan yet.
  - A `lone` entry's `joinRoom` is the room holding the student when `choice` is `'join'`; otherwise it is `joinTarget` over the rooms of other stages.
  - In `notInRoom`, `stage` is `student.stage ?? lastStages[key] ?? null`. `guess` is true when the stage came from `lastStages` or the source is `'guess'`. `suggested` is `suggestRoom(...)?.name ?? null`.
- `endSession`:
  - One `RecordStudent` per non-ignored student.
  - A student with no stage takes `lastStages[key]`, with source `'guess'`; otherwise stage and source are `null`.
  - `group` is the group's name.
  - `alone` is the student's `alone`, as `split()` set it, so a stage corrected after Fill doesn't read as a Join.

- [ ] **Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSession, applyMessage, applyParticipants, setStage, setIgnored, setLone, setMix, split, markFilled,
  markPlaced, summarize, endSession } from '../src/logic/session.js';
import { emptyRoster, addStudent } from '../src/logic/roster.js';

function setup({ lastStages = {} } = {}) {
  const roster = emptyRoster(); roster.ownerNames = ['Hugo M'];
  const ctx = { roster, lastStages };
  const session = createSession({ startedAt: '2026-11-24T17:00:00Z', meetingCode: 'abc-defg-hij' });
  let n = 0;
  const say = (sender, text) => applyMessage(session, ctx, { id: `m${++n}`, sender, text });
  return { session, ctx, roster, say };
}

test('first message with stage information sets the stage', () => {
  const { session, say } = setup();
  say('Ana', 'S02 SE');
  const ana = session.students.ana;
  assert.deepEqual([ana.stage, ana.source, ana.fromMessage, ana.unclear, ana.isNew], ['S02SE', 'answer', 'S02 SE', null, true]);
});
test('the same message id is applied once', () => {
  const { session, ctx } = setup();
  applyMessage(session, ctx, { id: 'x', sender: 'Ana', text: 'stuck on my_ls' });
  applyMessage(session, ctx, { id: 'y', sender: 'Ana', text: 'S02 SE' });
  applyMessage(session, ctx, { id: 'x', sender: 'Ana', text: 'stuck on my_ls' });
  assert.equal(session.students.ana.unclear, null);
  assert.deepEqual(session.seen, ['x', 'y']);
});
test('owner messages are ignored whatever their case', () => {
  const { session, say } = setup();
  say('hugo  m', 'S02 SE');
  assert.deepEqual(session.students, {});
});
test('later chatter keeps the stage; a stage-only message replaces it', () => {
  const { session, say } = setup();
  say('Ana', 'S02 SE'); say('Ana', 'need help with S03 stuff');
  assert.equal(session.students.ana.stage, 'S02SE');
  say('Ana', 'S03 SE');
  assert.equal(session.students.ana.stage, 'S03SE');
});
test('unusable messages go to Unclear until a usable answer', () => {
  const { session, ctx, say } = setup();
  say('Sam', 'stuck on my_ls');
  assert.deepEqual(summarize(session, ctx).unclear, [{ key: 'sam', name: 'Sam', text: 'stuck on my_ls', stage: null, isNew: true }]);
  say('Sam', 'S01 arc 1');
  assert.deepEqual([session.students.sam.stage, summarize(session, ctx).unclear], ['S01A1', []]);
});
test('an unresolvable stage-only correction keeps the stage and shows as unclear', () => {
  const { session, say } = setup();
  say('Ana', 'S01 arc 1'); say('Ana', 'S02');
  assert.deepEqual([session.students.ana.stage, session.students.ana.unclear], ['S01A1', 'S02']);
});
test('answers fill the roster and record full-answer tracks', () => {
  const { session, roster, say } = setup();
  addStudent(roster, 'Ben');
  say('Ana', 'S03 ML'); say('Ben', 'S02 DS');
  assert.deepEqual([session.students.ana.isNew, session.students.ben.isNew], [true, false]);
  assert.equal(roster.students.ana.track, 'ML');
  assert.equal(roster.students.ben.track, null);
});
test('S01 from an SE student takes last session arc as a guess', () => {
  const { session, roster, say } = setup({ lastStages: { leo: 'S01A2' } });
  addStudent(roster, 'Leo'); roster.students.leo.track = 'SE';
  say('Leo', 'S01');
  assert.deepEqual([session.students.leo.stage, session.students.leo.source], ['S01A2', 'guess']);
});
test('ignored students are left out; owner can set a stage', () => {
  const { session, ctx, roster, say } = setup();
  say('Sam', 'hello'); setIgnored(session, 'sam', true); say('Sam', 'S02 SE');
  assert.equal(session.students.sam.stage, null);
  assert.deepEqual(summarize(session, ctx).ignored, [{ key: 'sam', name: 'Sam' }]);
  assert.deepEqual(summarize(session, ctx).unclear, []);
  setIgnored(session, 'sam', false); setStage(session, ctx, 'sam', 'PD');
  assert.deepEqual([session.students.sam.source, session.students.sam.unclear, Object.hasOwn(roster.students, 'sam')], ['owner', null, true]);
});
test('silent participants are listed with their last stage', () => {
  const { session, ctx } = setup({ lastStages: { mia: 'PW' } });
  applyParticipants(session, ctx, ['Hugo M', 'Mia']);
  assert.deepEqual(summarize(session, ctx).noAnswer, [{ key: 'mia', name: 'Mia', lastStage: 'PW', isNew: true }]);
});
test('Split freezes the plan; adjustments mark it outdated until Re-split; Mix ignores working groups', () => {
  const { session, ctx, roster, say } = setup();
  const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const g1 = 'g1', g2 = 'g2'; roster.groups = { g1: { name: 'One' }, g2: { name: 'Two' } };
  names.forEach((n, i) => { addStudent(roster, n); roster.students[n.toLowerCase()].group = i < 2 ? g1 : i < 4 ? g2 : null; say(n, 'S02 DS'); });
  split(session, ctx);
  assert.deepEqual(session.plan.map(r => r.members.length), [5, 5]);
  say('Zoe', 'S02 DS');   // a late answer: the plan stays, Zoe waits for Re-split or the after-Fill list
  assert.deepEqual([session.plan.map(r => r.members.length), session.outdated], [[5, 5], false]);
  setIgnored(session, 'j', true);
  assert.equal(session.outdated, true);
  setMix(session, true); split(session, ctx);
  assert.deepEqual([session.plan.map(r => r.members.length), session.outdated], [[4, 3, 3], false]);
});
test('a lone student is offered the nearest room; after Join the line names their room', () => {
  const { session, ctx, say } = setup();
  for (const n of ['A', 'B', 'C', 'D', 'E']) say(n, 'S02 SE');
  say('Leo', 'S03 SE');
  assert.deepEqual(summarize(session, ctx).lone, [{ key: 'leo', name: 'Leo', stage: 'S03SE', choice: null, joinRoom: 'S02 SE · B' }]);
  setLone(session, 'leo', 'join'); split(session, ctx);
  assert.equal(summarize(session, ctx).lone[0].joinRoom, 'S02 SE · B');
});
test('a working group split across stages is flagged', () => {
  const { session, ctx, roster, say } = setup();
  roster.groups = { g: { name: 'Pair' } };
  for (const n of ['Ana', 'Ben']) { addStudent(roster, n); roster.students[n.toLowerCase()].group = 'g'; }
  say('Ana', 'S02 SE'); say('Ben', 'S01 arc 2');
  assert.deepEqual(summarize(session, ctx).splitGroups,
    [{ group: 'Pair', members: [{ name: 'Ana', stage: 'S02SE' }, { name: 'Ben', stage: 'S01A2' }] }]);
});
test('after Fill: latecomers listed with a suggestion, placed students only flagged, Split refused', () => {
  const { session, ctx, say } = setup();
  for (const n of ['Ana', 'Ben', 'Cleo']) say(n, 'S02 SE');
  split(session, ctx); markFilled(session);
  assert.equal(session.students.ana.room, 'S02 SE · A');
  say('Zoe', 'S02 SE'); say('Ana', 'S03 SE');
  const s = summarize(session, ctx);
  assert.deepEqual(s.notInRoom, [{ key: 'zoe', name: 'Zoe', stage: 'S02SE', guess: false, suggested: 'S02 SE · A' }]);
  assert.deepEqual(s.flags, [{ key: 'ana', name: 'Ana', text: 'S03 SE' }]);
  assert.equal(session.students.ana.stage, 'S02SE');
  assert.throws(() => split(session, ctx), { message: 'Rooms are already filled.' });
  markPlaced(session, 'zoe', 'S02 SE · A');
  assert.deepEqual(summarize(session, ctx).notInRoom, []);
});
test('endSession records each student', () => {
  const { session, ctx, roster, say } = setup({ lastStages: { mia: 'PW' } });
  addStudent(roster, 'Leo'); roster.students.leo.track = 'SE'; roster.students.leo.active = true;
  applyParticipants(session, ctx, ['Mia']);
  for (const n of ['Ana', 'Ben']) say(n, 'S02 SE');
  say('Leo', 'S03 SE'); setLone(session, 'leo', 'join');
  split(session, ctx); markFilled(session);
  setStage(session, ctx, 'ana', 'S03SE');   // corrected after Fill: not a Join, plan not outdated
  assert.equal(session.outdated, false);
  const r = endSession(session, ctx);
  assert.equal(r.students.find(s => s.key === 'ana').alone, null);
  assert.deepEqual(r.students.find(s => s.key === 'leo'), { key: 'leo', name: 'Leo', stage: 'S03SE', source: 'answer',
    room: 'S02 SE · A', active: true, group: null, alone: 'join', afterFill: false });
  assert.deepEqual(r.students.find(s => s.key === 'mia'), { key: 'mia', name: 'Mia', stage: 'PW', source: 'guess',
    room: null, active: false, group: null, alone: null, afterFill: false });
});
```

- [ ] **Step 2: Run it and check that it fails.** `npm test`. Expected: FAIL, cannot find `src/logic/session.js`.
- [ ] **Step 3: Implement `src/logic/session.js`** with the exports and rules above.
- [ ] **Step 4: Run it and check that it passes.** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit.** `git add src/logic/session.js test/session.test.js && git commit -m "feat: live session state"`

---

### Task 6: Fake Meet and the Meet flow

**Files:**
- Create: `src/meet/fake-meet.js`, `src/logic/flow.js`
- Test: `test/flow.test.js`

**Interfaces:**
- Consumes: `Meet` (shared shapes); `applyMessage`, `applyParticipants`, `markFilled` (Task 5)
- Produces:
  - `createFakeMeet({ participants = [], unsupported = [] }) → Meet & { say(sender, text), join(name), leave(name), rooms: { name, members: string[] }[] }`
    - Message ids are `m1`, `m2`… An op named in `unsupported` returns `{ ok: false, op, error: 'Not supported.' }`.
    - `assignName` fails with `` `No room named ${room}.` `` or `` `${name} is not in the call.` ``.
  - `syncFromMeet(meet, session, ctx) → Promise<string[]>`
    - Awaits `readChat` and `readParticipants` first, then applies the chat, then the participants, with no `await` in between. A roster another page saves between polls is then never half-updated.
    - Returns one sentence per failed op: `` `Reading the chat failed: ${error}` `` or `` `Reading the participant list failed: ${error}` ``.
  - `fillRooms(meet, session, { createRooms: boolean }) → Promise<{ ok: true } | { ok: false, step: 'create', error: string } | { ok: false, step: 'assign', error: string, unfilled: { name, room }[] }>`
    - When `createRooms` is set, it calls `meet.createRooms(plan names)` first. On failure it returns step `'create'` with Meet's error and leaves the session unfilled.
    - Then `markFilled`, then `assignName` for each member in plan order.
    - A failed name doesn't stop the others: one student who left the call must not leave the rest untyped.
    - After 3 failures in a row it stops, since the op itself is broken, and every member not yet typed goes to `unfilled`.
    - Any failure returns step `'assign'`. `error` is the first failure as `` `Putting ${name} in ${room} failed: ${error}` ``, and `unfilled` lists every member not typed, in plan order.

- [ ] **Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeMeet } from '../src/meet/fake-meet.js';
import { syncFromMeet, fillRooms } from '../src/logic/flow.js';
import { createSession, split, summarize, endSession } from '../src/logic/session.js';
import { emptyRoster } from '../src/logic/roster.js';

function call(opts = {}) {
  const meet = createFakeMeet({ participants: ['Mentor', 'Ana', 'Ben', 'Cleo', 'Dan', 'Eva', 'Mia'], ...opts });
  const roster = emptyRoster(); roster.ownerNames = ['Mentor'];
  const ctx = { roster, lastStages: { mia: 'PW' } };
  const session = createSession({ startedAt: '2026-11-24T17:00:00Z', meetingCode: 'abc-defg-hij' });
  meet.say('Mentor', 'Write your stage please');
  for (const [n, t] of [['Ana', 'S02 SE'], ['Ben', 's2 se'], ['Cleo', 'S02 SE'], ['Dan', 'PW'], ['Eva', 'preseason web']]) meet.say(n, t);
  return { meet, ctx, session };
}

test('a whole session with the fake Meet', async () => {
  const { meet, ctx, session } = call();
  assert.deepEqual(await syncFromMeet(meet, session, ctx), []);
  assert.deepEqual(await syncFromMeet(meet, session, ctx), []);           // full list again: nothing applied twice
  assert.equal(session.seen.length, 6);
  split(session, ctx);
  assert.deepEqual(await fillRooms(meet, session, { createRooms: true }), { ok: true });
  assert.deepEqual(meet.rooms, [
    { name: 'Preseason Web · A', members: ['Dan', 'Eva'] },
    { name: 'S02 SE · A', members: ['Ana', 'Ben', 'Cleo'] },
  ]);
  meet.join('Zoe'); meet.say('Zoe', 'S02 SE');
  await syncFromMeet(meet, session, ctx);
  assert.deepEqual(summarize(session, ctx).notInRoom.map(r => [r.name, r.stage, r.guess, r.suggested]), [
    ['Mia', 'PW', true, 'Preseason Web · A'],
    ['Zoe', 'S02SE', false, 'S02 SE · A'],
  ]);
  assert.equal(endSession(session, ctx).students.length, 7);
});

test('participant list unreadable: chat still read, failure reported', async () => {
  const { meet, ctx, session } = call({ unsupported: ['readParticipants'] });
  assert.deepEqual(await syncFromMeet(meet, session, ctx), ['Reading the participant list failed: Not supported.']);
  assert.equal(session.students.ana.stage, 'S02SE');
});

test('tier 2: creating rooms fails, owner creates them, then names are filled', async () => {
  const { meet, ctx, session } = call({ unsupported: ['createRooms'] });
  await syncFromMeet(meet, session, ctx); split(session, ctx);
  assert.deepEqual(await fillRooms(meet, session, { createRooms: true }),
    { ok: false, step: 'create', error: 'Not supported.' });
  assert.equal(session.filled, false);
  meet.rooms = session.plan.map(r => ({ name: r.name, members: [] }));   // the owner creates them in Meet
  assert.deepEqual(await fillRooms(meet, session, { createRooms: false }), { ok: true });
  assert.deepEqual(meet.rooms[0], { name: 'Preseason Web · A', members: ['Dan', 'Eva'] });
});

test('tier 3: typing names fails and the plan stands', async () => {
  const { meet, ctx, session } = call({ unsupported: ['assignName'] });
  await syncFromMeet(meet, session, ctx); split(session, ctx);
  assert.deepEqual(await fillRooms(meet, session, { createRooms: true }),
    { ok: false, step: 'assign', error: 'Putting Dan in Preseason Web · A failed: Not supported.', unfilled: [
      { name: 'Dan', room: 'Preseason Web · A' }, { name: 'Eva', room: 'Preseason Web · A' },
      { name: 'Ana', room: 'S02 SE · A' }, { name: 'Ben', room: 'S02 SE · A' }, { name: 'Cleo', room: 'S02 SE · A' }] });
  assert.equal(session.filled, true);
  assert.equal(session.students.dan.room, 'Preseason Web · A');
});

test('a student who left is skipped; the rest are filled', async () => {
  const { meet, ctx, session } = call();
  await syncFromMeet(meet, session, ctx); split(session, ctx);
  meet.leave('Ben');
  assert.deepEqual(await fillRooms(meet, session, { createRooms: true }), { ok: false, step: 'assign',
    error: 'Putting Ben in S02 SE · A failed: Ben is not in the call.', unfilled: [{ name: 'Ben', room: 'S02 SE · A' }] });
  assert.deepEqual(meet.rooms[1], { name: 'S02 SE · A', members: ['Ana', 'Cleo'] });
});
```

- [ ] **Step 2: Run it and check that it fails.** `npm test`. Expected: FAIL, the modules are missing.
- [ ] **Step 3: Implement `src/meet/fake-meet.js` and `src/logic/flow.js`** with the exports above. The fake keeps all state in memory and has no Chrome or DOM code.
- [ ] **Step 4: Run it and check that it passes.** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit.** `git add src/meet/fake-meet.js src/logic/flow.js test/flow.test.js && git commit -m "feat: fake Meet and Meet flow"`

---

### Task 7: Extension shell and the collecting panel

**Files:**
- Create: `manifest.json`, `src/background.js`, `src/store.js`, `src/meet/meet.js` (stub), `src/panel/meet-client.js`, `src/panel/demo.js`, `src/panel/panel.html`, `src/panel/panel.css`, `src/panel/panel.js`, `.claude/launch.json`
- Test: `test/store.test.js`, `test/meet-client.test.js`

**Interfaces:**
- Consumes:
  - Tasks 4 to 6: `emptyRoster`, `lastKnownStages`, the session functions, `syncFromMeet`, `createFakeMeet`
  - Task 1: `STAGES`, for the stage select
- Produces:
  - `createStore({ memory = false, seed = {} }) → { load(): Promise<{ roster, history, current }>, save(changes: { roster?, history?, current? }): Promise<void>, onChange(cb: (changes) => void) }`
    - Defaults are `emptyRoster()`, `[]` and `null`. The memory store uses `structuredClone(seed)` and never touches `chrome`.
    - `onChange` fires when another extension page saves (`chrome.storage.onChanged`). It is a no-op in memory mode.
  - `meetingCodeFromUrl(url: string) → string | null`: the code from `https://meet.google.com/abc-defg-hij…`, else `null`.
  - `findMeetTab(meetingCode?: string) → Promise<{ tabId, meetingCode } | null>`
    - With a code, it looks for a tab with that code.
    - Without one, it takes the active tab of the current window when it is a Meet call.
  - `createMeetClient(tabId) → Meet`
    - It sends `{ op, args }` with `chrome.tabs.sendMessage`.
    - When there is no receiver it resolves `{ ok: false, op, error: 'Cannot reach the Meet tab. Reload the Meet tab, then try again.' }`.
    - When no answer comes within 10 seconds it resolves `{ ok: false, op, error: 'Meet did not answer in time.' }`, so a stuck op never stalls polling.
  - `DEMO = { participants: string[], answers: [sender, text][], roster: Roster, history: SessionRecord[] }`
    - The owner's name is `'Mentor'`, in `roster.ownerNames`.
    - About 14 participants.
    - Two actives at one stage, one working group of 2, and a stage with one student.
    - One unclear answer, one silent participant with a last stage in `history`, one name not on the roster, and one participant named `<b>Bold</b>`.
    - One answer with quotes and a 300-character unbroken word.
    - 3 past sessions.
  - `src/meet/meet.js` (stub)
    - A classic script. `const ops = { readChat, readParticipants, createRooms, assignName }` is defined on its own, so Task 10 can paste it into a page.
    - One `chrome.runtime.onMessage` listener, registered only when `chrome.runtime?.onMessage` exists. It dispatches `msg.op` to `ops`, answers asynchronously and returns `true`, and turns a thrown error into a `Failure`.
    - In this task every op resolves `{ ok: false, op, error: 'Meet support is not built yet.' }`.

**Manifest:**
- MV3, name "Meet mentoring groups", version `0.1.0`.
- `permissions: ["storage", "sidePanel"]`, `host_permissions: ["https://meet.google.com/*"]`.
- `background.service_worker: "src/background.js"`, `side_panel.default_path: "src/panel/panel.html"`, `action.default_title: "Mentoring groups"`.
- One content script: `src/meet/meet.js` on `https://meet.google.com/*`.
- `background.js` only calls `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`.

**Panel behavior** (this task: everything before Split):
- **Mode.**
  - `?fake` in the URL: `createStore({ memory: true, seed: { roster: DEMO.roster, history: DEMO.history } })` and `createFakeMeet({ participants: DEMO.participants })`.
  - Otherwise: the Chrome store and `createMeetClient` on `findMeetTab(session?.meetingCode)`.
  - On resume with no Meet tab found: render the session, keep End working, show "Open the Meet call in this window, then press Start.", and retry `findMeetTab(session.meetingCode)` on each poll.
- **Open.**
  - Load the store, then `ctx = { roster, lastStages: lastKnownStages(history) }`.
  - When `current` exists, resume it and start polling.
  - Otherwise show **Start**.
  - When `roster.ownerNames` is empty, show: "Your own Meet names aren't set, so your messages count as a student's. Set them on the roster page."
- **Start.**
  - Real mode needs `findMeetTab()`. Without it, show "Open the Meet call in this window, then press Start."
  - Create the session with `startedAt = new Date().toISOString()`, save it and poll.
- **Poll** 2 seconds after the previous poll finished (a `setTimeout` chain, never `setInterval`, so polls can't pile up): `syncFromMeet`, show the returned errors in an error area (cleared on the next clean poll), save `current`, re-render.
  - Save `roster` only when the poll changed it (compare `JSON.stringify` before and after), so roster-page edits aren't overwritten every 2 seconds.
  - On `store.onChange`: replace `ctx.roster`, and `history` and `ctx.lastStages`, with the saved ones, then re-render. `syncFromMeet` applies with no `await` in between (Task 6), so a swap never lands mid-update.
- **Render**, from `summarize()`:
  - A header with the answer count.
  - One line per stage: label, count, and room sizes with ★ (active) and ◆ (working-group) marks.
  - Lone lines with **Keep alone** and **Join `<joinRoom>`** buttons (`setLone`). Join is hidden when `joinRoom` is null.
  - Split-group flags.
  - **Unclear** rows: name, message, `new` badge, a stage select (`setStage`) and **Ignore**.
  - **No answer** rows: name, last stage, `new` badge, stage select and **Ignore**.
  - **Ignored** names, each with **Restore**.
  - The **Mix working groups this time** checkbox (`setMix`).
  - A **Roster** link: `chrome.tabs.create` to `src/roster-page/roster-page.html`, or `../roster-page/roster-page.html?fake` in fake mode.
  - **End**. The first press turns it into **Press again to end** for 5 seconds; no `confirm()`, which a side panel may not show. The second press runs `endSession`, reads `history` from the store, appends the record, sets `current = null`, saves and stops polling.
  - All student text goes in with `textContent`.
  - Every action saves `current` and `roster` before re-rendering.
- **Fake mode extras:** a "Fake Meet" box under the panel.
  - A text input `Name: message` with **Send**, which calls `fake.say`.
  - **Play demo answers**, which says `DEMO.answers`.
  - A **Join** input, which calls `fake.join`.
- `.claude/launch.json`: `{"version": "0.0.1", "configurations": [{"name": "panel", "runtimeExecutable": "python3", "runtimeArgs": ["-m", "http.server", "8765"], "port": 8765}]}`.

- [ ] **Step 1: Write the failing tests**

```js
// test/store.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../src/store.js';
import { emptyRoster } from '../src/logic/roster.js';

test('memory store loads defaults, keeps saves, never shares the seed', async () => {
  const seed = { roster: emptyRoster(), history: [] };
  const store = createStore({ memory: true, seed });
  assert.deepEqual(await store.load(), { roster: emptyRoster(), history: [], current: null });
  await store.save({ current: { startedAt: 'x' } });
  (await store.load()).roster.ownerNames.push('Mentor');
  assert.deepEqual((await store.load()).current, { startedAt: 'x' });
  assert.deepEqual(seed.roster.ownerNames, []);
});
```

```js
// test/meet-client.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { meetingCodeFromUrl } from '../src/panel/meet-client.js';

test('meeting code from a Meet call URL only', () => {
  assert.equal(meetingCodeFromUrl('https://meet.google.com/abc-defg-hij?authuser=1'), 'abc-defg-hij');
  assert.equal(meetingCodeFromUrl('https://meet.google.com/'), null);
  assert.equal(meetingCodeFromUrl('https://meet.google.com/landing'), null);
  assert.equal(meetingCodeFromUrl('https://example.com/abc-defg-hij'), null);
});
```

- [ ] **Step 2: Run them and check that they fail.** `npm test`. Expected: FAIL, the modules are missing.
- [ ] **Step 3: Implement `src/store.js` and `src/panel/meet-client.js`.** `chrome` is referenced only inside functions, so Node can import both.
- [ ] **Step 4: Run them and check that they pass.** `npm test`. Expected: PASS.
- [ ] **Step 5: Implement the manifest, `background.js`, the `meet.js` stub, `demo.js`, the panel files and `.claude/launch.json`** as described above.
- [ ] **Step 6: Check it in the browser pane.** Start `panel` from `.claude/launch.json` and open `http://localhost:8765/src/panel/panel.html?fake`.
  - **Start**, then **Play demo answers**. The tally shows the stages, the active and working-group marks and the lone line. Unclear shows the unclear answer, and No answer shows the silent participant with their last stage.
  - The participant `<b>Bold</b>` appears literally as `<b>Bold</b>`, not in bold. The quoted answer shows its quotes, and the 300-character word wraps without a horizontal scrollbar.
  - **Ignore**, **Restore**, a stage select, **Keep alone** and **Join** each change the tally.
  - Reload the page: the memory store resets, as expected in fake mode.
  - `node -e "JSON.parse(require('fs').readFileSync('manifest.json','utf8'))"` exits 0.
- [ ] **Step 7: Commit.** `git add manifest.json src/background.js src/store.js src/meet/meet.js src/panel .claude/launch.json test/store.test.js test/meet-client.test.js && git commit -m "feat: extension shell and collecting panel"`

The reopen check (Review Focus 5) needs Chrome's real store. It runs in Task 10's trial.

---

### Task 8: Split, Fill and after-Fill in the panel

**Wave:** B

**Failing-test check:** exempt: DOM wiring of logic already tested in Tasks 5 and 6; checked in the browser pane.

**Files:**
- Modify: `src/panel/panel.js`, `src/panel/panel.html`, `src/panel/panel.css`

**Interfaces:**
- Consumes:
  - `split`, `setStage`, `setIgnored`, `setLone`, `setMix`, `markPlaced`, `summarize` (Task 5)
  - `fillRooms` (Task 6)
  - `stage()` (Task 1)

**Behavior:**
- **Split.** It calls `split()` and switches to the preview.
  - Each room is listed with its name and members.
  - Each member row shows:
    - the name, with `title` set to `fromMessage`;
    - ★, which toggles `roster.students[key].active` and saves;
    - ◆ with the group's name;
    - a `new` badge, and `?` when the source is `'guess'`;
    - a stage select and **Ignore**.
  - **Re-split** calls `split()` again. Stage changes, Ignore, lone choices and Mix change the rooms only through it, as in the spec.
  - While `session.outdated` is true, a banner says "Changed since Split. Press Re-split before Fill." and Fill is disabled, so an ignored student is never typed into a room.
- **Fill breakout rooms.** It calls `fillRooms(meet, session, { createRooms: !ownerCreatesRooms })`. Polling pauses while it runs.
  - `ok`: "Rooms filled. Check Meet's breakout panel, then press Open rooms there."
  - Step `'create'`:
    - Show the error and "Create these rooms in Meet, with these names: …", listing every plan room name in order.
    - Set `ownerCreatesRooms = true`, held in memory, and relabel the button **Fill names**.
  - Step `'assign'`: show the error and "Type these names by hand:", listing each `unfilled` name with its room.
  - Every failure keeps the room list on screen.
- **After Fill** (`session.filled`):
  - Re-split is disabled, with "Change rooms in Meet directly."
  - The room list shows every room and its members, in plan order.
  - **Not in a room yet** rows: name, stage (`?` when it is a guess), suggested room, a stage select, and **Placed** (`markPlaced` with the suggested room, disabled when there is none).
  - **Flags** rows: "`<name>` wrote `<text>` after Fill. Move them in Meet if needed." with a stage select, which calls `setStage` and clears the flag.
  - In fake mode, the Fake Meet box also shows `fake.rooms` as plain text.

- [ ] **Step 1: Implement the behavior above** in the panel files.
- [ ] **Step 2: Check it in the browser pane** on `?fake`.
  - Play demo answers, then **Split**. The preview matches the tally, and `<b>Bold</b>` shows literally.
  - Send `Name: S02 SE` for a new name, then **Re-split**: the new student is in a room.
  - **Ignore** a student in the preview: the banner appears and Fill is disabled. **Re-split**: they are gone from the rooms and Fill is enabled.
  - **Fill breakout rooms**. The Fake Meet box lists the rooms and names in plan order.
  - **Join** a latecomer and send their answer. They appear under "Not in a room yet" with a suggestion; **Placed** removes them.
  - Send a stage-only message for a placed student. A flag appears.
- [ ] **Step 3: Check the failure paths.**
  - Temporarily set `unsupported: ['createRooms']` in fake mode. Fill shows the rooms to create and **Fill names**.
  - Then set `['assignName']`. Fill shows the error, the names to type by hand and the room list.
  - Revert both, then `git diff` to confirm.
- [ ] **Step 4: Run the tests.** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit.** `git add src/panel && git commit -m "feat: split preview, fill and after-fill in the panel"`

---

### Task 9: Roster page

**Wave:** B

**Failing-test check:** exempt: DOM wiring of logic already tested in Task 4; checked in the browser pane.

**Files:**
- Create: `src/roster-page/roster-page.html`, `src/roster-page/roster-page.css`, `src/roster-page/roster-page.js`

**Interfaces:**
- Consumes:
  - `createStore` and `DEMO` (Task 7)
  - `createGroup`, `deleteGroup`, `addStudent` (Task 4)
  - `timeline`, `historyToCsv`, `exportBackup`, `parseBackup` (Task 4)
  - `TRACKS`, `trackLabel`, `stage()` (Task 1)

**Behavior:**
- `?fake` uses the memory store seeded with `DEMO.roster` and `DEMO.history`.
- **Students table.** One row per roster student, sorted by name. Columns:
  - display name;
  - a track select (–, SE, DS, AI/ML);
  - an active ★ toggle;
  - a working-group select (none plus each group);
  - the timeline: the stage code of each session, oldest first. Each code has a `title` with the date; guesses are in italics.
- **Working groups.**
  - Each group has a name input (renames on change), its member names and **Delete** (`deleteGroup`, after a confirm).
  - A name input with **New group** (`createGroup`).
- **Your Meet names.** A textarea, one name per line, saved to `roster.ownerNames` on change, ignoring blank lines.
- **Backup.**
  - **Export backup** downloads `mentoring-backup-YYYY-MM-DD.json`. **Export CSV** downloads `mentoring-history-YYYY-MM-DD.csv`. Both use a Blob, an object URL and an `<a download>`.
  - **Import backup** uses a file input. It runs `parseBackup`; on error it shows the message and changes nothing. Otherwise it asks "Replace the roster and history with this file?" and saves `roster` and `history`.
- Every change saves `roster` and re-renders.
- On `store.onChange`, the page replaces its roster and history with the saved ones, then re-renders. A stale copy must never be saved over the panel's changes.
- All names go in with `textContent`.

- [ ] **Step 1: Implement the roster page** by the behavior above.
- [ ] **Step 2: Check it in the browser pane.** Open `http://localhost:8765/src/roster-page/roster-page.html?fake`.
  - The demo students show with timelines of 3 sessions.
  - Toggle ★, change a track, and create, rename and delete a group: the rows update.
  - Export CSV and Export backup produce files with the expected names; check the CSV header line.
  - Import a `.txt` file holding `nope`: the page shows "This file is not a mentoring-groups backup." and the data is unchanged.
- [ ] **Step 3: Run the tests.** `npm test`. Expected: PASS.
- [ ] **Step 4: Commit.** `git add src/roster-page && git commit -m "feat: roster page with groups, timeline, backup and CSV"`

---

# Phase 2: with Meet, owner at the computer

**Checkpoint:** nothing in Task 10 starts until the owner says they are at the computer and ready. The session running implementation runs Task 10 itself with the owner, not through an implementer subagent, because every step needs the live call. Then the usual task review follows.

### Task 10: Meet checks and the real Meet file

**Failing-test check:** exempt: written against the live Meet page, verified by the spec's four Meet checks and the owner's trial.

**Files:**
- Modify: `src/meet/meet.js`
- Create: `docs/meet-checks.md`

**Interfaces:**
- Consumes: the message protocol of Task 7's stub, and the `Meet` and `Failure` shapes.
- Produces: the real ops.
  - `readChat` returns ids that stay stable across calls, from Meet's own message ids when the page has them. A fallback id is built from sender, text and Meet's timestamp, never from list position, so a trimmed or re-rendered chat can't replay an old message. It merges Meet's duplicate renderings into one and leaves out the signed-in account's own messages.
  - Each op resolves a `Failure` within 10 seconds rather than waiting forever for an element.
  - Participant names are display names as others see them, without suffixes such as "(You)".
  - An op that can't be made to work keeps returning a `Failure` whose `error` tells the owner what to do by hand.

- [ ] **Step 1: Set up the test call.**
  - Ask the owner to open `https://meet.google.com` in the Claude app's browser pane, sign in themselves, and start a call as host.
  - The owner joins the same call from their second account in another browser, and turns on breakout rooms in the host controls.
  - The builder never types the owner's credentials.
  - If Google refuses sign-in in the browser pane, ask the owner whether to use Claude in Chrome, on their own signed-in Chrome, instead.
  - While the call is live, save `read_page` snapshots of the chat, participant and breakout panels to the session's scratchpad. They hold the owner's account names, so never commit them. The rest of the writing can then go on without the owner.
  - Time-box: if the four checks aren't done in about an hour, stop with the snapshots saved and agree a second slot with the owner.
- [ ] **Step 2: Check 1, read chat, with the chat panel open and then closed.** The second account sends `S02 SE`, `hello <b>x</b>` and `S03 ML`; the host sends `Write your stage please`.
  - Find the message elements and senders with `read_page`/`find`, preferring accessible roles and labels over class names.
  - Write `readChat` in `meet.js`, then run the `ops` code in the page with `javascript_tool`. Expected: the second account's three messages, in order, each once, with the same ids on a second run. The host's own message, which Meet labels as "You", is left out.
  - Note whether it works with the panel closed.
  - **If the chat cannot be read at all, stop and tell the owner: per the spec, approach A replaces this one.**
- [ ] **Step 3: Check 2, read the participant list.** Write `readParticipants` and run it. Expected: both display names, without "(You)".
- [ ] **Step 4: Check 3, create and rename breakout rooms.** Write `createRooms(['S02 SE · A', 'S03 ML · A'])` and run it. Expected: Meet's breakout panel shows exactly those two rooms, rooms not opened.
- [ ] **Step 5: Check 4, type a name into a room.** Write `assignName('S02 SE · A', <second account's name>)` and run it. Expected: that person is listed in that room in Meet's panel.
- [ ] **Step 6: Record the tier and finish `meet.js`.**
  - Tier 1 when checks 3 and 4 pass. Tier 2 when only 4 passes. Tier 3 when neither does.
  - Ops that failed keep a `Failure`. Its `error` names the manual step, for example "Creating rooms is not supported on this Meet page. Create them by hand." The panel's tier 2 and 3 paths already handle it.
  - If the chat only reads with its panel open, `readChat`'s failure says "Open Meet's chat panel to read answers."
  - Write `docs/meet-checks.md`: date, result of each check, the tier, how each op finds its elements, and how chat ids are built. This is the maintenance note for when Meet changes.
- [ ] **Step 7: Owner trial in their own Chrome.**
  - The owner loads the folder unpacked (`chrome://extensions` → Developer mode → Load unpacked), reloads the Meet tab, opens the side panel from the toolbar button and sets their Meet names on the roster page.
  - Then a full run with the second account answering:
    - Start; answers appear.
    - Close and reopen the side panel: the session resumes (Review Focus 5).
    - Split, Fill, check Meet's panel. The owner presses Open rooms only if they want to.
    - Close and reopen the side panel again: the room list and the "Not in a room yet" list are back.
    - End; the roster page shows the session in the timeline, and Export CSV holds its rows.
  - The owner confirms or lists what is wrong; fixes loop within this task.
- [ ] **Step 8: Run the tests.** `npm test`. Expected: PASS. The logic is unchanged by this task.
- [ ] **Step 9: Commit.** `git add src/meet/meet.js docs/meet-checks.md && git commit -m "feat: Meet page operations (tier N)"`, with N set to the tier found.
