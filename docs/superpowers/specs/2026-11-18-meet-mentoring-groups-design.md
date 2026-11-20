# Meet mentoring groups: design

Date: 2026-11-18
Status: draft for the owner's approval

## Why

The owner mentors about 40 Amsterdam Tech students (Qwasar curriculum) in
1-hour sessions on Google Meet. Each session they split the students into
breakout rooms of people at the same stage, so each group can actually work
together, and they cycle through the rooms to help.

Today the split is manual and takes 5 to 10 minutes of the hour:

- The owner joins with two Google accounts: one shows the chat, the other runs
  the breakout rooms. Once rooms are assigned, the second account logs out.
- Empty rooms are prepared beforehand; over time the owner has learned roughly
  how many rooms each stage needs.
- Students write their current stage in the chat; the owner reads each answer
  on one account and assigns that student on the other.
- The owner mixes active and passive students, keeps students who regularly
  work together in the same room, and asks a student left alone whether they
  would rather work by themselves or join another room.
- Students who don't answer, and latecomers, wait: after rooms are open the
  owner checks their status on Qwasar and assigns them by hand, spotting them
  as unassigned in Meet's breakout panel.

The goal is to make the split near-instant, with the same judgement the owner
applies by hand, while staying on Meet.

## Goals

- From the moment the owner says "split", rooms are filled in a minute or two,
  without the owner reading the chat or typing names.
- Rooms follow the owner's rules: same stage, working groups together, active
  students in pairs, a free seat for latecomers.
- Meet's native breakout features stay: "Ask for help", the room timer,
  broadcast to all rooms, bringing everyone back.
- Students do nothing new: they keep writing their stage in the chat.
- The owner keeps a roster (track, active, working groups) and a history of
  each student's stage, session by session.
- The owner can maintain it when Meet changes.
- One Meet tab and account during the session.

## Non-goals

- Anything installed or done by students beyond writing in the chat.
- Publishing on the Chrome Web Store.
- The extension acting in Meet after rooms are filled: latecomers and silent
  students stay the owner's to assign, with suggestions.
- Remembering who was with whom, beyond the working groups the owner sets.
- A "keep apart" list.
- Merging two display names into one student (possible later addition).
- Reading progress from Qwasar in this version: it is the agreed next version
  (see "Next version: Qwasar snapshot").
- Syncing to Google Sheets or the standup notes; export to a file is enough.
- Building an "Ask for help" feature: Meet's own stays.
- Several mentors sharing data.

## Anti-goals (it fails even if it works)

- Students sent to the wrong rooms without the owner seeing it first.
- A split that takes longer than doing it by hand.
- Breaking silently when Meet changes its page. It must say what failed and
  fall back to showing the room list.

## Constraints

- **Meet is a must.** No other platform.
- Meet has **no API for breakout rooms**; only the host can create rooms and
  place people, through Meet's own panel. Participants cannot pick a room.
- Meet allows at most **25 co-hosts**, so making students co-hosts cannot cover
  40 students.
- **Meet add-ons** (the "activities" such as Miro) get no access to the chat,
  the participant list or breakout rooms.
- The owner's Meet edition has breakout rooms (they use them today).
- Meet's page structure changes often and without notice. Extensions that read
  Meet's chat exist and work by watching the chat area, but their authors
  report an unstable page and duplicate messages.
- No existing extension was found that fills Meet's **native** breakout panel.
  That part is unproven (see "Meet test").
- Students join with their Amsterdam Tech Google account, so display names are
  stable; occasionally one joins from a personal account by mistake.

## Approaches considered

| | Approach | Trade-off | Outcome |
|---|---|---|---|
| A | Room board + one permanent Meet link per room: students pick name and stage on a page, it groups them and shows each their link | Self-service, automatic and immune to Meet changes, but leaves breakout rooms (loses Ask for help, timer, broadcast, "everyone back") and needs a hosted page | Owner leaned here first; fallback if F proves impossible |
| B | Shared sign-up sheet with a column per room and its Meet link | Nothing to build, but students choose group sizes | Not chosen |
| C | Tool computes groups, owner types them into Meet | Saves the thinking, not the typing | Not chosen |
| D | Stable groups pre-assigned in the recurring Calendar event | Keeps native rooms and needs no session time, but cannot be automated, absences thin the rooms, students must join with the invited email | Not chosen |
| **F** | **Own Chrome extension: reads stage answers from the chat and fills Meet's breakout panel** | **Keeps native rooms and the current chat habit; fragile when Meet changes, which the owner accepts maintaining** | **Chosen** |
| G | Another platform (Zoom self-select rooms, Discord) | Self-service built in, but Meet is a must | Ruled out |

A Meet add-on was dropped: it cannot read the chat or touch breakout rooms, it
would need Marketplace publishing and an install by every student, and the
extension would still be needed to fill rooms.

A separate web app or a Google Sheet for the roster was dropped: one user's
small data needs no server, sign-in or network calls; a full-page roster inside
the extension gives the room to edit it.

## Stages

Grouping is by **stage**: track plus season. Tracks are SE, DS and AI/ML.

| Stage | Code | SE | DS | AI/ML |
|---|---|---|---|---|
| Preseason Web | PW | ✓ | | |
| Preseason Data | PD | | ✓ | ✓ |
| S01 Arc01 | S01A1 | ✓ | ✓ | ✓ |
| S01 Arc02 | S01A2 | ✓ | | |
| S02 SE | S02SE | ✓ | | |
| S02 DS | S02DS | | ✓ | ✓ |
| S03 SE | S03SE | ✓ | | |
| S03 DS | S03DS | | ✓ | |
| S03 ML | S03ML | | | ✓ |

Each track's path, in order:

- SE: PW → S01A1 → S01A2 → S02SE → S03SE
- DS: PD → S01A1 → S02DS → S03DS
- AI/ML: PD → S01A1 → S02DS → S03ML

Students from different tracks share a room when they share a stage (S01A1,
PD, S02DS). The stage list lives in one place in the code so it can be changed
if the curriculum does.

## How it works

Only the owner installs the extension. It has two screens: a **side panel** for
the live session and a **roster page** in a full tab.

### A session, step by step

1. **Start.** The owner, as host of the Meet call, opens the side panel and
   starts a session. The extension reads the messages already in the chat and
   every new one.
2. **Students answer** their stage in the chat, as today. The panel shows a
   live tally by stage:

   ```
   Mentoring groups                 31 answers
   S01 Arc01   9  → 3 rooms (3, 3, 3)
   S02 DS      7  → 2 rooms (4 ★★, 3 ◆)
   S03 SE      1  → Leo is alone   [Keep alone] [Join S02 SE · A]
   Unclear: Sam: "stuck on my_ls"     [stage ▾] [ignore]
   New name: "Galaxy S21"             [stage ▾] [ignore]
   No answer (4): Mia (last: PW), …   left out until after Fill
   [ ] Mix working groups this time
                         [Split]
   ```

   ★ active student, ◆ working group.
3. **Split.** When most have answered, the owner presses **Split**. The
   extension computes rooms with the grouping rules below and shows a preview:
   each room with its students, marked active, working group or new.
4. **Adjust if needed.** The owner can change any student's stage, ignore a
   student, or tick "Mix working groups", then **Re-split**.
5. **Fill.** The owner presses **Fill breakout rooms**. The extension creates
   the rooms in Meet's panel, names them, and enters each student's name. How
   much of this it can do depends on the Meet test (tiers below).
6. **Open.** The owner checks Meet's panel and presses Meet's own **Open
   rooms**. The extension never opens rooms itself.
7. **After Fill**, the panel lists everyone **not in a room yet** (latecomers
   who answered, and students who didn't answer), each with a stage (their
   answer, or their last known stage marked as a guess) and a **suggested
   room**. The owner assigns them by hand in Meet, as today.
8. **End.** The owner ends the session in the panel; the session is saved to
   history.

### Reading answers

The extension looks in a message for stage information: a preseason word
("pre", "preseason", with "web" or "data"), a season number ("S1", "S01",
"season 1", "1"), an arc ("arc 2", "A2") and a track word ("SE", "DS", "ML",
"AI").

- A student's stage comes from **their first message that contains stage
  information**. A later message that is **only a stage** ("S02", "S02 DS",
  "PW") replaces it, so students can correct themselves; other later messages
  are ignored, so "need help with task 3" never changes a stage.
- **The student's known track fills the gaps**: "S02" from a DS student is
  S02DS; "preseason" from an SE student is PW. A full answer such as "S03 ML"
  or "S02 SE" also records the student's track on the roster.
- **S01 without an arc**: S01A1 for DS and AI/ML students. For SE students,
  the S01 arc of their last session if they had one, else S01A1, marked as a
  guess. *(my call)*
- **Not enough to decide** (no stage information, a season without a known
  track, a stage that doesn't exist on the student's track): the message goes
  to **Unclear**, where the owner sets the stage or ignores it. It leaves
  Unclear once that student gives a usable answer.
- The panel shows, for each student, the message their stage came from, and
  the owner can change any stage by hand.
- Students are identified by their **Meet display name**. A name not on the
  roster is flagged **new**.
- Messages from the owner's accounts (their display names, set once) are
  ignored, and those accounts are never treated as students.

### Students who don't answer

People in the call (read from Meet's participant list) who gave no stage by
Split are **left out of the split**, as today. They appear under "No answer"
with their last known stage, and after Fill under "not in a room yet" with a
suggested room. *(owner's call: today they are checked and placed after the
rooms open)*

### Grouping rules

Rules apply per stage, in this order of priority:

1. **Stage.** Students never share a room across stages, except a student
   alone who chooses to join another stage (below).
2. **Working groups stay together.** Students the owner has linked as a
   working group (2 or more students who regularly work together) and who are
   at this stage form one unit that is never split. Members at other stages
   are not pulled in: **stage wins**, and the panel flags the split group.
   The "Mix working groups this time" switch ignores working groups for that
   session.
3. **Room sizes.** At most 4 per room, keeping a seat for a latecomer. Rooms of
   2 are allowed. Rooms may grow to 5 to keep anchors (below) together. A
   working group is never split, even if its room goes over.
4. **One anchor per room.** An anchor is a working group or, failing that, two
   active students together. Each room gets one anchor where possible, so the
   strong students lead and inspire a different room each. Active students go
   in pairs, never alone: when there are fewer anchors than rooms, some rooms
   get none (all passive), and the owner knows to visit those first.
5. **Even sizes** for everything else.

How many rooms, for a stage with `n` students:

- `k_size = ceil(n / 4)`.
- `anchors` = working-group units + floor(active students outside those units
  / 2).
- If `anchors ≥ 1` and `anchors < k_size`: `k = max(ceil(n / 5),
  anchors)`. Otherwise `k = k_size`.
- Place anchors one per room (working groups first), then remaining active
  students, then everyone else to even sizes. Extra anchors (more anchors than
  rooms) go to the smallest rooms.

Expected results, to use as tests:

| Students at the stage | Rooms |
|---|---|
| 3, nobody active | 3 |
| 4, nobody active | 4 |
| 5, nobody active | 3, 2 |
| 6, nobody active | 3, 3 |
| 7, nobody active | 4, 3 |
| 9, nobody active | 3, 3, 3 |
| 10, nobody active | 4, 3, 3 |
| 11, nobody active | 4, 4, 3 |
| 5, 2 active | 5 (2 active + 3) |
| 8, 2 active | 4 (2 active + 2), 4 (none active) |
| 8, 4 active | 4 (2 active + 2), 4 (2 active + 2) |
| 10, two working groups of 2 | 5 (group + 3), 5 (group + 3) |
| 7, one working group of 2, 2 active | 4 and 3, each with one anchor |

Small stages:

- **2 students:** a room of 2.
- **1 student:** flagged. The owner asks them, as today, and clicks **Keep
  alone** (their own room) or **Join**. Join puts them in the smallest room of
  the nearest **lower stage on their track's path** that has rooms; if there is
  none, the nearest higher one. *(owner's call: ask the student)*

Within these rules, any split is fine; there is no memory of past rooms.

### Suggested rooms after Fill

For a student not in a room yet: the room holding a member of their working
group at their stage, if any; otherwise the smallest room of their stage;
otherwise they are a student alone, and the suggestion follows the Join rule.
Season beats size: a suggestion may take a room to 5 or 6. *(my call)*

### After filling

- Re-split is disabled; the panel says to change rooms in Meet directly.
- The extension does nothing more in Meet. It never adds, removes or moves
  people after Fill.
- A stage-only message from a student who is already placed shows as a flag.
  The owner moves them in Meet if needed and can update their stage in the
  panel so history is right.
- Changes made directly in Meet are not tracked; history records the
  extension's assignment plus any stage the owner corrects in the panel.

### Room names

`<stage label> · <letter>`: `S02 DS · A`, `S01 Arc01 · B`, `Preseason Web · A`.
A student kept alone gets their own letter in their stage. A student who joins
another stage's room stays under that room's name.

### Roster page

A full browser tab, one row per student:

- display name, track, **active** star, **working group**, and their **stage
  timeline** (stage per session, to spot someone stuck on the same stage for
  weeks);
- create and edit working groups (named lists of students);
- set the owner's own display names (ignored as students).

The roster fills mostly by itself: names and tracks come from answers; the
owner taps stars and sets working groups. Stars can also be toggled from the
side panel during a session.

### History and storage

- Roster and history are kept in the owner's Chrome (`chrome.storage.local`),
  on that computer only.
- Each session records: date and time, Meet meeting code, and per student:
  display name, stage, where the stage came from (answer, guess, set by owner),
  room name, active and working group at the time, whether they were alone and
  what they chose, whether they were placed after Fill.
- Saved as the session goes, not only at the end.
- **Backup export and import** of roster and history as one file, to restore
  or move to another computer. **CSV export** of history, one row per student
  per session, for spreadsheets.

### Meet test (before building the Meet-specific part)

Checks on the real page, in a test call with the owner's two accounts:

1. Read chat messages, with the chat panel open **and** closed.
2. Read the participant list.
3. Create breakout rooms and rename them.
4. Type a name into a room.

The result picks the tier to build:

| Tier | What works | What the owner does |
|---|---|---|
| 1 | Everything | Presses Open rooms |
| 2 | Filling names, not creating rooms | Creates the rooms the panel lists (count and names), then presses Fill |
| 3 | Neither | Types names from the panel's room list |

- If the chat can only be read while the chat panel is open, the owner keeps it
  open while collecting and switches to the breakout panel to fill.
- If the participant list can't be read, "No answer" only lists roster students
  seen in the chat this session; the rest of the flow is unchanged.
- If the chat cannot be read at all, F loses its point: go back to approach A.

### How the Meet-specific file gets written *(my call)*

Whoever builds this cannot open a live Meet call with breakout rooms on their
own, so the work runs in two phases:

1. **Without Meet:** stages, answer reading, grouping, roster, history, export
   and both screens, driven by a **fake Meet** stand-in with the same
   operations as the real Meet file, so the whole flow can be tried and tested.
2. **With Meet, owner at the computer:** the owner signs in to Meet in the
   Claude app's browser pane and starts a test call, joining from their second
   account. The builder reads the live page, runs the Meet test, picks the tier
   and writes the real Meet file against the page itself.

Phase 2 is a checkpoint in the plan: nothing in it starts until the owner is
available.

### How it is built *(proposed and accepted)*

- A Chrome extension, Manifest V3, plain JavaScript (ES modules), no build
  step, no dependencies.
- Loaded unpacked from a folder; updated by the owner. Not on the Web Store.
- The live interface is **Chrome's side panel**, not injected into Meet's
  page; the roster is an extension page in a full tab.
- **Everything that depends on Meet's page lives in one file.** It exposes four
  operations: read chat, read participants, create and rename rooms, assign a
  name. Nothing else. When Meet changes, only this file is fixed. When an
  operation fails, it reports which one, and the panel says so and falls back
  to showing the room list.
- Stages, answer reading, grouping and history logic are plain modules with no
  Chrome or Meet code, tested automatically with Node's built-in test runner.
- Permissions: storage, side panel, and access to `meet.google.com` only. No
  network calls; data never leaves the owner's Chrome.

## Next version: Qwasar snapshot *(agreed, not built in this version)*

A separate project, Qwasar snapshot (`~/Work/ATech/qwasar-snapshot`, design
`docs/superpowers/specs/2026-11-19-qwasar-snapshot-design.md` there), reads
the followed students' progress from Qwasar every Thursday morning and saves an
encrypted snapshot to a private GitHub repository. What the extension does with
it was settled in that design (owner's calls):

- **Settings,** entered once on the roster page: the repository, a read-only
  GitHub token, the encryption key.
- **Fetching:** when the side panel opens and the stored snapshot is older than
  the latest Thursday run, the extension downloads the latest one, decrypts it
  (AES-256-GCM, Web Crypto) and keeps it locally. If GitHub can't be reached,
  it uses the last one and shows its date. This is the extension's one network
  destination, read-only.
- **Matching:** each roster student gets their Qwasar login, matched once: the
  extension suggests a match by name and the owner confirms. A student in the
  call with no login is flagged, so the owner adds them to the follow list.
- **Use:** students stop typing their stage. The stage comes, in order, from: a
  chat answer this session (it corrects), this Thursday's snapshot (Qwasar's
  current track mapped to the stage codes), the last known stage (a guess),
  Unclear. Everyone in the call with a known stage is included in the split,
  so Meet's participant list becomes essential.
- **No fresh snapshot** (the run failed or hasn't happened): the panel says so
  and students type their stage, as in this version.

This waits for that project to document its snapshot format (file layout,
how the latest file is found, Qwasar's track names), which is settled while it
is built. This version is the base and stays the fallback.

## Left to the builder

- Panel and roster page layout and look, beyond the sketch above.
- File layout, apart from the single Meet-specific file and the single stage
  list.
- How the Meet file finds elements (prefer accessible labels and roles over
  generated class names) and how it removes duplicate messages.
- Exact answer patterns accepted, within the rules above.
- How display names are normalised for matching (case, spacing).
- Placement details the rules and test table don't fix (which passive goes
  where).
- Backup file format, CSV column order, the look of the stage timeline.
- How the session start and end are triggered in the panel.
