# UI backlog fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix items 1 to 9 of `docs/ui-backlog.md` on the roster page and the side panel, and mark every backlog item fixed or ruled.

**Architecture:** Nine small edits inside the existing pages and components: the roster page's Timeline, selects and Backup row (`RosterPage.tsx`); the panel's clamped message, names, two strings and Mix checkbox (`ClampedText.tsx`, `StageSelect.tsx`, `Panel.tsx`); the field text size (`ui/input.tsx`, `ui/textarea.tsx`). No new component, no logic change, no new dependency.

**Tech Stack:** React in `.tsx`, Tailwind CSS v4, shadcn components, `lucide-react` icons, Storybook. Node 22's test runner covers `src/logic/`, which this plan does not change.

**Spec:** `docs/superpowers/specs/2026-11-22-ui-backlog-fixes-design.md`. Executors read it with their task; the item numbers below are its table's.

## Global Constraints

- Only items 1 to 9 change a screen. "Non-goals: anything not in the backlog, and changes to how the screens work".
- "Anti-goal: a fix that breaks the one-row grid, the dark-only tokens or the conventions in `CLAUDE.md`." The project's `## Code conventions` apply to every task.
- Components: "all existing (`Badge` outline, `Button` outline, `ClampedText`, `StageSelect`, `Checkbox`, `Input`, `Textarea`); `ClampedText`, `ui/input.tsx` and `ui/textarea.tsx` are adapted. Their stories stay valid." No new component, no new dependency, no shadcn CLI.
- Exact strings: `Stage…` (one `…` character), `Last: <stage label>`, `–` (an en dash) for "no value", `Import backup`, `no sessions yet`, `no stage`.
- "the specs' strings in item 7 change only in code, and the older specs are not edited."
- At 375, 768 and 1440 px: "Timeline pills wrap inside the cell; at 375 the Backup row's three buttons sit on one line." Nothing scrolls sideways.
- Colours and sizes come from the tokens and Tailwind's scale: no hex, no arbitrary value on `text-`, `bg-`, `rounded-`, `shadow-`, `font-`, `leading-` or `tracking-`. 14 px is `size-3.5`; 4 px is `gap-1`.
- `src/logic/`, `src/panel/controller.js`, `src/panel/demo.js` and `src/panel/fake-states.js` are not edited: the approved mockups were drawn on today's demo data.
- The project has no component test runner and none is added. `.tsx` changes are checked by `npm run typecheck`, the two builds, the kit's checks and the hand check below.

## Review Focus

1. **A past session with a guessed stage, or with no stage.** Every student who did not answer is saved that way, and the demo history holds neither. The guessed pill is italic and muted, the pill with no stage holds a muted `–` with the `sr-only` label `no stage`, and both keep the date tooltip. Pinned in Task 1: the `LongTimeline` story.
2. **A term of weekly sessions for one student.** The pills wrap inside the Timeline cell: the row grows taller and the table no wider. The Name column does not shrink: names stay on one line as on today's demo. Pinned in Task 1: the `LongTimeline` story (14 sessions), and the hand check at 375 px.
3. **Import backup with the native field gone.** The button opens the file picker by mouse and by keyboard; a file that is not a backup shows the error alert; picking the same file again runs the import again; cancelling the picker changes nothing. Pinned in Task 1: the `ImportError` story, the unchanged `onChange` handler, and the hand check.
4. **An Unclear message that is one unbroken 300-character word, in a 375 px panel, and a message that only just fits two lines.** The chevron stays inside the row with no sideways scroll; a message that fits is plain text with no chevron; a message that fits the full width but not the width beside the chevron settles on one form and does not flicker. Pinned in Task 2: the rule on where `ref` sits, the `Short` and `Long` stories, and Sam's message on the three fake states, which the screens check captures at 375 px and fails on sideways scroll.
5. **The Mix checkbox in every state.** One is drawn at a time (the `id` `mix` stays unique): above Split before there is a plan, above Re-split after; disabled while filling and after Fill; ticking it after Split shows "Changed since Split. Press Re-split before Fill." Pinned in Task 2: the `Collecting`, `Split`, `ChangedSinceSplit`, `Filling` and `Filled` stories, and the hand check.

---

## For the session running implementation

- **Ignored folder.** `node_modules`: pass `--link node_modules` to `wave.py start`.
- **Wave A** is Tasks 1 to 3. They share no file. Only Task 3 edits `CLAUDE.md`; Tasks 1 and 2 give their convention in their report's `Conventions:` line, to fold in after the merge.
- **Automated checks,** after the wave is merged: `npm test` (131 tests pass, as before), `npm run typecheck`, `npm run build` then `npm run check:extension`, and `npm run build-storybook`.
- **Failing-test check.** No task runs it: each carries an exemption in its header.
- **The hand check,** after the wave's checks pass, with the dev server started for the kit's checks. Write the result in the ledger.
  - **Import,** on `/src/roster-page/roster-page.html?fake`: Import backup opens the file picker on a click, and on Enter with the button focused. A text file holding `nope` shows "This file is not a Murmuration backup."; picked a second time, it shows it again. A file from Export backup asks "Replace the roster and history with this file?" and leaves the same roster. If the browser cannot pick a file, use a throwaway Playwright script that is not committed (`page.waitForEvent('filechooser')` around the click).
  - **Clamp,** on `/src/panel/panel.html?fake&at=collecting` at 375 px: Sam's message is two lines with a chevron at the end of the second; a click anywhere on it opens it (the chevron points up), another closes it; nothing flickers while the width is dragged from 320 to 480 px.
  - **Mix,** from the same page: the checkbox is above Split. After Split it is inside Rooms above Re-split and nowhere else; ticking it shows the "Changed since Split." alert; after Re-split and Fill it is disabled.
  - **Stories,** in Storybook (`npm run storybook`), since nothing runs a story's `play` and the build only compiles it. The `ImportError` story of `RosterPage`: the alert "This file is not a Murmuration backup." appears on its own. Its `LongTimeline` story at 375 and 1440 px: Review Focus lines 1 and 2.

## The UI kit in this run

- **Kit tasks:** 1, 2 and 3, each marked `**Kit:** ui [react-tailwind-shadcn]` with its `**Screens:**`. Line for the owner: `Kits: ui [react-tailwind-shadcn] on tasks 1, 2 and 3`.
- **Briefs** name, as files to read in full first, the kit's `guidance.md` and the stack's `stack.md` (the paths `kit.py show ui --stack react-tailwind-shadcn` prints). No task builds motion: the chevron swaps with no animation.
- **Approved mockups:** `~/.claude/workflow-archive/2026-11-22-claude-ui-backlog-fixes-88fad3-kit/approved/` (collecting, split, filled and roster, at 375 and 1440 px). They are the kit reviewer's reference, and the briefs of Tasks 1 and 2 name the folder. Where a step's spacing or alignment classes and the mockup of that screen disagree, the mockup wins and the report says so.
- **`mockup.diff`** in that folder is the throwaway diff that drew the mockups. It is never applied. An implementer may read it for spacing classes only; structure, names and everything else come from this plan.

---

### Task 1: The roster page (items 1 to 4)

**Wave:** A
**Kit:** ui [react-tailwind-shadcn]
**Screens:** /src/roster-page/roster-page.html?fake
**Failing-test check:** exempt: presentation only (labels, pills, a button in place of a native field), in a project with no component test runner; `timeline`, `stageLabel` and `parseBackup` keep their tests

**Files:**
- Modify: `src/roster-page/RosterPage.tsx` (imports `:3-14`, `StudentRow` `:55-101`, `BackupSection` `:237-285`)
- Modify: `src/roster-page/RosterPage.stories.tsx`

Do not edit `CLAUDE.md`: Task 3 runs beside this one. Put this line in your report's `Conventions:` instead: "A file is picked through an outline `Button` that clicks a hidden `<input type="file">` by its ref; no native file field is drawn."

**Interfaces:**
- Consumes: `stageLabel(code)` from `@/logic/stages.js`; `timeline(history, key)`, whose entries are `{ startedAt: string, stage: string | null, source: string | null }`; `Badge` and `Button` from `@/components/ui/`.
- Produces: nothing another task uses.

- [ ] **Step 1: The Timeline draws one labelled pill per session (items 1 and 2)**

In `StudentRow`. Import `stageLabel` beside `TRACKS` and `trackLabel`, and `Badge` from `@/components/ui/badge`.

- With sessions: a `div` with `flex flex-wrap gap-1` holding one `<Badge variant="outline">` per entry, keyed by `entry.startedAt` and with `title={entry.startedAt.slice(0, 10)}`, as the `span` has today.
- A pill's text is `stageLabel(entry.stage)`.
- When `entry.stage` is `null`, the pill takes `text-muted-foreground` and holds what the empty Timeline's dash holds today: an `aria-hidden` `–` and an `sr-only` label, here `no stage`.
- `entry.source === 'guess'` adds `italic text-muted-foreground` to the pill. The `mr-1.5` goes: the gap replaces it.
- With no session, the muted dash and its `sr-only` `no sessions yet` stay as they are.
- The Name column keeps at least today's width: the Name cell (`TableCell` at `:61`) gets a minimum width (`min-w-32`, 128 px; check the measured width at 375 px and pick the Tailwind step that keeps a 12-letter name on one line), so the table's automatic layout gives the Timeline's extra width to the pills' wrapping, not by shrinking names. Without it the Name column shrinks to ~57-82 px from about five sessions and names break mid-word.

- [ ] **Step 2: The Working group select's empty option reads `–` (item 3)**

The Working group caller (`RosterPage.tsx:76`) passes `noneText="–"` in place of `noneText="none"`. `NullableSelect` and its `noneText` prop stay as they are.

- [ ] **Step 3: Import backup is an outline button (item 4)**

In `BackupSection`, in place of the `Label` and the `Input` inside it:

- `const fileInput = useRef<HTMLInputElement>(null);`
- `<Button variant="outline" onClick={() => fileInput.current?.click()}>Import backup</Button>`, third in the row.
- A plain `<input ref={fileInput} type="file" hidden … />` after it, with today's `onChange` handler unchanged: it reads the file, clears the field's value, then calls `importBackup`.

The `Label` import goes. `importBackup`, the confirm question and the error `Alert` are not touched.

- [ ] **Step 4: Update the stories**

`ImportError` can no longer find the field by its label. Its `play` becomes:

```tsx
play: async ({ canvasElement }) => {
  await within(canvasElement).findByRole('button', { name: 'Import backup' });
  const field = canvasElement.querySelector<HTMLInputElement>('input[type="file"]')!;
  await userEvent.upload(field, new File(['nope'], 'nope.txt', { type: 'text/plain' }));
},
```

Add a story `LongTimeline`: a memory store seeded with one student, `Ana` (through `emptyRoster` and `addStudent`), and 14 weekly sessions, each with its own `startedAt`. Her entries cycle through an answered stage (`stage: 'S01A1', source: 'answer'`), a guessed one (`stage: 'S01A1', source: 'guess'`) and none (`stage: null, source: null`).

- [ ] **Step 5: Run the checks**

Run: `npm test && npm run typecheck && npm run build && npm run build-storybook`
Expected: 131 tests pass; the type check and both builds end with no error.

- [ ] **Step 6: Commit**

```bash
git add src/roster-page/RosterPage.tsx src/roster-page/RosterPage.stories.tsx
git commit -m "fix: the roster's Timeline shows labelled pills, no group is a dash, Import backup is a button"
```

---

### Task 2: The side panel (items 5 to 8)

**Wave:** A
**Kit:** ui [react-tailwind-shadcn]
**Screens:** /src/panel/panel.html?fake&at=collecting, /src/panel/panel.html?fake&at=split, /src/panel/panel.html?fake&at=filled
**Failing-test check:** exempt: presentation only (an icon, a weight, two strings, where a checkbox is drawn), in a project with no component test runner; `setMix` and the view keep their tests

**Files:**
- Modify: `src/components/ClampedText.tsx`
- Modify: `src/components/StageSelect.tsx:6,30`
- Modify: `src/panel/Panel.tsx` (`Session` `:87-116`, `Name` `:137`, `Rooms` `:332-373`, the two `last:` strings `:386` and `:446`)

Do not edit `CLAUDE.md`: Task 3 runs beside this one. Put this line in your report's `Conventions:` instead: "A control that changes what one button does is drawn just above that button: the Mix checkbox sits above Split until there is a plan, then in Rooms above Re-split."

**Interfaces:**
- Consumes: `Parts` in `Panel.tsx`; `ChevronDown` and `ChevronUp` from `lucide-react`.
- Produces: nothing another task uses.

- [ ] **Step 1: `ClampedText` draws a chevron when the text overflows (item 5)**

The button becomes a flex row (`flex items-end gap-1`) of two children:

- the text in a `span` with `min-w-0 flex-1 wrap-anywhere`, plus `line-clamp-2` while closed;
- `ChevronDown` while closed and `ChevronUp` while open, with `size-3.5 shrink-0 text-muted-foreground`.

The button keeps its `type`, `aria-expanded`, click, hover fill and focus ring, and still takes `className`. The clamp classes leave it for the text `span`.

`ref` becomes `useRef<HTMLSpanElement>(null)` and always sits on the element that carries the clamp: the lone `span` when the text fits, the inner `span` when it overflows. The callback ref on the button goes; the effect is unchanged. It compares `scrollHeight` with `clientHeight`, and on the button, which no longer clips, that would always read "fits" and swap the two forms without end.

When the text fits, nothing changes: a plain `span`, no chevron. `ClampedText.stories.tsx` is not edited.

- [ ] **Step 2: Names are weight 400 (item 6)**

`Name` in `Panel.tsx` drops `font-medium`.

- [ ] **Step 3: Sentence case (item 7)**

- `StageSelect`: the placeholder and the doc comment that quotes it read `Stage…`.
- `Panel.tsx`: the prefix in Not in a room yet and in No answer reads `Last: ` in place of `last: `.

- [ ] **Step 4: The Mix checkbox sits above the button it changes (item 8)**

Move the checkbox row out of `Session`, unchanged, into a function beside it:

```tsx
function MixCheckbox({ session, actions, locked }: Parts)
```

It returns today's `div` (`flex items-center gap-2`) with the `Checkbox` (`id="mix"`, disabled while `locked`) and its `Label`.

- `Session` draws `<MixCheckbox {...parts} />` where the row is today, only while `!session.hasPlan`, and no longer reads `locked` itself.
- `Rooms` takes `parts: Parts` as `Session` does and draws `<MixCheckbox {...parts} />` always, directly above the row that holds Re-split and after the Fill result's alert. It takes the section's own `gap-1`.

- [ ] **Step 5: Run the checks**

Run: `npm test && npm run typecheck && npm run build && npm run build-storybook`
Expected: 131 tests pass; the type check and both builds end with no error.

- [ ] **Step 6: Commit**

```bash
git add src/components/ClampedText.tsx src/components/StageSelect.tsx src/panel/Panel.tsx
git commit -m "fix: a chevron on clamped messages, names at 400, sentence-case strings, Mix above its button"
```

---

### Task 3: Fields at 14 px, and the backlog marked (item 9 and the rulings)

**Wave:** A
**Kit:** ui [react-tailwind-shadcn]
**Screens:** /src/panel/panel.html?fake, /src/panel/panel.html?fake&at=collecting, /src/panel/panel.html?fake&at=split, /src/panel/panel.html?fake&at=filled, /src/roster-page/roster-page.html?fake
**Failing-test check:** exempt: one class string in each of two generated components, and docs

**Files:**
- Modify: `src/components/ui/input.tsx:10`
- Modify: `src/components/ui/textarea.tsx:9`
- Modify: `docs/ui-backlog.md`
- Modify: `CLAUDE.md`

**Interfaces:** none.

- [ ] **Step 1: `Input` and `Textarea` are `text-sm` at every width (item 9)**

In each file's class string, `text-base` becomes `text-sm` and `md:text-sm` goes. Nothing else in either file changes, the `Input`'s `file:text-sm` included.

- [ ] **Step 2: Mark the backlog**

In `docs/ui-backlog.md`:

- The Backlog table gets a last column `Status`, reading `Fixed` on rows 1 to 9.
- The carried-over table gets a last column `Ruling`: 10 `Fixed by item 4`; 11 and 12 `Left until real use shows a need`; 13 ``Dropped: overtaken by `DESIGN.md` ``.
- Under "Follows the project: for your ruling", after its paragraph, add: `**Ruling:** all six are kept as designed.`

- [ ] **Step 3: Update `CLAUDE.md`**

- After the `UI backlog (the kit's audit)` line, add:
  - ``- UI backlog fixes spec: `docs/superpowers/specs/2026-11-22-ui-backlog-fixes-design.md` ``
  - ``- UI backlog fixes plan: `docs/superpowers/plans/2026-11-22-ui-backlog-fixes.md` ``
- In `## Code conventions`, the hand-edit line's parenthesis becomes ``(`icon-sm` is 28 px, and `Input` and `Textarea` are `text-sm` at every width)``.

- [ ] **Step 4: Run the checks**

Run: `npm test && npm run typecheck && npm run build && npm run build-storybook`
Expected: 131 tests pass; the type check and both builds end with no error.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/input.tsx src/components/ui/textarea.tsx docs/ui-backlog.md CLAUDE.md
git commit -m "fix: fields are 14 px at every width; the backlog is marked fixed or ruled"
```
